#!/usr/bin/env node
/**
 * Week 2 (F1.5) probe — verify the quota ledger without spending Gemini quota
 * or needing real Firebase credentials.
 *
 * Layer A (integration, HTTP): boots the REAL express app from api/_server.js
 *   with firebase-admin and better-sqlite3 swapped for stubs via module
 *   customization hooks (register), then fires requests at an AI route:
 *     - no token              -> expect 401
 *     - garbage token         -> expect 401
 *     - valid (stubbed) token -> passes auth + quota gate (the handler then
 *       fails on the fake Gemini key, which proves the gate let it through)
 * Layer B (ledger unit): drives QuotaLedger + quotaGuardMiddleware directly:
 *     - under budget  -> next() called
 *     - over budget   -> 429 + Retry-After + X-Quota-* headers
 *     - usage persisted in the ledger store
 *
 * Stubs live in the OS temp dir and are cleaned up; nothing is written into
 * the repo by this probe.
 */
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { register } from 'node:module';

const repo = process.cwd();
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'quota-probe-'));
// The fail-fast boot check runs when VERCEL is set. The probe provides a dummy
// base64 service account; the real firebase-admin module is swapped for a stub
// by the loader hook below, so nothing contacts Google.
const DUMMY_SERVICE_ACCOUNT = Buffer.from(
  JSON.stringify({ client_email: 'probe@probe.iam.gserviceaccount.com', private_key: 'not-a-key', project_id: 'probe' })
).toString('base64');
process.env.VERCEL = '1';
process.env.NODE_ENV = 'test';
process.env.GEMINI_API_KEY = 'fake-key-for-probe';
process.env.DAILY_AI_BUDGET_TOKENS = '12000';
process.env.APP_URL = 'http://localhost:3000';
process.env.FIREBASE_SERVICE_ACCOUNT = DUMMY_SERVICE_ACCOUNT;

const stateFile = path.join(tmp, 'ledger.json');
fs.writeFileSync(stateFile, JSON.stringify({ rows: [] }));

// --- stub modules the loader hook swaps in ---
const sqliteStubPath = path.join(tmp, '_sqlite_stub.mjs');
fs.writeFileSync(sqliteStubPath, `
import fs from 'node:fs';
const stateFile = ${JSON.stringify(stateFile)};
function load() { return JSON.parse(fs.readFileSync(stateFile, 'utf8')).rows; }
function save(rows) { fs.writeFileSync(stateFile, JSON.stringify({ rows })); }
export default function Database() {
  return {
    exec() {},
    prepare(sql) {
      return {
        get(...args) {
          const rows = load();
          if (sql.includes('SUM(tokens)')) {
            const total = rows.filter(r => r.user_id === args[0] && r.day === args[1]).reduce((a, r) => a + r.tokens, 0);
            return { total };
          }
          if (sql.includes('SELECT id FROM users')) {
            return rows.find(r => r.t === 'user' && r.id === args[0]) || undefined;
          }
          if (sql.startsWith('SELECT route, calls, tokens')) {
            return rows.find(r => r.user_id === args[0] && r.day === args[1]);
          }
          return undefined;
        },
        all(...args) {
          const rows = load();
          if (sql.startsWith('SELECT route, calls, tokens')) {
            return rows.filter(r => r.user_id === args[0] && r.day === args[1]);
          }
          return [];
        },
        run(...args) {
          const rows = load();
          if (sql.includes('INSERT INTO ai_usage_ledger')) {
            const [uid, day, route, tokens] = args;
            const found = rows.find(r => r.user_id === uid && r.day === day && r.route === route);
            if (found) { found.tokens += tokens; found.calls += 1; }
            else rows.push({ user_id: uid, day, route, calls: 1, tokens });
            save(rows);
            return { changes: 1 };
          }
          if (sql.includes('INSERT INTO users')) {
            rows.push({ t: 'user', id: args[0], email: args[1] });
            save(rows);
          }
          return { changes: 1 };
        },
      };
    },
  };
}
`);

const adminStubPath = path.join(tmp, '_admin_stub.mjs');
fs.writeFileSync(adminStubPath, `
const VALID_TOKEN = 'probe-valid-token';
export default {
  apps: [],
  initializeApp() { return { name: 'stub' }; },
  credential: { cert() { return {}; } },
  auth() {
    return {
      async verifyIdToken(token) {
        if (token !== VALID_TOKEN) throw new Error('invalid token');
        return { uid: 'probe-user-1', email: 'probe@example.com' };
      },
    };
  },
};
`);

// --- module customization hook: swap firebase-admin + better-sqlite3 ---
const hookPath = path.join(tmp, '_hook.mjs');
fs.writeFileSync(hookPath, `
const ADMIN = ${JSON.stringify(pathToFileURL(adminStubPath).href)};
const SQLITE = ${JSON.stringify(pathToFileURL(sqliteStubPath).href)};
export async function resolve(specifier, context, next) {
  if (specifier === 'firebase-admin') return { shortCircuit: true, url: ADMIN };
  if (specifier === 'better-sqlite3') return { shortCircuit: true, url: SQLITE };
  return next(specifier, context);
}
`);

