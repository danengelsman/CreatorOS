import { defineConfig, devices } from '@playwright/test';

// IO is mocked in these specs; never start emulators, a server, or contact a backend.
export default defineConfig({
  testDir: './e2e',
  testMatch: ['authIsolation.spec.ts', 'authOperationsIsolation.spec.ts', 'onboardingPersistence.spec.ts'],
  timeout: 90_000,
  expect: { timeout: 15_000 },
  workers: 1,
  reporter: 'list',
  use: { ...devices['Desktop Chrome'] },
});
