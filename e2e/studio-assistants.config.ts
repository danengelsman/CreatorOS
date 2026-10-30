import { defineConfig, devices } from '@playwright/test';

// Standalone component harness: no production routing or Firebase services required.
export default defineConfig({
  testDir: '.',
  testMatch: 'studio-assistants.spec.ts',
  timeout: 120_000,
  reporter: 'list',
  use: { baseURL: 'http://127.0.0.1:4179' },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['iPhone 12'], defaultBrowserType: 'chromium' } },
  ],
  webServer: {
    command: 'cd .. && node node_modules/vite/bin/vite.js --config e2e/studio-assistants.vite.config.ts --host 127.0.0.1 --port 4179 --strictPort',
    url: 'http://127.0.0.1:4179/e2e/fixtures/studio-assistants.html',
    reuseExistingServer: false,
    timeout: 240_000,
  },
});
