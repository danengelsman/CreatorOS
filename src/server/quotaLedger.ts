// F1.5 / F2 — Per-user daily AI quota ledger.
//
// Design notes / deviations from the plan's literal text:
// - F2 (firestore-convergence): the ledger now persists in Firestore
//   collection `ai_quota`, doc ID `${uid}_${YYYYMMDD}` (local server
//   timezone), created-if-missing and incremented atomically via
//   runTransaction, so N parallel records yield exactly N calls. Previously
//   (v1) this was a local sqlite table ai_usage_ledger keyed
//   (user_id, day, route); the per-route rows now live in a `routes` map on
//   the single per-user-day doc. Storage change only — the public API
//   (QuotaLedger, quotaGuardMiddleware, extractTokensUsed, ROUTE_COST_ESTIMATES,
//   dayKeyFor, msUntilLocalMidnight, X-Quota-* headers, budget env,
//   local-midnight reset) is preserved exactly so server.ts route code is
//   unchanged.
// - Two layers of quota:
//   1) the existing per-minute in-memory rate limit (unchanged, 429 w/ Retry-After)
//   2) the per-user daily ledger: cost-weighted tokens per route, hard daily cap
//      -> 429 with Retry-After until local midnight reset.
// - Token accounting: Gemini responses expose usageMetadata.totalTokenCount
//   (@google/genai: response.usageMetadata). When absent (video/image/interaction
//   endpoints return no usage metadata), fall back to conservative per-route
//   estimated costs (generate-video is expensive) so every AI call still
//   debits the ledger.
// - Budget source: process.env.DAILY_AI_BUDGET_TOKENS, default 250_000
//   tokens/user/day (~ generous for a free-tier creator app; ops can tune
//   without redeploy).
// - Failure semantics (F2):
//     * record() stays fail-open (documented v1 contract; server.ts calls it
//       best-effort after a successful AI response — a cost-control write
//       must never fail the user's response).
//     * check() is FAIL-CLOSED on store/transaction errors: if we cannot
//       prove the user is under budget, the request is denied (429 with
//       reason "quota_store_unavailable", usedToday = -1 sentinel, so the
//       X-Quota-Used header reads "unknown"). Distinguishable from the
//       over-budget 429 by the extra `reason` field.

import type express from 'express';
import admin from 'firebase-admin';

export const DAILY_BUDGET_DEFAULT = 250_000;

/** Conservative per-call token estimates when the API gives no usage data. */
export const ROUTE_COST_ESTIMATES: Record<string, number> = {
  '/api/gemini/generate': 4_000,        // typical chat/script generation
  '/api/gemini/analyze-video': 30_000,  // video upload = expensive
  '/api/gemini/generate-image': 5_000,
  '/api/gemini/generate-video': 60_000, // most expensive per call
  '/api/gemini/video-status': 50,       // status poll, cheap
  '/api/gemini/video-download': 50,     // download, no generation
  '/api/onboarding/niche-sparks': 1_500,
};

const DAY_MS = 24 * 60 * 60 * 1000;

