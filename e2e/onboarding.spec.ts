import { test, expect } from '@playwright/test';
import { TEST_USER_PASSWORD, createEmulatorUser, uniqueEmulatorEmail } from './test-user';

/**
 * F4.5b — Onboarding → Dashboard handoff regression net.
 *
 * This spec creates a fresh Auth-emulator account with NO Firestore docs, so
 * when App's auth handler sees users/<uid> does not exist it shows the
 * onboarding modal (Phase 1: onboarding is keyed to profile creation, not to
 * branding — a brand kit is optional). It then walks the real interview
 * (niche → audience → vibe, /api/onboarding/chat mocked), builds the brand kit
 * via "Build my channel style first" (/api/onboarding/generate-brand mocked),
 * and asserts:
 *   1. the handoff to the logged-in Home view (Today primary; the Home studio
 *      content — including the first-creation mission — lives in a collapsed
 *      <details> the spec opens before asserting),
 *   2. users/{uid}.onboardingAnswers landed in the EMULATOR Firestore
 *      (REST read with the user's ID token, same pattern as global-setup.ts),
 *   3. a reload does NOT remount onboarding (users/<uid> now exists).
 *
 * No live-service contact: Firebase stays on local emulators, every /api/*
 * route is mocked (catch-all aborts anything unmocked), and the request
 * tripwires below fail the test if anything reaches a real Firebase host.
 */

const EMULATOR_PROJECT_ID = 'demo-creatoros';
const FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080';

/** Answers the mocked chat interview hands back as the final summary. */
const MOCK_ANSWERS = {
  niche: 'Vertical farming tech',
  audience: 'Urban homesteaders',
  vibe: 'Calm and practical',
};

/** Kit returned by the mocked /api/onboarding/generate-brand. `tagline` feeds
 * users/{uid}.onboardingAnswers.summary; `content_ideas` lets the Home view
 * render its first-creation mission without another API call. */
const MOCK_BRAND_KIT = {
  name: 'E2E Test Brand',
  tagline: 'Fresh greens, zero guesswork',
  archetype: 'The Educator',
  content_ideas: [
    {
      title: 'Microgreens starter kit',
      hook: 'Harvest in 7 days',
      description: 'A windowsill setup anyone can maintain.',
    },
    {
      title: 'Balcony hydroponics tour',
      hook: 'Soil-free, mess-free',
      description: 'Walk through a budget balcony rig.',
    },
  ],
};

/** Read a Firestore emulator document via REST with the user's ID token —
 * the same rules path a real client read takes. */
