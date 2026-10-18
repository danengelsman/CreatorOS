import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E testing configuration for CreatorOS.
 * Targets the development server on Port 3000.
 *
 * F4.5: no test touches a live backend. Two webServers are started before the
 * specs run:
 *   1. The Firebase Emulator Suite (Auth on :9099, Firestore on :8080, UI on
 *      :4400) for the demo-only project `demo-creatoros`. e2e/global-setup.ts
 *      seeds a test user into the Auth emulator.
 *   2. The dev server, launched with the emulator host env vars. vite.config.ts
 *      inlines them into the browser bundle so src/firebase.ts connects to the
 *      local emulators instead of the production Firebase project.
 * Every /api/* route is mocked in the specs (page.route) — see
 * e2e/smoke_tests.spec.ts for the pattern.
 */
const EMULATOR_PROJECT_ID = 'demo-creatoros';
const FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';
const FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';

export default defineConfig({
  testDir: './e2e',
  // Generous per-test ceiling: on a cold dev server the first spec eats the
  // on-demand vite compile of the whole module graph.
  timeout: 90_000,
  // Lazy chunks (Login, ContentStudio, ...) are compiled by the dev server on
  // first request; on a cold run that can take tens of seconds after the
  // page's load event has already fired.
  expect: { timeout: 30_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'html',
  globalSetup: './e2e/global-setup.ts',
  use: {
    baseURL: process.env.APP_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    /* Test on mobile viewports for iOS responsive validation */
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],
  webServer: [
    {
      // Requires Java (JDK 21+, firebase-tools requirement). In CI,
      // ubuntu-latest runners ship it; locally set JAVA_HOME if Java is not
      // on the PATH. Readiness is polled on the Auth emulator root (200).
      // 240s: the JVM's cold first boot can approach the old 120s ceiling on
      // slower Windows machines.
      command: `npx firebase emulators:start --project ${EMULATOR_PROJECT_ID} --only auth,firestore`,
      url: `http://${FIREBASE_AUTH_EMULATOR_HOST}/`,
      reuseExistingServer: !process.env.CI,
      timeout: 240 * 1000,
      stdout: 'pipe',
      env: {
        FIREBASE_AUTH_EMULATOR_HOST,
        FIRESTORE_EMULATOR_HOST,
      },
    },
    {
      command: 'npm run dev',
      url: 'http://localhost:3000',
      reuseExistingServer: !process.env.CI,
      timeout: 120 * 1000,
      env: {
        FIREBASE_AUTH_EMULATOR_HOST,
        FIRESTORE_EMULATOR_HOST,
        // Local dev has no gitignored .env in CI checkouts; without APP_URL the
        // server's same-origin CORS allowlist is empty and every real /api call
        // (e.g. Phase A /api/auth/revoke-all) is rejected with "Origin not
        // allowed". This mirrors a normal local dev boot.
        APP_URL: 'http://localhost:3000',
      },
    },
  ],
});
