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
