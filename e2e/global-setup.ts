import { TEST_USER_EMAIL, TEST_USER_PASSWORD } from './test-user';

/**
 * F4.5 global setup: seed the Firebase Auth emulator with the shared e2e user
 * via its REST API (identitytoolkit signUp). Idempotent — an existing account
 * is treated as success so reruns and parallel workers stay green.
 *
 * Note: the emulator only accepts UN-scoped /v1/accounts:* endpoints for
 * unauthenticated seeding (the /projects/{id}/ form requires auth).
 *
 * Playwright starts the webServers (emulators + dev server) before globalSetup
 * runs, but we poll briefly anyway so ordering changes can't break seeding.
 */
const AUTH_EMULATOR_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST || '127.0.0.1:9099';
const FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080';
const EMULATOR_PROJECT_ID = 'demo-creatoros';
const SEED_TIMEOUT_MS = 30_000;

async function seedOnce(): Promise<{
  ok: boolean;
  status: number;
  code?: string;
  localId?: string;
  idToken?: string;
}> {
  const url = `http://${AUTH_EMULATOR_HOST}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=e2e-local-seed`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: TEST_USER_EMAIL,
      password: TEST_USER_PASSWORD,
      returnSecureToken: true,
    }),
  });
  const body: any = await response.json().catch(() => ({}));
  const code = body?.error?.message;
  if (response.ok) {
    return {
      ok: true,
      status: response.status,
      code,
      localId: body?.localId,
      idToken: body?.idToken,
    };
  }
  if (code === 'EMAIL_EXISTS') {
    // Account already exists (rerun) — mint a fresh token via sign-in so the
    // brand document seed below still has credentials to write with.
    const signInResponse = await fetch(
      `http://${AUTH_EMULATOR_HOST}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=e2e-local-seed`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: TEST_USER_EMAIL,
          password: TEST_USER_PASSWORD,
          returnSecureToken: true,
        }),
      },
    );
    const signInBody: any = await signInResponse.json().catch(() => ({}));
    return {
      ok: signInResponse.ok,
      status: signInResponse.status,
      code: signInResponse.ok ? code : signInBody?.error?.message,
      localId: signInBody?.localId,
      idToken: signInBody?.idToken,
    };
  }
  return { ok: false, status: response.status, code };
}

async function seedEmulatorUser() {
  const deadline = Date.now() + SEED_TIMEOUT_MS;
  let last: { ok: boolean; status: number; code?: string; localId?: string; idToken?: string } = {
    ok: false,
    status: 0,
  };

  while (Date.now() < deadline) {
    try {
      last = await seedOnce();
      if (last.ok) {
        console.log(
          `[e2e] Auth emulator ready — seed user ${TEST_USER_EMAIL} ${last.code === 'EMAIL_EXISTS' ? 'already exists' : 'created'}`,
        );
        await seedBrandDocument(last.localId, last.idToken);
        await seedUserProfile(last.localId, last.idToken);
        return;
      }
    } catch {
      // Emulator not accepting connections yet — retry until the deadline.
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error(
    `[e2e] could not seed the Auth emulator at ${AUTH_EMULATOR_HOST}: ` +
      `last response ${last.status} ${last.code ?? '(no response)'}. ` +
      'Is Java available for the Firebase emulators?',
  );
}

/**
 * Seed the brand project doc (`projects/brand_<uid>`) the app checks after
 * sign-in: with it present (status !== 'draft', data present), App mounts the
 * workspace directly — the onboarding modal is skipped and the Create studio
 * is unlocked instead of showing its "Identity Required" gate. Written with
 * the seed user's own ID token so it passes the same Firestore rules as a
 * real client write.
 */
async function seedBrandDocument(localId?: string, idToken?: string) {
  if (!localId || !idToken) {
    console.warn('[e2e] no localId/idToken from seed signUp — skipping brand document seed');
    return;
  }
  const url = `http://${FIRESTORE_EMULATOR_HOST}/v1/projects/${EMULATOR_PROJECT_ID}/databases/(default)/documents/projects/brand_${localId}`;
  const response = await fetch(url, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${idToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fields: {
        userId: { stringValue: localId },
        name: { stringValue: 'E2E Brand' },
        type: { stringValue: 'brand_kit' },
        status: { stringValue: 'ready' },
        createdAt: { timestampValue: '2026-01-01T00:00:00.000Z' },
        data: {
          mapValue: {
            fields: {
              name: { stringValue: 'E2E Brand' },
              tagline: { stringValue: 'Testing at machine speed' },
              archetype: { stringValue: 'The Educator' },
              personality: { stringValue: 'friendly, precise' },
              visual_style: { stringValue: 'modern and clean' },
              avatar: {
                mapValue: {
                  fields: {
                    gender: { stringValue: 'Female' },
                    clothing: { stringValue: 'Professional business attire' },
                    background: { stringValue: 'Modern office with soft lighting' },
                  },
                },
              },
            },
          },
        },
      },
    }),
  });
  if (!response.ok) {
    throw new Error(
      `[e2e] failed to seed brand document: ${response.status} ${await response.text()}`,
    );
  }
  console.log(`[e2e] Firestore emulator ready — seeded projects/brand_${localId}`);
}