register(pathToFileURL(hookPath).href);

// --- Layer A: boot the real bundled app behind the stubs ---
const mod = await import(pathToFileURL(path.join(repo, 'api/_server.js')).href);
const app = await mod.getApp();
const server = app.listen(0, '127.0.0.1');
await new Promise((res) => server.once('listening', res));
const base = `http://127.0.0.1:${server.address().port}`;

const results = [];
async function probe(name, fn) {
  try {
    const r = await fn();
    results.push({ name, ok: r.ok, summary: r.summary });
    console.log(`PROBE ${r.ok ? 'PASS' : 'FAIL'} ${name} — ${r.summary}`);
  } catch (e) {
    results.push({ name, ok: false, summary: `threw: ${e.message}` });
    console.log(`PROBE THREW ${name} — ${e.message}`);
  }
}

async function call(route, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(base + route, { method: 'POST', headers, body: JSON.stringify(body || {}) });
  let json = null;
  try { json = await res.json(); } catch {}
  return { status: res.status, json, headers: res.headers };
}

await probe('unauthenticated-401', async () => {
  const r = await call('/api/gemini/generate', { contents: 'x' }, null);
  return { ok: r.status === 401, summary: `no token -> ${r.status} ${JSON.stringify(r.json)}` };
});

await probe('bad-token-401', async () => {
  const r = await call('/api/gemini/generate', { contents: 'x' }, 'garbage-token');
  return { ok: r.status === 401, summary: `garbage token -> ${r.status} ${JSON.stringify(r.json)}` };
});

await probe('valid-token-passes-gate', async () => {
  const r = await call('/api/gemini/generate', { contents: 'hello' }, 'probe-valid-token');
  const passedGate = r.status !== 401 && r.status !== 429;
  return {
    ok: passedGate,
    summary: `valid token -> ${r.status} (gate passed: not 401/429; handler error expected with fake Gemini key) X-Quota-Used=${r.headers.get('x-quota-used')}`,
  };
});

// --- Layer B: ledger + guard unit probes (same stub store the server used) ---
const { QuotaLedger, quotaGuardMiddleware } = await import(
  pathToFileURL(path.join(repo, 'src/server/quotaLedger.ts')).href
);
const DatabaseStub = (await import(pathToFileURL(sqliteStubPath).href)).default;

await probe('ledger-under-budget-allows', async () => {
  const ledger = new QuotaLedger({ db: DatabaseStub() });
  const check = ledger.check('probe-user-1');
  return {
    ok: check.allowed === true,
    summary: `fresh user: allowed=${check.allowed}, budget=${check.dailyBudget}, used=${check.usedToday}`,
  };
});

await probe('ledger-records-and-429s', async () => {
  process.env.DAILY_AI_BUDGET_TOKENS = '5000';
  const ledger = new QuotaLedger({ db: DatabaseStub() });
  ledger.record('probe-user-1', '/api/gemini/generate', 4000);
  const under = ledger.check('probe-user-1');
  ledger.record('probe-user-1', '/api/gemini/analyze-video', 30000);
  const over = ledger.check('probe-user-1');

  const middleware = quotaGuardMiddleware(ledger);
  let status = 0;
  let payload = null;
  const quotaHeaders = {};
  await new Promise((resolve) => {
    const res = {
      setHeader(k, v) { quotaHeaders[k] = v; },
      status(s) {
        status = s;
        return {
          json(p) {
            payload = p;
            resolve();
          },
        };
      },
    };
    middleware({ user: { uid: 'probe-user-1' } }, res, () => { status = 200; resolve(); });
  });
  return {
    ok: under.allowed === true && over.allowed === false && status === 429 && Number(quotaHeaders['Retry-After']) > 0,
    summary: `4k/5k allowed=${under.allowed}; 34k/5k allowed=${over.allowed}; guard=${status} Retry-After=${quotaHeaders['Retry-After']}s X-Quota-Used=${quotaHeaders['X-Quota-Used']}/${quotaHeaders['X-Quota-Limit']} payload=${JSON.stringify(payload)}`,
  };
});

await probe('ledger-persisted-rows', async () => {
  const rows = JSON.parse(fs.readFileSync(stateFile, 'utf8')).rows.filter((r) => r.user_id === 'probe-user-1');
  const tokens = rows.reduce((a, r) => a + r.tokens, 0);
  return {
    ok: rows.length === 2 && tokens === 34000,
    summary: `rows=${JSON.stringify(rows)} totalTokens=${tokens}`,
  };
});

server.close();
fs.rmSync(tmp, { recursive: true, force: true });

const failed = results.filter((r) => r.ok === false);
console.log(`SUMMARY: ${results.length - failed.length}/${results.length} probes passed`);
process.exit(failed.length ? 1 : 0);
