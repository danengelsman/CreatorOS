#!/usr/bin/env node
/**
 * F1.5 (week2-quota-ledger) — Per-user daily AI quota ledger.
 *
 * Design notes / deviations from the plan's literal text:
 * - The plan says "Firestore doc per user-day". Firestore writes here would
 *   require the Admin SDK Firestore client, which is NOT initialized in
 *   server.ts (only Auth is used; the one Firestore touchpoint is a user-token
 *   REST query in /api/analytics/summary). Standing up Admin Firestore now
 *   would be a D3 (data-layer convergence) decision, which is explicitly a
 *   Week-2 fork. So the ledger v1 uses the same converged store the rest of
 *   the server actually uses today: better-sqlite3 (src/db.ts). The table is
 *   keyed (user_id, day, route) with the exact schema the Firestore doc would
 *   carry, so F2.3's migration script can lift rows into Firestore verbatim.
 * - Two layers of quota:
 *   1) the existing per-minute in-memory rate limit (unchanged, 429 w/ Retry-After)
 *   2) NEW per-user daily ledger: cost-weighted tokens per route, hard daily cap
 *      -> 429 with Retry-After until local midnight reset.
 * - Token accounting: Gemini responses expose usageMetadata.totalTokenCount
 *   (@google/genai: response.usageMetadata). When absent (video/image/interaction
 *   endpoints return no usage metadata), fall back to conservative per-route
 *   estimated costs (generate-video is expensive) so every AI call still
 *   debits the ledger.
 * - Budget source: process.env.DAILY_AI_BUDGET_TOKENS, default 250_000
 *   tokens/user/day (~ generous for a free-tier creator app; ops can tune
 *   without redeploy).
 * - All accounting is best-effort: a ledger failure must never fail a user's
 *   AI request (fail-open), because the ledger is a cost control, not a
 *   security boundary (auth stays fail-closed).
 */

import type express from 'express';

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

export interface QuotaCheck {
  allowed: boolean;
  usedToday: number;
  dailyBudget: number;
  retryAfterSeconds: number;
}

export interface QuotaLedgerDeps {
  /** better-sqlite3 instance from src/db.ts */
  db: any;
  getDailyBudget?: () => number;
  now?: () => Date;
}

/**
 * QuotaLedger — durable per-user daily AI spend ledger (F1.5).
 * fail-open on internal errors: quota is a cost guardrail, not auth.
 */
export class QuotaLedger {
  private db: any;
  private getDailyBudget: () => number;
  private nowFn: () => Date;

  constructor(deps: QuotaLedgerDeps) {
    this.db = deps.db;
    this.getDailyBudget = deps.getDailyBudget ?? (() => {
      const raw = Number(process.env.DAILY_AI_BUDGET_TOKENS);
      return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : DAILY_BUDGET_DEFAULT;
    });
    this.nowFn = deps.now ?? (() => new Date());
    this.ensureSchema();
  }

  private ensureSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS ai_usage_ledger (
        user_id TEXT NOT NULL,
        day TEXT NOT NULL,
        route TEXT NOT NULL,
        calls INTEGER NOT NULL DEFAULT 0,
        tokens INTEGER NOT NULL DEFAULT 0,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id, day, route)
      );
      CREATE INDEX IF NOT EXISTS idx_ai_usage_ledger_user_day
        ON ai_usage_ledger (user_id, day);
    `);
  }

  usedToday(userId: string): number {
    try {
      const day = dayKeyFor(this.nowFn());
      const row = this.db
        .prepare('SELECT COALESCE(SUM(tokens), 0) AS total FROM ai_usage_ledger WHERE user_id = ? AND day = ?')
        .get(userId, day);
      return Number(row?.total || 0);
    } catch {
      return 0;
    }
  }

  check(userId: string): QuotaCheck {
    const dailyBudget = this.getDailyBudget();
    let usedToday = 0;
    try {
      usedToday = this.usedToday(userId);
    } catch {
      usedToday = 0;
    }
    const allowed = usedToday < dailyBudget;
    return {
      allowed,
      usedToday,
      dailyBudget,
      retryAfterSeconds: Math.ceil(msUntilLocalMidnight(this.nowFn()) / 1000),
    };
  }

  /**
   * Debit the ledger. `tokens` may come from real Gemini usageMetadata or the
   * per-route estimate. Best-effort: swallows its own errors (fail-open).
   */
  record(userId: string, route: string, tokens: number): void {
    try {
      const safeTokens = Math.max(0, Math.min(Math.floor(Number(tokens) || 0), 5_000_000));
      const day = dayKeyFor(this.nowFn());
      this.db
        .prepare(`
          INSERT INTO ai_usage_ledger (user_id, day, route, calls, tokens, updated_at)
          VALUES (?, ?, ?, 1, ?, CURRENT_TIMESTAMP)
          ON CONFLICT(user_id, day, route) DO UPDATE SET
            calls = calls + 1,
            tokens = tokens + excluded.tokens,
            updated_at = CURRENT_TIMESTAMP
        `)
        .run(userId, day, route, safeTokens);
    } catch (err) {
      console.error('quota ledger record failed (fail-open):', err);
    }
  }

  /** Admin/diagnostics snapshot for one user. */
  snapshot(userId: string): Array<{ route: string; calls: number; tokens: number }> {
    try {
      const day = dayKeyFor(this.nowFn());
      return this.db
        .prepare('SELECT route, calls, tokens FROM ai_usage_ledger WHERE user_id = ? AND day = ? ORDER BY tokens DESC')
        .all(userId, day);
    } catch {
      return [];
    }
  }
}

/**
 * Middleware factory wired into server.ts: blocks requests over budget with
 * 429 + Retry-After (until local midnight), X-Quota-* headers always set.
 */
export function quotaGuardMiddleware(ledger: QuotaLedger) {
  return function quotaGuard(req: any, res: any, next: any) {
    const uid = req.user?.uid;
    if (!uid) return next(); // auth middleware runs first and 401s anyway

    const check = ledger.check(uid);
    res.setHeader('X-Quota-Limit', String(check.dailyBudget));
    res.setHeader('X-Quota-Used', String(check.usedToday));

    if (!check.allowed) {
      res.setHeader('Retry-After', String(check.retryAfterSeconds));
      return res.status(429).json({
        error: 'Daily AI quota exhausted. Your allowance resets at midnight.',
        retryAfterSeconds: check.retryAfterSeconds,
        usedToday: check.usedToday,
        dailyBudget: check.dailyBudget,
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