async function readEmulatorDocument(uid: string, idToken: string): Promise<any> {
  const url = `http://${FIRESTORE_EMULATOR_HOST}/v1/projects/${EMULATOR_PROJECT_ID}/databases/(default)/documents/users/${uid}`;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${idToken}` },
  });
  const body = await response.text();
  expect(
    response.ok,
    `Firestore REST read of users/${uid} failed: ${response.status} ${body}`,
  ).toBe(true);
  return JSON.parse(body);
}

/** Pull `onboardingAnswers` out of a REST document body (proto mapValue shape). */
function extractOnboardingAnswers(uid: string, document: any): Record<string, string> {
  const mapFields = document?.fields?.onboardingAnswers?.mapValue?.fields;
  expect(mapFields, `users/${uid} has no onboardingAnswers map`).toBeTruthy();
  const answers: Record<string, string> = {};
  for (const [key, value] of Object.entries(mapFields)) {
    answers[key] = (value as any)?.stringValue ?? JSON.stringify(value);
  }
  return answers;
}

test.describe('CreatorOS Onboarding → Dashboard handoff', () => {
  test('walks niche/audience/vibe onboarding, lands on Home, persists onboardingAnswers, and does not remount on reload', async ({
    page,
  }) => {
    test.setTimeout(120_000);

    // --- F4.5 guard rails: local emulators + mocked APIs, nothing live. ---
    const liveFirebaseHits: string[] = [];
    page.on('request', (request) => {
      const url = request.url();
      const isFirebaseDataPlane =
        /firebaseio\.com|identitytoolkit\.googleapis\.com|securetoken\.googleapis\.com|firestore\.googleapis\.com|firebasestorage\.googleapis\.com/.test(
          url,
        );
      if (isFirebaseDataPlane && !url.includes('127.0.0.1')) liveFirebaseHits.push(url);
    });
    const unmockedApiCalls: string[] = [];

    // Catch-all FIRST: anything not explicitly mocked below fails the test
    // instead of leaking to the dev server (Playwright resolves overlapping
    // routes last-registered-first).
    await page.route('**/api/**', (route) => {
      unmockedApiCalls.push(route.request().url());
      return route.abort();
    });

    // Session-cookie exchange (Phase A): sign-in fires this after login. The
    // exchange is unit-tested against the server; e2e only needs it to not
    // block sign-in. Same cheap fulfill as auth-flows.spec.ts.
    await page.route('**/api/auth/session', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, expiresIn: 14 * 24 * 60 * 60 }),
      });
    });

    // Home (Dashboard) fetches the analytics summary; degrade gracefully.
    await page.route('**/api/analytics/summary', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    });

    // Insurance: the niche-sparks pill only appears when the user idles 60s on
    // question 1 — never reached in this spec, but never let it leak either.
    await page.route('**/api/onboarding/niche-sparks', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ museMessage: '', sparks: [] }),
      });
    });

    // The AI Brand Architect interview: reply per question; the third answer
    // completes the interview and hands back the summary the app persists.
    let chatCallCount = 0;
    await page.route('**/api/onboarding/chat', async (route) => {
      chatCallCount += 1;
      const replies: Record<number, object> = {
        1: { message: 'Got it — and who is your dream audience or target viewer? (e2e Q2)' },
        2: {
          message: 'Last one: what should the style and mood of your content feel like? (e2e Q3)',
        },
        3: { message: 'I have everything I need.', isComplete: true, summary: MOCK_ANSWERS },
      };
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(replies[Math.min(chatCallCount, 3)]),
      });
    });

    // The brand-kit build that fires when the user clicks "Build My Channel
    // Style" — Onboarding writes this kit into projects/brand_<uid> (status
    // 'completed') and the answers into users/{uid}.onboardingAnswers.
    await page.route('**/api/onboarding/generate-brand', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_BRAND_KIT),
      });
    });

    // --- Seed a signed-in user with NO brand doc (pristine Firestore slate). ---
    const email = uniqueEmulatorEmail('onboarding');
    const created = await createEmulatorUser(email, TEST_USER_PASSWORD);
    expect(
      created.ok,
      `Auth emulator account creation failed: ${created.status} ${created.code}`,
    ).toBe(true);
    const { localId: uid, idToken } = created;

    // --- Sign in through the real Login UI. ---
    await page.goto('/login');
    await page.locator('input[placeholder="Email Address"]').fill(email);
    await page.locator('input[placeholder="Password"]').fill(TEST_USER_PASSWORD);
    await page.locator('button[type="submit"]').click();

    // --- Onboarding must mount (fresh account → no users/<uid> profile doc). ---
    const onboardingHeading = page.getByRole('heading', { name: "Let's Build Your Channel Style" });
    await expect(onboardingHeading).toBeVisible();

    // --- Walk the real interview steps. ---
    await page.locator('button:has-text("Let\'s Begin!")').click();
    const chatInput = page.locator('input[placeholder="Type your response here..."]');

    await expect(chatInput).toBeVisible();
    await chatInput.fill(MOCK_ANSWERS.niche);
    await chatInput.press('Enter');
    await expect(page.getByText('(e2e Q2)')).toBeVisible();

    await chatInput.fill(MOCK_ANSWERS.audience);
    await chatInput.press('Enter');
    await expect(page.getByText('(e2e Q3)')).toBeVisible();

    await chatInput.fill(MOCK_ANSWERS.vibe);
    await chatInput.press('Enter');
    expect(chatCallCount).toBe(3);

    // Interview complete → summary card (2200ms reveal) → build the kit.
    // Phase 1: the brand-kit build is the secondary action; the primary is
    // "Continue to Today" (no kit required).
    await expect(page.getByRole('heading', { name: 'Your Profile is Ready!' })).toBeVisible();
    await expect(page.getByText(MOCK_ANSWERS.niche)).toBeVisible();
    await expect(page.getByText(MOCK_ANSWERS.audience)).toBeVisible();
    await expect(page.getByText(MOCK_ANSWERS.vibe)).toBeVisible();
    await page.locator('button:has-text("Build my channel style first")').click();

    // --- Handoff: onboarding closes, the logged-in Home view mounts. ---
    await expect(onboardingHeading).toHaveCount(0);
    const menuButton = page.locator('header button').first();
    await expect(menuButton).toBeVisible();
    // Home leads with Today; the studio content (first-creation mission seeded
    // from the mocked kit's content_ideas) sits in a collapsed panel.
    const studioPanel = page.locator(
      'details:has(summary:has-text("Explore your existing studio"))',
    );
    await studioPanel.locator('summary').click();
    const missionSection = page.locator('section[aria-label="Your first creator mission"]');
    await expect(missionSection).toBeVisible();
    await expect(
      missionSection.getByRole('heading', { name: 'Make one piece for your audience' }),
    ).toBeVisible();
    await expect(
      missionSection.locator('button:has-text("Microgreens starter kit")'),
    ).toBeVisible();

    // --- users/{uid}.onboardingAnswers landed in the EMULATOR Firestore. ---
    // handleBuildBrandKit awaits both setDocs before calling onComplete, so the
    // document is already committed by the time the handoff asserts pass; the
    // poll only absorbs emulator/REST jitter.
    let userDoc: any = null;
    const deadline = Date.now() + 15_000;
    while (Date.now() < deadline) {
      userDoc = await readEmulatorDocument(uid!, idToken!);
      if (userDoc?.fields?.onboardingAnswers) break;
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    const answers = extractOnboardingAnswers(uid!, userDoc);
    expect(answers).toEqual({
      niche: MOCK_ANSWERS.niche,
      audience: MOCK_ANSWERS.audience,
      vibe: MOCK_ANSWERS.vibe,
      summary: MOCK_BRAND_KIT.tagline, // Onboarding copies kit.tagline → summary
    });

    // --- Reload: the existing users/<uid> profile must suppress onboarding. ---
    await page.reload();
    await expect(onboardingHeading).toHaveCount(0);
    await page
      .locator('details:has(summary:has-text("Explore your existing studio"))')
      .locator('summary')
      .click();
    await expect(page.locator('section[aria-label="Your first creator mission"]')).toBeVisible();
    await expect(menuButton).toBeVisible();

    // F4.5 assertions: the entire flow stayed on local emulators and mocks.
    expect(
      unmockedApiCalls,
      `unmocked /api calls reached the network: ${unmockedApiCalls.join(', ')}`,
    ).toEqual([]);
    expect(liveFirebaseHits, `requests hit live Firebase: ${liveFirebaseHits.join(', ')}`).toEqual(
      [],
    );
  });
});
