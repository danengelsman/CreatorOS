/* global process, window, console */
// Local deterministic demonstration of the Firestore transaction commit boundary.
// Run: node tests/studioHubSwitchRace.browser.mjs
import { build } from 'esbuild';
import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';

const root = process.cwd();
const source = `
import { createProjectIfAbsent } from './src/components/studio/studioHubPersistence';
window.currentOwner = 'A';
window.start = () => createProjectIfAbsent({}, {id:'project'}, {userId:'A', type:'content'}, 'operation-A', () => window.currentOwner === 'A');
`;
const result = await build({
  stdin: { contents: source, resolveDir: root, sourcefile: 'race.ts', loader: 'ts' },
  bundle: true,
  write: false,
  format: 'iife',
  platform: 'browser',
  plugins: [
    {
      name: 'firestore-double',
      setup(build) {
        build.onResolve({ filter: /^firebase\/firestore$/ }, () => ({
          path: 'firestore',
          namespace: 'mock',
        }));
        build.onLoad({ filter: /.*/, namespace: 'mock' }, () => ({
          contents: `
export const serverTimestamp = () => 'timestamp';
export const runTransaction = async (_db, callback) => {
  let staged;
  await callback({get: async () => ({exists: () => false}), set: (_ref, data) => {staged = data;}});
  window.transactionStaged = true;
  await new Promise(resolve => {window.releaseCommit = resolve});
  window.committed = staged;
};`,
          loader: 'js',
        }));
      },
    },
  ],
});
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  await page.route('**/*', (route) => route.abort());
  await page.route('https://hub.test/**', (route) =>
    route.fulfill({ contentType: 'text/html', body: '<div id="root"></div>' }),
  );
  await page.goto('https://hub.test/');
  await page.addScriptTag({ content: result.outputFiles[0].text });
  await page.evaluate(() => {
    window.operation = window.start();
  });
  await page.waitForFunction(() => window.transactionStaged);
  await page.evaluate(() => {
    window.currentOwner = 'B';
    window.releaseCommit();
  });
  await page.evaluate(() => window.operation);
  const outcome = await page.evaluate(() => ({
    currentOwner: window.currentOwner,
    committedOwner: window.committed.userId,
  }));
  assert.deepEqual(outcome, { currentOwner: 'B', committedOwner: 'A' });
  console.log(
    'Transaction staged under A can commit after switching to B (deterministic Firestore double).',
  );
  await page.close();
} finally {
  await browser.close();
}
