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
 * Phase A — email/password registration flows. Fresh addresses per run (the
 * emulator keeps accounts for the whole run, and register must exercise the
 * SIGN-UP path, not email-already-in-use). The password must satisfy the
 * shipped password policy: >= 8 chars, not in the bundled common-password list.
 */
export const PHASE_A_TEST_PASSWORD = 'EmulatorOnly-Not-A-Secret';
export function freshPhaseAEmail(): string {
  return `e2e-auth-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@demo-creatoros.test`;
}
