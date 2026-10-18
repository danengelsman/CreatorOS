import { test, expect } from '@playwright/test';
import {
  TEST_USER_PASSWORD,
  createEmulatorUser,
  requestPasswordReset,
  signInEmulatorUser,
  uniqueEmulatorEmail,
} from './test-user';

/**
 * F4.5b — Auth harness checks for the email/password flows that the Login UI
 * does not expose yet. The first test runs TODAY against the Auth emulator and
 * proves the harness helpers in e2e/test-user.ts (signUp / signInWithPassword
 * / sendOobCode) work end to end. The two test.fixme blocks are the contract
 * for the later PR that adds sign-up and forgot-password UI to Login.tsx:
 * flipping each `test.fixme` to `test` is the one-line change, the selectors
 * below are the exact ones to use (they match Login.tsx's existing
 * conventions: placeholder-driven inputs + button[type="submit"]).
 */

test.describe('CreatorOS auth harness (emulator only)', () => {
  test('createEmulatorUser / signInEmulatorUser / requestPasswordReset drive the Auth emulator REST API', async () => {
    const email = uniqueEmulatorEmail('auth');

    // 1. Account creation returns a UID + fresh ID token.
    const created = await createEmulatorUser(email, TEST_USER_PASSWORD);
    expect(created.ok, `signUp failed: ${created.status} ${created.code}`).toBe(true);
    expect(created.localId).toBeTruthy();
    expect(created.idToken).toBeTruthy();

    // 2. Duplicate creation is rejected with identitytoolkit's EMAIL_EXISTS —
    //    callers wanting idempotency should sign in instead.
    const duplicated = await createEmulatorUser(email, TEST_USER_PASSWORD);
    expect(duplicated.ok).toBe(false);
    expect(duplicated.code).toBe('EMAIL_EXISTS');

    // 3. Password sign-in resolves the SAME account.
    const signedIn = await signInEmulatorUser(email, TEST_USER_PASSWORD);
    expect(signedIn.ok, `signIn failed: ${signedIn.status} ${signedIn.code}`).toBe(true);
    expect(signedIn.localId).toBe(created.localId);

    // 4. Password reset resolves out-of-band LOCALLY: the emulator processes
    //    the request and logs the reset link (http://<emulator>/emulator/
    //    action?mode=resetPassword...) instead of sending email. A bogus
    //    address is rejected with EMAIL_NOT_FOUND (no user-enumeration guard
    //    in the emulator — do not copy that behavior into production specs).
    const reset = await requestPasswordReset(email);
    expect(reset.ok, `sendOobCode failed: ${reset.status} ${reset.code}`).toBe(true);
    const unknown = await requestPasswordReset(uniqueEmulatorEmail('nobody'));
    expect(unknown.ok).toBe(false);
    expect(unknown.code).toBe('EMAIL_NOT_FOUND');
  });

  test.fixme('sign up a brand-new account through the Login UI', async () => {
    // BLOCKED ON UI: Login.tsx has no sign-up affordance yet (email/password
    // inputs submit signInWithEmailAndPassword only). When the sign-up toggle
    // lands, flip this fixme off and add the `page` fixture — the flow below
    // is the intended contract:
    //
    //   const email = uniqueEmulatorEmail('signup-ui');
    //   await page.goto('/login');
    //   await page.locator('button:has-text("Create account")').click();
    //   await page.locator('input[placeholder="Email Address"]').fill(email);
    //   await page.locator('input[placeholder="Password"]').fill(TEST_USER_PASSWORD);
    //   await page.locator('button[type="submit"]').click();
    //   // Header renders only for an authenticated user.
    //   await expect(page.locator('header button').first()).toBeVisible();
    //   // A brand-new account has no brand doc → onboarding must mount.
    //   await expect(
    //     page.getByRole('heading', { name: "Let's Build Your Channel Style" }),
    //   ).toBeVisible();
    //
    // (createEmulatorUser() in e2e/test-user.ts already proves the emulator
    // side of this flow — see the live test above.)
  });

  test.fixme('request a password reset through the Login UI', async () => {
    // BLOCKED ON UI: Login.tsx has no "Forgot password?" affordance yet. When
    // it lands, flip this fixme off and add the `page` fixture — the flow
    // below is the intended contract:
    //
    //   const email = uniqueEmulatorEmail('reset-ui');
    //   expect((await createEmulatorUser(email, TEST_USER_PASSWORD)).ok).toBe(true);
    //   await page.goto('/login');
    //   await page.locator('button:has-text("Forgot password?")').click();
    //   await page.locator('input[placeholder="Email Address"]').fill(email);
    //   await page.locator('button[type="submit"]').click();
    //   await expect(page.getByText(/reset link sent|check your email/i)).toBeVisible();
    //   // The emulator resolves the out-of-band link locally; deep-verification
    //   // of the oob page itself can stay at the requestPasswordReset() level.
    //
    // (requestPasswordReset() in e2e/test-user.ts already proves the emulator
    // side of this flow — see the live test above.)
  });
});