/** Local-midnight day key: YYYY-MM-DD in the server's timezone. */
export function dayKeyFor(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function msUntilLocalMidnight(now = new Date()): number {
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
  return Math.max(1, tomorrow.getTime() - now.getTime());
}

/** Firestore doc ID for a user-day: ai_quota/{uid}_{YYYYMMDD}. */
export function quotaDocIdFor(uid: string, now = new Date()): string {
  const k = dayKeyFor(now);
  const compact = `${k.slice(0, 4)}${k.slice(5, 7)}${k.slice(8, 10)}`;
  return `${uid}_${compact}`;
}

export interface QuotaCheck {
  allowed: boolean;
  usedToday: number;
  dailyBudget: number;
  retryAfterSeconds: number;
}

export interface QuotaLedgerDeps {
  /** firebase-admin Firestore instance (server-only `ai_quota` collection). */
  firestore?: any;
  getDailyBudget?: () => number;
  now?: () => Date;
}

interface RouteRow {
  calls: number;
  tokens: number;
}

/** Shape of an ai_quota doc (one per user-day). */
export interface QuotaDoc {
  uid: string;
  day: string;
  usedToday: number;
  routes: Record<string, RouteRow>;
  updated_at: string;
}

/** Storage backend for the ledger; swappable for tests/probes. */
export interface QuotaStore {
  readDoc(userId: string, now: Date): Promise<QuotaDoc | null>;
  readUsedToday(userId: string, now: Date): Promise<number>;
  increment(userId: string, day: string, route: string, tokens: number): Promise<void>;
}

export class QuotaLedger {
  private getDailyBudget: () => number;
  private nowFn: () => Date;
  private store: QuotaStore | null;

  constructor(deps: QuotaLedgerDeps) {
    this.getDailyBudget = deps.getDailyBudget ?? (() => {
      const raw = Number(process.env.DAILY_AI_BUDGET_TOKENS);
      return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : DAILY_BUDGET_DEFAULT;
    });
    this.nowFn = deps.now ?? (() => new Date());
    // The Firestore-backed store is resolved lazily (first use) so probes can
    // stub firebase-admin before the server resolves it.
    this.store = deps.firestore ? new FirestoreQuotaStore(deps.firestore) : null;
  }

  private getStore(): QuotaStore {
    if (!this.store) this.store = defaultStore();
    return this.store;
  }

  /** Sum of tokens used today. Store failures propagate to the caller. */
  async usedToday(userId: string): Promise<number> {
    return this.getStore().readUsedToday(userId, this.nowFn());
  }

  /**
   * Gate check used by quotaGuardMiddleware. Fail-closed: on any store error
   * the user is reported NOT allowed with the usedToday = -1 sentinel.
   */
  async check(userId: string): Promise<QuotaCheck> {
    const dailyBudget = this.getDailyBudget();
    const now = this.nowFn();
    const retryAfterSeconds = Math.ceil(msUntilLocalMidnight(now) / 1000);
    try {
      const usedToday = await this.getStore().readUsedToday(userId, now);
      return { allowed: usedToday < dailyBudget, usedToday, dailyBudget, retryAfterSeconds };
    } catch (err) {
      console.error('quota ledger read failed (fail-closed):', err);
      return { allowed: false, usedToday: -1, dailyBudget, retryAfterSeconds };
    }
  }

  /**
   * Debit the ledger. `tokens` may come from real Gemini usageMetadata or the
   * per-route estimate. Transactional create-or-increment in Firestore.
   * Best-effort: swallows its own errors (fail-open).
   */
  record(userId: string, route: string, tokens: number): void {
    const safeTokens = Math.max(0, Math.min(Math.floor(Number(tokens) || 0), 5_000_000));
    const day = dayKeyFor(this.nowFn());
    this.getStore()
      .increment(userId, day, route, safeTokens)
      .catch((err) => console.error('quota ledger record failed (fail-open):', err));
  }

  /** Admin/diagnostics snapshot for one user (today), tokens-descending. */
  async snapshot(userId: string): Promise<Array<{ route: string; calls: number; tokens: number }>> {
    try {
      const doc = await this.getStore().readDoc(userId, this.nowFn());
      return Object.entries(doc?.routes || {})
        .map(([route, row]) => ({ route, calls: row.calls, tokens: row.tokens }))
        .sort((a, b) => b.tokens - a.tokens);
    } catch {
      return [];
    }
  }
}

// ---------------------------------------------------------------------------
// Firestore storage: ai_quota/{uid}_{YYYYMMDD}, transactional
// create-or-increment. Tests/probes may implement QuotaStore directly.
// ---------------------------------------------------------------------------

export class FirestoreQuotaStore implements QuotaStore {
  private firestore: any;

  constructor(firestore: any) {
    this.firestore = firestore;
  }

  private col(): any {
    return this.firestore.collection('ai_quota');
  }

  async readDoc(userId: string, now: Date): Promise<QuotaDoc | null> {
    const snap = await this.col().doc(quotaDocIdFor(userId, now)).get();
    if (!snap || !snap.exists) return null;
    return normalizeQuotaDoc(userId, dayKeyFor(now), snap.data());
  }

  async readUsedToday(userId: string, now: Date): Promise<number> {
    const doc = await this.readDoc(userId, now);
    return doc ? doc.usedToday : 0;
  }

  async increment(userId: string, day: string, route: string, tokens: number): Promise<void> {
    const ref = this.col().doc(quotaDocIdFor(userId, new Date()));
    await this.firestore.runTransaction(async (tx: any) => {
      const snap = await tx.get(ref);
      if (!snap || !snap.exists) {
        tx.set(ref, {
          uid: userId,
          day,
          usedToday: tokens,
          routes: { [route]: { calls: 1, tokens } },
          updated_at: new Date().toISOString(),
        });
        return;
      }
      const doc = normalizeQuotaDoc(userId, day, snap.data());
      const row = doc.routes[route] || { calls: 0, tokens: 0 };
      const routes: Record<string, RouteRow> = { ...doc.routes };
      routes[route] = { calls: row.calls + 1, tokens: row.tokens + tokens };
      const usedToday = Object.values(routes).reduce((a, r) => a + r.tokens, 0);
      tx.update(ref, { usedToday, routes, updated_at: new Date().toISOString() });
    });
  }
}

function normalizeQuotaDoc(uid: string, day: string, data: any): QuotaDoc {
  const routes: Record<string, RouteRow> = {};
  const raw = data?.routes && typeof data.routes === 'object' ? data.routes : {};
  for (const [route, row] of Object.entries(raw as Record<string, any>)) {
    routes[route] = { calls: Number(row?.calls) || 0, tokens: Number(row?.tokens) || 0 };
  }
  const summed = Object.values(routes).reduce((a, r) => a + r.tokens, 0);
  const used = Number(data?.usedToday);
  return {
    uid: typeof data?.uid === 'string' ? data.uid : uid,
    day: typeof data?.day === 'string' ? data.day : day,
    usedToday: Number.isFinite(used) ? used : summed,
    routes,
    updated_at: typeof data?.updated_at === 'string' ? data.updated_at : '',
  };
}

/** Default store resolution (lazy so probes can stub firebase-admin first). */
function defaultStore(): QuotaStore {
  if (admin.apps.length === 0) {
    throw new Error('Firebase admin not initialized — quota ledger unavailable');
  }
  return new FirestoreQuotaStore(admin.firestore());
}

/**
 * Middleware factory wired into server.ts: blocks requests over budget with
 * 429 + Retry-After (until local midnight), X-Quota-* headers always set.
 * Async now that the ledger reads through Firestore.
 */
export function quotaGuardMiddleware(ledger: QuotaLedger) {
  return async function quotaGuard(req: any, res: any, next: any) {
    const uid = req.user?.uid;
    if (!uid) return next(); // auth middleware runs first and 401s anyway

    const check = await ledger.check(uid);
    res.setHeader('X-Quota-Limit', String(check.dailyBudget));
    res.setHeader('X-Quota-Used', check.usedToday >= 0 ? String(check.usedToday) : 'unknown');

    if (!check.allowed) {
      res.setHeader('Retry-After', String(check.retryAfterSeconds));
      const overBudget = check.usedToday >= 0;
      return res.status(429).json({
        error: overBudget
          ? 'Daily AI quota exhausted. Your allowance resets at midnight.'
          : 'Daily AI quota check temporarily unavailable. Please retry shortly.',
        retryAfterSeconds: check.retryAfterSeconds,
        usedToday: overBudget ? check.usedToday : 0,
        dailyBudget: check.dailyBudget,
        ...(overBudget ? {} : { reason: 'quota_store_unavailable' }),
      });
    }
    next();
  };
}

/** Extract total token usage from a @google/genai response, if present. */
export function extractTokensUsed(response: any): number | null {
  const usage = response?.usageMetadata ?? response?.usage_metadata ?? null;
  const total = usage?.totalTokenCount ?? usage?.total_token_count ?? null;
  return typeof total === 'number' && Number.isFinite(total) && total > 0 ? Math.floor(total) : null;
}

export { DAY_MS };

// --- express type re-declared to keep the import used ---
export type { express };
