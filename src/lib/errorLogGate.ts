// F4.7 — Client error-log budget (decision D6-A). Decides which runtime errors
// earn a Firestore write: dedupe identical errors, cap total writes per
// session, and optionally sample. Pure logic — no DOM, no Firebase — so the
// unit suite can exercise it directly (tests/errorLogGate.test.ts).

export interface ErrorLogGateOptions {
  /** Max error docs written per browser session. Default 10. */
  maxPerSession?: number;
  /** Fraction of new (non-duplicate) errors admitted, 0..1. Default 1. */
  sampleRate?: number;
  /** Random source, injectable for deterministic tests. Default Math.random. */
  random?: () => number;
}

export const DEFAULT_MAX_ERROR_LOGS_PER_SESSION = 10;
export const DEFAULT_ERROR_LOG_SAMPLE_RATE = 1;

export interface ErrorLogGate {
  /** True when this error fingerprint should be written to Firestore. */
  shouldLog(fingerprint: string): boolean;
  /** Docs admitted so far this session. */
  get written(): number;
}

export function createErrorLogGate(options: ErrorLogGateOptions = {}): ErrorLogGate {
  const maxPerSession = normalizeCount(options.maxPerSession, DEFAULT_MAX_ERROR_LOGS_PER_SESSION);
  const sampleRate = clampRate(options.sampleRate, DEFAULT_ERROR_LOG_SAMPLE_RATE);
  const random = options.random ?? Math.random;
  const seen = new Set<string>();
  let written = 0;

  return {
    shouldLog(fingerprint: string): boolean {
      // 1. Dedupe: only the first occurrence of an identical error is signal.
      if (seen.has(fingerprint)) return false;
      // 2. Cap: a runaway error loop must not flood the app_logs collection.
      if (written >= maxPerSession) return false;
      // 3. Sample: applies to new errors only. A rejected sample is NOT
      //    remembered, so a recurring error keeps its fair chance later and
      //    rejected samples never consume the budget. P(admit) = sampleRate
      //    (0 mutes the logger entirely, 1 admits everything).
      if (random() >= sampleRate) return false;

      seen.add(fingerprint);
      written += 1;
      return true;
    },
    get written() {
      return written;
    },
  };
}

function normalizeCount(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 1 ? Math.floor(parsed) : fallback;
}

function clampRate(value: unknown, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(1, Math.max(0, parsed));
}
