import { defineConfig } from 'vitest/config';

// F4.4 — Unit test runner (Vitest). Services-layer focus per D5-A.
// Kept separate from vite.config.ts (browser build) so the Playwright e2e
// specs in e2e/ are never picked up — those are wired separately in F4.5.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    // tests/serverAuth boots the real Express app (heavy server.ts import)
    // while other files run in parallel — give hooks headroom over the default 10s.
    hookTimeout: 30_000,
    testTimeout: 30_000,
  },
});
