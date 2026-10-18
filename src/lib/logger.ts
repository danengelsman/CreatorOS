import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebase';
import {
  createErrorLogGate,
  DEFAULT_ERROR_LOG_SAMPLE_RATE,
  DEFAULT_MAX_ERROR_LOGS_PER_SESSION,
} from './errorLogGate';

export interface AppLogData {
  userId?: string | null;
  message: string;
  stack?: string | null;
  url?: string;
  userAgent?: string;
  timestamp: any;
  metadata?: any;
}

// F4.7 — Budget knobs (D6-A). Env-overridable so a bad release can be debugged
// with a higher cap, or muted entirely with a 0 sample rate, without a redeploy
// of code — just a different env var on the hosting platform.
const envMaxLogs = Number(import.meta.env.VITE_MAX_ERROR_LOGS_PER_SESSION);
const MAX_ERROR_LOGS_PER_SESSION =
  Number.isFinite(envMaxLogs) && envMaxLogs >= 1
    ? Math.floor(envMaxLogs)
    : DEFAULT_MAX_ERROR_LOGS_PER_SESSION;

const envSampleRate = Number(import.meta.env.VITE_ERROR_LOG_SAMPLE_RATE);
const ERROR_LOG_SAMPLE_RATE = Number.isFinite(envSampleRate)
  ? Math.min(1, Math.max(0, envSampleRate))
  : DEFAULT_ERROR_LOG_SAMPLE_RATE;

// One gate per session: dedupe + cap + sampling (see errorLogGate.ts). Because
// fingerprints are only admitted through the gate, its internal state stays
// bounded by the cap — no separate trim needed.
const logGate = createErrorLogGate({
  maxPerSession: MAX_ERROR_LOGS_PER_SESSION,
  sampleRate: ERROR_LOG_SAMPLE_RATE,
});

/**
 * Logs a client-side runtime error to the Firestore 'app_logs' collection.
 * Includes automatic deduplication, per-session sampling and write cap
 * (F4.7, D6-A), and payload size safety limits. Fire-and-forget: callers never
 * await this, and any failure falls back to console instead of reaching the UI.
 */
export async function logErrorToFirestore(
  error: Error | string | unknown,
  metadata?: any,
): Promise<void> {
  try {
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : null;
    const url = window.location.href;
    const userAgent = navigator.userAgent;
    const userId = auth.currentUser?.uid || null;

    // F4.7 — Sampling + cap + dedupe all live in the gate; this function stays
    // fire-and-forget and must never throw into the UI (the try/catch below is
    // the last-resort guard).
    const fingerprint = `${message}-${stack || ''}-${url}`;
    if (!logGate.shouldLog(fingerprint)) {
      return;
    }

    const payload: AppLogData = {
      userId,
      message: message.substring(0, 10000), // Guard against excessively large messages
      stack: stack ? stack.substring(0, 50000) : null,
      url,
      userAgent,
      timestamp: serverTimestamp(),
      metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : null,
    };

    const logsCollection = collection(db, 'app_logs');
    await addDoc(logsCollection, payload);
  } catch (err) {
    // Fallback to console to prevent infinite error loops
    console.error('Failed to dispatch error to app_logs:', err);
  }
}

let isInitialized = false;

/**
 * Attaches global window listeners to capture unhandled exceptions and promise rejections automatically.
 */
export function initErrorMonitoring(): void {
  if (isInitialized) return;
  isInitialized = true;

  // Catch general unhandled exceptions
  window.addEventListener('error', (event) => {
    // Ignore external cross-origin script error noise
    if (event.message === 'Script error.' && !event.filename) {
      return;
    }

    logErrorToFirestore(event.error || event.message, {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      source: 'window.onerror',
    });
  });

  // Catch unhandled Promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    logErrorToFirestore(event.reason, {
      source: 'window.onunhandledrejection',
    });
  });

  console.log('CreatorOS Production Error Monitoring Pipeline Enabled.');
}
