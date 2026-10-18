/**
 * F4.5: Credentials for the emulator-seeded e2e user.
 *
 * These are NOT real credentials. The user only exists inside the local
 * Firebase Auth emulator (demo-creatoros project on 127.0.0.1:9099) and is
 * seeded idempotently by e2e/global-setup.ts before the specs run. No spec
 * may hold real credentials or touch a live Firebase project.
 */
export const TEST_USER_EMAIL = 'e2e-smoke@demo-creatoros.test';
export const TEST_USER_PASSWORD = 'EmulatorOnly-Not-A-Secret';

/**
 * Phase A + F4.5b: auth-emulator harness helpers.
 *
 * Phase A (email/password UI) added registration flows: fresh addresses per
 * run (register must exercise the SIGN-UP path, not email-already-in-use) and
 * a password satisfying the shipped policy (>= 8 chars, not in the bundled
 * common-password list).
 *
 * Before that UI existed, specs needing a throwaway identity created it
 * directly against the Auth emulator REST API — the same un-scoped
 * `/v1/accounts:*` endpoints e2e/global-setup.ts uses for seeding. Those
 * direct-call helpers remain; e2e/auth.spec.ts (test.fixme) documents the
 * UI-driven flows that the Phase A Login UI now enables (flipping them live
 * is a follow-up).
 */
export const AUTH_EMULATOR_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST || '127.0.0.1:9099';

/** Result of an Auth emulator REST call, mirroring the identitytoolkit body. */
export interface EmulatorAuthResult {
  ok: boolean;
  status: number;
  /** identitytoolkit error code, e.g. EMAIL_EXISTS / EMAIL_NOT_FOUND / WEAK_PASSWORD */
  code?: string;
  /** Firebase UID (identitytoolkit `localId`) */
  localId?: string;
  /** Fresh emulator ID token — usable as a Bearer token against Firestore rules */
  idToken?: string;
  /** Password-reset out-of-band link (emulator-local URL), when requested */
  oobLink?: string;
}

async function authEmulatorPost(
  endpoint: 'signUp' | 'signInWithPassword' | 'sendOobCode',
  body: Record<string, unknown>,
): Promise<EmulatorAuthResult> {
  const url = `http://${AUTH_EMULATOR_HOST}/identitytoolkit.googleapis.com/v1/accounts:${endpoint}?key=e2e-local-harness`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const payload: any = await response.json().catch(() => ({}));
  if (response.ok) {
    return {
      ok: true,
      status: response.status,
      localId: payload?.localId,
      idToken: payload?.idToken,
      oobLink: payload?.oobLink,
    };
  }
  return { ok: false, status: response.status, code: payload?.error?.message };
}

/**
 * Create a brand-new email/password account in the Auth emulator.
 * Intentionally does NOT tolerate EMAIL_EXISTS: callers needing isolation
 * should pass a fresh unique email (see uniqueEmulatorEmail) so each run gets
 * a pristine Firestore slate (no brand doc → onboarding mounts).
 */
export function createEmulatorUser(email: string, password: string): Promise<EmulatorAuthResult> {
  return authEmulatorPost('signUp', { email, password, returnSecureToken: true });
}

/** Sign in against the Auth emulator; returns the UID and a fresh ID token. */
export function signInEmulatorUser(email: string, password: string): Promise<EmulatorAuthResult> {
  return authEmulatorPost('signInWithPassword', { email, password, returnSecureToken: true });
}

/**
 * Request a password-reset email through the Auth emulator. The emulator
 * resolves the out-of-band link locally (oobLink) instead of sending mail —
 * the response proves the account exists and the flow is wired end to end.
 */
export function requestPasswordReset(email: string): Promise<EmulatorAuthResult> {
  return authEmulatorPost('sendOobCode', { requestType: 'PASSWORD_RESET', email });
}

/**
 * A collision-free emulator-only address. Unique per call so tests that create
 * accounts never share a Firestore slate across reruns (the emulators keep
 * data alive while the suite reuses a running server locally).
 */
export function uniqueEmulatorEmail(prefix = 'e2e'): string {
  return `${prefix}+${Date.now()}-${Math.floor(Math.random() * 1e9)}@demo-creatoros.test`;
}

/**
 * Phase A — email/password registration flows. Fresh addresses per run (the
 * emulator keeps accounts for the whole run, and register must exercise the
 * SIGN-UP path, not email-already-in-use). The password must satisfy the
 * shipped password policy: >= 8 chars, not in the bundled common-password list.
 */
export const PHASE_A_TEST_PASSWORD = 'EmulatorOnly-Not-A-Secret';
export function freshPhaseAEmail(): string {
  return `e2e-auth-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@demo-creatoros.test`;
}