/**
 * Seed the user profile doc (`users/<uid>`). Phase 1: App keys the onboarding
 * modal to the EXISTENCE of users/{uid} (it is created at first sign-in), no
 * longer to the brand document — branding is optional and must never re-open
 * onboarding. The shared seed user simulates an existing member, so their
 * profile is seeded here with their own ID token (same rules path as a real
 * client create); a missing profile would mount onboarding over the workspace.
 */
async function seedUserProfile(localId?: string, idToken?: string) {
  if (!localId || !idToken) {
    console.warn('[e2e] no localId/idToken from seed signUp — skipping user profile seed');
    return;
  }
  const url = `http://${FIRESTORE_EMULATOR_HOST}/v1/projects/${EMULATOR_PROJECT_ID}/databases/(default)/documents/users/${localId}`;
  // Idempotent: the update rules only allow lastLogin-style merges, so an
  // existing profile (warm emulator reuse) is left untouched rather than
  // rewritten with create-only fields.
  const existing = await fetch(url, { headers: { Authorization: `Bearer ${idToken}` } });
  if (existing.ok) {
    console.log(`[e2e] Firestore emulator ready — users/${localId} already seeded`);
    return;
  }
  const response = await fetch(url, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${idToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fields: {
        email: { stringValue: TEST_USER_EMAIL },
        accountProvider: { stringValue: 'password' },
        createdAt: { timestampValue: '2026-01-01T00:00:00.000Z' },
        lastLogin: { timestampValue: '2026-01-01T00:00:00.000Z' },
      },
    }),
  });
  if (!response.ok) {
    throw new Error(
      `[e2e] failed to seed user profile: ${response.status} ${await response.text()}`,
    );
  }
  console.log(`[e2e] Firestore emulator ready — seeded users/${localId}`);
}

/**
 * Warm the dev server's module graph before any spec runs: on-demand vite
 * compiles land on whichever test hits a route first, which otherwise turns
 * into cold-start flakiness. Best effort — a warmup failure must not fail the
 * run (specs tolerate slow compiles via the 30s expect timeout).
 */
async function warmDevServer() {
  const baseURL = process.env.APP_URL || 'http://localhost:3000';
  try {
    const { chromium } = await import('@playwright/test');
    const browser = await chromium.launch();
    const page = await browser.newPage();
    await page.goto(baseURL, { waitUntil: 'domcontentloaded', timeout: 90_000 });
    await page.goto(`${baseURL}/login`, { waitUntil: 'domcontentloaded', timeout: 90_000 });
    await browser.close();
    console.log('[e2e] dev server module graph warmed (/, /login)');
  } catch (error) {
    console.warn('[e2e] dev server warmup skipped:', error);
  }
}

export default async function globalSetup() {
  await seedEmulatorUser();
  await warmDevServer();
}
