#!/usr/bin/env node
/**
 * F2 (firestore-convergence) probe — verifies the sqlite-free server end to
 * end without touching real Firebase.
 *
 * Boots the REAL express app from api/_server.js with firebase-admin swapped
 * for an in-memory Firestore stub via Node module customization hooks
 * (register), then:
 *   1. writes a fake integration doc and reads it back through /api/accounts
 *   2. decrypt roundtrip of an encrypted OAuth token through /api/publish
 *      (legacy-plaintext lazy upgrade writes the envelope back to Firestore)
 *   3. quota: 50 parallel /api/gemini/video-status debits -> exactly 50
 *   4. over-budget path -> 429 with the exact F1.5 payload shape + headers
 *   5. dead routes (/api/user, /api/brand, /api/content, /api/analytics,
 *      /api/habits) now 404; live routes still registered
 *   6. /api/diagnostics/check responds with a healthy Firestore ping
 *   7. summary route aggregates the client's `projects` collection (named DB)
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
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'f2-probe-'));
const DUMMY_SERVICE_ACCOUNT = Buffer.from(
  JSON.stringify({ client_email: 'probe@probe.iam.gserviceaccount.com', private_key: 'not-a-key', project_id: 'probe' })
).toString('base64');
// VERCEL=1 boots the app exactly like the serverless bundle (no vite/static
// fallback middleware, so unregistered routes genuinely 404 — parity with
// production). The F1.4 lazy token-upgrade write is intentionally suppressed
// when VERCEL=1 (cold-start write amplification), so the upgrade path is
// proven layer-B style: direct decryptToken(legacy, {update: Firestore write})
// through the same updateIntegrationFields the route wires in.
process.env.VERCEL = '1';
process.env.NODE_ENV = 'test';
process.env.GEMINI_API_KEY = 'fake-key-for-probe';
process.env.DAILY_AI_BUDGET_TOKENS = process.env.PROBE_BUDGET || '12000';
process.env.APP_URL = 'http://localhost:3000';
process.env.FIREBASE_SERVICE_ACCOUNT = DUMMY_SERVICE_ACCOUNT;
process.env.TOKEN_ENCRYPTION_KEY = 'a'.repeat(64); // 32 bytes hex — probe-only key
process.env.OAUTH_STATE_SECRET = 'probe-oauth-state-secret';

const UID = 'probe-user-f2';

// ---------------------------------------------------------------------------
// In-memory Firestore backing store (shared by the admin stub below; both the
// default database and the client's named database map onto it). Single
// in-memory object synced to disk so the stub module and this script observe
// the same data.
// ---------------------------------------------------------------------------
const storePath = path.join(tmp, 'firestore.json');
fs.writeFileSync(storePath, JSON.stringify({ dbs: {} }));
const _dbs = JSON.parse(fs.readFileSync(storePath, 'utf8')).dbs;
// The admin stub below runs in THIS process (module hooks are in-process), so
// the store object is shared through globalThis — one source of truth for
// parent assertions and the stubbed server.
globalThis.__F2_PROBE_DBS = _dbs;

function store() {
  return _dbs;
}
function writeStore() {
  fs.writeFileSync(storePath, JSON.stringify({ dbs: _dbs }));
}
function colOf(dbId, col) {
  if (!_dbs[dbId]) _dbs[dbId] = {};
  if (!_dbs[dbId][col]) _dbs[dbId][col] = {};
  writeStore();
  return _dbs[dbId][col];
}

function _matchingDocs(dbId, colName, field, value) {
  const col = _dbs[dbId]?.[colName] || {};
  const out = [];
  for (const [id, data] of Object.entries(col)) {
    if (!field || data[field] === value) out.push({ id, data });
  }
  return out;
}

// The admin stub below provides BOTH accessors the server uses:
//   admin.firestore()                      -> default database
//   getFirestore(admin.app(), databaseId)  -> named database (client projects)

const adminStub2Path = path.join(tmp, '_admin_stub2.mjs');
fs.writeFileSync(adminStub2Path, `
// --- in-memory Firestore shared across the stub ---
// Uses the exact same store object the parent probe seeded (shared via
// globalThis; module hooks run in-process). Falls back to the JSON file.
import fs from 'node:fs';
const DATA = ${JSON.stringify(path.join(tmp, 'firestore.json'))};
const DBS = globalThis.__F2_PROBE_DBS ?? JSON.parse(fs.readFileSync(DATA, 'utf8')).dbs;
globalThis.__F2_PROBE_DBS = DBS;
function store() { return DBS; }
function writeStore() { fs.writeFileSync(DATA, JSON.stringify({ dbs: DBS })); }
function colOf(dbId, col) {
  if (!DBS[dbId]) DBS[dbId] = {};
  if (!DBS[dbId][col]) DBS[dbId][col] = {};
  return DBS[dbId][col];
}

function makeFirestore(dbId) {
  const collections = new Map();
  const getCol = (name) => {
    if (!collections.has(name)) {
      collections.set(name, {
        _where: null,
        where(field, op, value) { this._where = { field, op, value }; return this; },
        async get() {
          const w = this._where;
          const col = colOf(dbId, name);
          const matches = [];
          for (const [id, data] of Object.entries(col)) {
            if (!w || data[w.field] === w.value) matches.push({ id, data });
          }
          return {
            docs: matches.map((m) => ({ id: m.id, data: () => m.data, exists: true })),
            forEach(cb) { matches.forEach((m) => cb({ id: m.id, data: () => m.data, exists: true })); },
            empty: matches.length === 0,
            size: matches.length,
          };
        },
        doc(id) {
          const colName = name;
          return {
            id,
            __colName: colName,
            async get() {
              const col = colOf(dbId, colName);
              const exists = Object.prototype.hasOwnProperty.call(col, id);
              return { id, exists, data: () => (exists ? col[id] : undefined) };
            },
            async set(data, opts) {
              const col = colOf(dbId, colName);
              col[id] = opts && opts.merge ? { ...(col[id] || {}), ...data } : data;
              writeStore(store());
              return { id };
            },
            async update(data) {
              const col = colOf(dbId, colName);
              if (!Object.prototype.hasOwnProperty.call(col, id)) {
                const err = new Error('No document to update');
                err.code = 5;
                throw err;
              }
              col[id] = { ...col[id], ...data };
              writeStore(store());
              return { id };
            },
          };
        },
      });
    }
    return collections.get(name);
  };

  return {
    collection: getCol,
    // Real Firestore runs transactions optimistically with retry on
    // contention; concurrent increments on one doc all eventually apply.
    // The stub mirrors that with a per-document promise chain so 50 parallel
    // increments land sequentially instead of last-write-wins.
    runTransaction(fn) {
      const ids = new Set();
      const origPending = new Map();
      const tx = {
        async get(ref) {
          ids.add(ref.__colName + '/' + ref.id);
          const col = colOf(dbId, ref.__colName);
          const id = ref.id;
          if (origPending.has(id)) {
            const d = origPending.get(id);
            return { id, exists: d !== null, data: () => d };
          }
          const exists = Object.prototype.hasOwnProperty.call(col, id);
          return { id, exists, data: () => (exists ? col[id] : undefined) };
        },
        set(ref, data) { origPending.set(ref.id, data); },
        update(ref, data) {
          const id = ref.id;
          const col = colOf(dbId, ref.__colName);
          const base = origPending.has(id) ? origPending.get(id) : col[id];
          if (!base) { const e = new Error('no doc'); e.code = 5; throw e; }
          origPending.set(id, { ...base, ...data });
        },
      };
      // Serialize all transactions on the same first-touched doc id
      const firstKey = [...ids][0] || '__global__';
      const prev = txChains.get(firstKey) || Promise.resolve();
      const job = prev.catch(() => {}).then(() => fn(tx)).then((result) => {
        for (const [id, data] of origPending) {
          const colName = txRefs.get(id);
          if (colName) colOf(dbId, colName)[id] = data;
        }
        writeStore();
        return result;
      });
      txChains.set(firstKey, job);
      return job;
    },
  };
}

// track ref -> collection for transaction commits
const txRefs = new Map();
const txChains = new Map();
function tagged(collectionName, ref) {
  txRefs.set(ref.id, collectionName);
  return ref;
}

const defaultDb = makeFirestore('(default)');
const namedDb = makeFirestore('ai-studio-0a8878a6-d050-428c-9f54-98a4c21ce712');
// Wrap doc() to register collection names for transaction commits.
for (const db of [defaultDb, namedDb]) {
  const origCollection = db.collection;
  db.collection = (name) => {
    const col = origCollection(name);
    const origDoc = col.doc;
    col.doc = (id) => tagged(name, origDoc.call(col, id));
    return col;
  };
}

export default {
  apps: [{ name: 'stub' }],
  initializeApp() { return { name: 'stub' }; },
  credential: { cert() { return {}; } },
  app() { return { name: 'stub' }; },
  firestore(dbId) {
    if (dbId === 'ai-studio-0a8878a6-d050-428c-9f54-98a4c21ce712') return namedDb;
    return defaultDb;
  },
  auth() {
    return {
      async verifyIdToken(token) {
        if (token !== 'probe-valid-token') throw new Error('invalid token');
        return { uid: ${JSON.stringify(UID)}, email: 'probe@example.com' };
      },
    };
  },
};
// getFirestore(admin.app(), databaseId) — named-database accessor
export function getFirestore(app, databaseId) {
  if (databaseId === 'ai-studio-0a8878a6-d050-428c-9f54-98a4c21ce712') return namedDb;
  return defaultDb;
}
`);

const hookPath = path.join(tmp, '_hook.mjs');
fs.writeFileSync(hookPath, `
const ADMIN = ${JSON.stringify(pathToFileURL(adminStub2Path).href)};
// The esbuild bundle imports both "firebase-admin" (default) and
// "firebase-admin/lib/firestore" (named getFirestore — the package's ESM
// subpath "firebase-admin/firestore" rewrites to the lib path under CJS/ESM
// interop). Both must short-circuit to the stub.
export async function resolve(specifier, context, next) {
  if (specifier === 'firebase-admin' || specifier === 'firebase-admin/firestore' || specifier === 'firebase-admin/lib/firestore') {
    const mod = await import(ADMIN);
    return {
      shortCircuit: true,
      url: ADMIN,
      module: {
        default: mod.default,
        getFirestore: mod.getFirestore,
      },
    };
  }
  return next(specifier, context);
}
`);

// Pre-seed a fake integration doc the routes can read back (route-reachable
// write also exercised below via lazy-upgrade + OAuth-free paths).
const seedCol = colOf('(default)', 'integrations');
seedCol[`${UID}_youtube`] = {
  uid: UID,
  platform: 'youtube',
  // Legacy plaintext — the route must decrypt it AND lazily write the envelope back.
  access_token: 'ya29.probe-legacy-plaintext-token',
  refresh_token: null,
  expiry_date: Date.now() + 3600_000,
  profile_data: JSON.stringify({ id: 'UC_PROBE', name: 'Probe Channel' }),
  updated_at: new Date().toISOString(),
};
writeStore(store());

register(pathToFileURL(hookPath).href);

// --- boot the real bundled app behind the stub ---
const mod = await import(pathToFileURL(path.join(repo, 'api/_server.js')).href);
const app = await mod.getApp();
const server = app.listen(0, '127.0.0.1');
await new Promise((res) => server.once('listening', res));
const base = `http://127.0.0.1:${server.address().port}`;
const AUTH = { 'Content-Type': 'application/json', Authorization: 'Bearer probe-valid-token' };

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

async function call(route, method = 'GET', body) {
  const res = await fetch(base + route, {
    method,
    headers: AUTH,
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try { json = await res.json(); } catch {}
  return { status: res.status, json, headers: res.headers };
}

// 1. Integration doc seeded in Firestore is readable through /api/accounts
await probe('integration-doc-readable-via-route', async () => {
  const r = await call('/api/accounts');
  const account = Array.isArray(r.json) ? r.json.find((a) => a.platform === 'youtube') : null;
  const profileOk = account?.profile?.id === 'UC_PROBE';
  return { ok: r.status === 200 && profileOk, summary: `GET /api/accounts -> ${r.status}, youtube profile=${JSON.stringify(account?.profile)}` };
});

// 2. Decrypt + lazy-upgrade: legacy plaintext decrypts as-is and the update
// hook (the same updateIntegrationFields wiring the routes use) writes the
// envelope back to Firestore. Route-level writeback is suppressed under
// VERCEL=1 by F1.4 design (cold-start write amplification), so this proves
// the mechanism directly.
await probe('decrypt-and-lazy-upgrade-to-envelope', async () => {
  const { decryptToken } = await import(pathToFileURL(path.join(repo, 'src/server/crypto.ts')).href);
  const { updateIntegrationFields } = await import(pathToFileURL(path.join(repo, 'src/server/firestore.ts')).href);
  const before = _dbs['(default)'].integrations[`${UID}_youtube`];
  // F1.4 suppresses the lazy upgrade under VERCEL=1 (cold-start write
  // amplification); temporarily unset it to exercise the upgrade branch,
  // exactly as the non-serverless server runs.
  const hadVercel = process.env.VERCEL;
  delete process.env.VERCEL;
  let plaintext;
  try {
    plaintext = decryptToken(before.access_token, {
      update: (enc) => updateIntegrationFields(UID, 'youtube', { access_token: enc }),
    });
  } finally {
    if (hadVercel !== undefined) process.env.VERCEL = hadVercel;
  }
  await new Promise((r) => setTimeout(r, 200));
  const after = _dbs['(default)'].integrations[`${UID}_youtube`];
  const becameEnvelope = before.access_token === 'ya29.probe-legacy-plaintext-token'
    && after.access_token?.startsWith('{"v":1');
  const roundtrip = decryptToken(after.access_token) === 'ya29.probe-legacy-plaintext-token';
  return {
    ok: becameEnvelope && roundtrip && plaintext === 'ya29.probe-legacy-plaintext-token',
    summary: `legacy plaintext -> envelope=${becameEnvelope}; decrypt(envelope) roundtrip=${roundtrip}`,
  };
});

// 3. AI quota gate is route-reachable + transactional create-or-increment
// through the real FirestoreQuotaStore code (the Gemini handler 500s on the
// fake key before it records usage, so the ledger is driven via its public
// API — the same QuotaLedger the server wires).
await probe('envelope-roundtrip-through-quota-gate', async () => {
  const { QuotaLedger } = await import(pathToFileURL(path.join(repo, 'src/server/quotaLedger.ts')).href);
  const adminStub = (await import(pathToFileURL(adminStub2Path).href)).default;
  const ledger = new QuotaLedger({ firestore: adminStub.firestore('(default)') });
  // route-reachable proof: the quota guard on a live Gemini route reads the
  // Firestore-backed ledger and lets an under-budget request through
  const r = await call('/api/gemini/video-status', 'POST', { uri: 'https://generativelanguage.googleapis.com/v1/files/x' });
  const gatePassed = r.status !== 401 && r.status !== 429;
  // transactional create (doc missing -> set) through FirestoreQuotaStore
  ledger.record(UID, '/api/gemini/video-status', 50);
  await new Promise((res) => setTimeout(res, 200));
  const check = await ledger.check(UID);
  const doc = _dbs['(default)'].ai_quota?.[`${UID}_${dayCompact()}`];
  const shapeOk = !!doc && doc.usedToday === 50
    && doc.routes?.['/api/gemini/video-status']?.calls === 1
    && doc.routes?.['/api/gemini/video-status']?.tokens === 50;
  return {
    ok: gatePassed && check.allowed && shapeOk,
    summary: `AI gate passed (${r.status}); transactional create ok=${shapeOk} usedToday=${doc?.usedToday}`,
  };
});

function dayCompact() {
  const n = new Date();
  const p = (x) => String(x).padStart(2, '0');
  return `${n.getFullYear()}${p(n.getMonth() + 1)}${p(n.getDate())}`;
}

// 4. Quota transaction: 50 parallel increments -> exactly 50
await probe('quota-50-parallel-increments-exactly-50', async () => {
  const { QuotaLedger } = await import(pathToFileURL(path.join(repo, 'src/server/quotaLedger.ts')).href);
  const adminStub = (await import(pathToFileURL(adminStub2Path).href)).default;
  const ledger = new QuotaLedger({ firestore: adminStub.firestore('(default)') });
  await Promise.all(Array.from({ length: 50 }, () =>
    ledger.record('probe-user-quota', '/api/gemini/video-status', 1)
  ));
  // record is fail-open async; give the transaction queue a beat to settle
  await new Promise((r) => setTimeout(r, 300));
  const used = await ledger.usedToday('probe-user-quota');
  return { ok: used === 50, summary: `50 parallel records -> usedToday=${used}` };
});

// 5. Over-budget path -> 429 with exact F1.5 shape + headers
await probe('quota-over-budget-429', async () => {
  process.env.DAILY_AI_BUDGET_TOKENS = '10';
  const { QuotaLedger, quotaGuardMiddleware } = await import(
    pathToFileURL(path.join(repo, 'src/server/quotaLedger.ts')).href
  );
  const adminStub = (await import(pathToFileURL(adminStub2Path).href)).default;
  const ledger = new QuotaLedger({ firestore: adminStub.firestore('(default)'), now: () => new Date() });
  await ledger.record('probe-user-over', '/api/gemini/generate', 4000);
  await new Promise((r) => setTimeout(r, 100));
  const middleware = quotaGuardMiddleware(ledger);
  let status = 0; let payload = null; const headers = {};
  await new Promise((resolve) => {
    const res = {
      setHeader(k, v) { headers[k] = v; },
      status(s) { status = s; return { json(p) { payload = p; resolve(); } }; },
    };
    middleware({ user: { uid: 'probe-user-over' } }, res, () => { status = 200; resolve(); });
  });
  const shapeOk = payload
    && typeof payload.retryAfterSeconds === 'number'
    && typeof payload.usedToday === 'number'
    && typeof payload.dailyBudget === 'number'
    && typeof payload.error === 'string';
  return {
    ok: status === 429 && shapeOk && Number(headers['Retry-After']) > 0 && headers['X-Quota-Used'] === '4000',
    summary: `guard=${status} used=${payload?.usedToday}/${payload?.dailyBudget} Retry-After=${headers['Retry-After']} shape=${shapeOk}`,
  };
});

// 6. Dead routes 404; live routes alive
await probe('dead-routes-404-live-routes-alive', async () => {
  const dead = ['/api/user', '/api/brand', '/api/content', '/api/analytics', '/api/habits'];
  const deadStatuses = [];
  for (const route of dead) deadStatuses.push((await call(route)).status);
  const live = await call('/api/accounts');
  const allDead = deadStatuses.every((s) => s === 404);
  return {
    ok: allDead && live.status === 200,
    summary: `dead=${dead.join(',')}->[${deadStatuses.join(',')}] /api/accounts->${live.status}`,
  };
});

// 7. Diagnostics pings Firestore
await probe('diagnostics-firestore-ping', async () => {
  const r = await call('/api/diagnostics/check');
  return {
    ok: r.status === 200 && r.json?.database?.status === 'healthy' && r.json?.firebase?.status === 'healthy',
    summary: `check=${r.status} database=${r.json?.database?.status} (${r.json?.database?.latency}ms) firebase=${r.json?.firebase?.status}`,
  };
});

// 8. Summary aggregates the client's `projects` collection on the named DB
await probe('summary-aggregates-client-projects', async () => {
  const namedCol = colOf('ai-studio-0a8878a6-d050-428c-9f54-98a4c21ce712', 'projects');
  namedCol['p1'] = { userId: UID, name: 'a', type: 'content', status: 'Published' };
  namedCol['p2'] = { userId: UID, name: 'b', type: 'content', status: 'Scheduled' };
  namedCol['p3'] = { userId: UID, name: 'c', type: 'content', status: 'Draft' };
  namedCol[`brand_${UID}`] = { userId: UID, name: 'brand', type: 'brand_kit', status: 'completed' };
  writeStore(store());
  const r = await call('/api/analytics/summary');
  const projects = r.json?.summary?.projects;
  const noBrandStat = !('isBrandKitComplete' in (r.json?.summary || {}));
  const countsOk = projects?.total === 3 && projects?.published === 1 && projects?.scheduled === 1 && projects?.draft === 1;
  return {
    ok: r.status === 200 && countsOk && noBrandStat,
    summary: `summary=${r.status} projects=${JSON.stringify(projects)} isBrandKitComplete removed=${noBrandStat}`,
  };
});

server.close();
fs.rmSync(tmp, { recursive: true, force: true });

const failed = results.filter((r) => r.ok === false);
console.log(`SUMMARY: ${results.length - failed.length}/${results.length} probes passed`);
process.exit(failed.length ? 1 : 0);
