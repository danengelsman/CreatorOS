import { test, expect } from '@playwright/test';
import { freshPhaseAEmail, PHASE_A_TEST_PASSWORD } from './test-user';

/**
 * Phase A — email/password auth flows against the Firebase Emulator Suite.
 *
 * The Auth emulator supports email/password natively, so register → sign-in →
 * reset → sign-out-everywhere run as real flows with zero live-Firebase
 * contact. Like smoke_tests.spec.ts, AI/session API routes are mocked
 * (page.route); /api/auth/revoke-all intentionally hits the REAL dev server
 * (which runs with the emulator env vars) to exercise the server-side
 * revocation path end-to-end.
 */
test.describe.serial('Phase A email/password auth flows', () => {
  // One fresh account per run, shared by the serial tests below.
  const email = freshPhaseAEmail();

  async function mockApiSurface(page: import('@playwright/test').Page) {
    // Session-cookie exchange is unit-tested against the server; the e2e run
    // only needs it to not block sign-in. Fulfill cheaply.
    await page.route('**/api/auth/session', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, expiresIn: 14 * 24 * 60 * 60 }),
      });
    });
    // Benign onboarding/AI mocks (the flows below never drive the interview).
    await page.route('**/api/onboarding/**', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    });
    await page.route('**/api/gemini/generate', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ text: 'E2E mocked Gemini response.' }),
      });
    });
  }

  test('register: sign-up → onboarding parity → verification nudge', async ({ page }) => {
    await mockApiSurface(page);

    await page.goto('/login');
    await expect(page.locator('input[placeholder="Email Address"]')).toBeVisible();

    // Switch to the register view (bottom toggle says "Sign Up" on sign-in).
    await page.locator('[data-testid="auth-view-toggle"]').click();
    await expect(page.locator('input[placeholder="Confirm Password"]')).toBeVisible();

    // Policy gate: a common password is rejected client-side, before Firebase.
    await page.locator('input[placeholder="Email Address"]').fill(email);
    await page.locator('input[placeholder="Password"]').fill('password');
    await page.locator('input[placeholder="Confirm Password"]').fill('password');
    await page.locator('button[type="submit"]').click();
    await expect(page.locator('text=too common')).toBeVisible();

    // Now a policy-passing password registers and signs the user straight in
    // (same post-signup path as Google users: onboarding modal, not a special
    // email-user flow).
    await page.locator('input[placeholder="Password"]').fill(PHASE_A_TEST_PASSWORD);
    await page.locator('input[placeholder="Confirm Password"]').fill(PHASE_A_TEST_PASSWORD);
    await page.locator('button[type="submit"]').click();

    // Workspace parity: the same onboarding modal Google users see.
    await expect(page.locator('text=Build Your Channel Style').first()).toBeVisible();

    // Soft email-verification nudge (present, dismissible, non-blocking).
    await expect(page.locator('[data-testid="email-verification-banner"]')).toBeVisible();
  });

  test('forgot password: enumeration-safe generic copy for ANY email', async ({ page }) => {
    await mockApiSurface(page);

    const genericCopy = 'If an account exists for that email';
    await page.goto('/login');
    await page.locator('[data-testid="forgot-password-link"]').click();
    await expect(page.locator('text=Reset Your Password')).toBeVisible();

    // Unknown email → generic copy.
    await page
      .locator('input[placeholder="Email Address"]')
      .fill('nobody-here@demo-creatoros.test');
    await page.locator('button[type="submit"]').click();
    const unknownEmailCopy = await page.locator('[data-testid="auth-info-box"]').textContent();
    expect(unknownEmailCopy).toContain(genericCopy);

    // Registered email → the exact same generic copy (no existence leak).
    await page.locator('[data-testid="back-to-signin"]').click();
    await page.locator('[data-testid="forgot-password-link"]').click();
    await page.locator('input[placeholder="Email Address"]').fill(email);
    await page.locator('button[type="submit"]').click();
    const knownEmailCopy = await page.locator('[data-testid="auth-info-box"]').textContent();
    expect(knownEmailCopy).toContain(genericCopy);
    expect(knownEmailCopy).toContain('Check your inbox');
    expect(knownEmailCopy).toEqual(unknownEmailCopy);
  });

  test('sign-in: registered email/password reaches the same workspace', async ({ page }) => {
    await mockApiSurface(page);

    await page.goto('/login');
    await page.locator('input[placeholder="Email Address"]').fill(email);
    await page.locator('input[placeholder="Password"]').fill(PHASE_A_TEST_PASSWORD);
    await page.locator('button[type="submit"]').click();

    // Phase 1: onboarding is a one-time event at profile creation. The
    // register test above created users/{uid}, so re-sign-in lands directly
    // in the workspace (Today on Home) — the modal never remounts.
    await expect(page.locator('header button').first()).toBeVisible();
    await expect(page.locator('text=Build Your Channel Style')).toHaveCount(0);

    // Firestore parity: users/{uid} exists with accountProvider 'password',
    // written through the SAME rules path as Google sign-ins.
    const signIn = await fetch(
      'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=e2e-local-check',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: PHASE_A_TEST_PASSWORD, returnSecureToken: true }),
      },
    );
    expect(signIn.ok).toBe(true);
    const { idToken, localId } = (await signIn.json()) as { idToken: string; localId: string };
    const doc = await fetch(
      `http://127.0.0.1:8080/v1/projects/demo-creatoros/databases/(default)/documents/users/${localId}`,
      { headers: { Authorization: `Bearer ${idToken}` } },
    );
    expect(doc.ok).toBe(true);
    const docBody: any = await doc.json();
    expect(docBody?.fields?.accountProvider?.stringValue).toBe('password');
    expect(docBody?.fields?.email?.stringValue).toBe(email);
  });

  test('sign out of all devices: server revocation lands the user back on login', async ({
    page,
  }) => {
    await mockApiSurface(page);

    await page.goto('/login');
    await page.locator('input[placeholder="Email Address"]').fill(email);
    await page.locator('input[placeholder="Password"]').fill(PHASE_A_TEST_PASSWORD);
    await page.locator('button[type="submit"]').click();
    // Profile doc exists from the register test → workspace mounts directly,
    // no onboarding modal to dismiss (Phase 1: onboarding is one-time).
    await expect(page.locator('header button').first()).toBeVisible();
    await expect(page.locator('text=Build Your Channel Style')).toHaveCount(0);

    // Profile (Settings) → Sign out of all devices. This call goes to the REAL
    // dev server (not mocked): verifyIdToken + revokeRefreshTokens against the
    // emulator, then a client sign-out.
    await page.locator('header button').first().click();
    await page.locator('button:has-text("Profile")').first().click();
    await expect(page.locator('[data-testid="sign-out-all-devices"]')).toBeVisible();
    await page.locator('[data-testid="sign-out-all-devices"]').click();

    // Signed out everywhere → back on the public landing/login surface.
    await expect(page.locator('button:has-text("Sign In")').first()).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.locator('[data-testid="sign-out-all-devices"]')).toHaveCount(0);
  });
});
