#!/usr/bin/env node
/**
 * F0.4 — Artifact freshness gate.
 * Regenerates api/_server.js from server.ts and fails if the committed
 * artifact drifted (i.e. someone changed server.ts without rebuilding).
 */
import { execSync } from 'node:child_process';

execSync('npm run build:server', { stdio: 'inherit' });

let drift = '';
try {
  drift = execSync('git diff --exit-code -- api/_server.js', { encoding: 'utf8' });
} catch {
  console.error(
    '\n[check:artifact] STALE: api/_server.js does not match server.ts.\n' +
    'Run `npm run build:server` and commit the regenerated artifact.'
  );
  process.exit(1);
}
console.log('[check:artifact] api/_server.js is fresh. OK');
