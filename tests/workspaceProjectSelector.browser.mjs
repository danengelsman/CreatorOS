// Run offline: node tests/workspaceProjectSelector.browser.mjs
// Exercises the actual Zustand hook and React client renderer, not a mocked store.
/* global process, console, window, document */
import assert from 'node:assert/strict';
import path from 'node:path';
import { createRequire } from 'node:module';
import { build } from 'esbuild';
import { chromium } from '@playwright/test';

const require = createRequire(import.meta.url);
const bundle = await build({
  alias: { react: path.dirname(require.resolve('react/package.json')) },
  stdin: {
    contents: `
      import React from 'react';
      import { createRoot } from 'react-dom/client';
      import { selectProjects, useWorkspaceStore } from './src/store/workspaceStore';
      const state = () => useWorkspaceStore.getState();
      window.a = state().changeAccount('A');
      function View() {
        const projects = useWorkspaceStore(s => selectProjects(s, window.a));
        return React.createElement('div', { id: 'projects' }, projects.map(p => p.id).join(','));
      }
      window.store = useWorkspaceStore;
      createRoot(document.getElementById('root')).render(React.createElement(View));
    `,
    resolveDir: process.cwd(),
    loader: 'tsx',
  },
  bundle: true,
  write: false,
  format: 'iife',
  platform: 'browser',
});

const browser = await chromium.launch({ headless: true, timeout: 15000 });
try {
  const page = await browser.newPage();
  await page.route('**/*', (route) => route.abort());
  const failures = [];
  page.on('pageerror', (error) => failures.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') failures.push(message.text());
  });
  await page.setContent('<div id="root"></div>');
  await page.addScriptTag({ content: bundle.outputFiles[0].text });
  await page.waitForTimeout(250);
  assert.deepEqual(failures, [], 'React must not report unstable snapshots or render errors');
  await page.locator('#projects').waitFor({ state: 'attached' });
  assert.equal(await page.locator('#projects').textContent(), '');
  await page.evaluate(() => window.store.getState().setProjects(window.a, [{ id: 'A-project' }]));
  await page.waitForFunction(
    () => document.querySelector('#projects')?.textContent === 'A-project',
  );
  await page.evaluate(() => {
    window.store.getState().changeAccount('B');
    const a2 = window.store.getState().changeAccount('A');
    window.store.getState().setProjects(a2, [{ id: 'new-A-project' }]);
  });
  await page.waitForFunction(() => document.querySelector('#projects')?.textContent === '');
  await page.waitForTimeout(250);
  assert.deepEqual(failures, [], 'stale selector must remain stable and hide new account data');
  console.log('PASS real React/Zustand selector: unpopulated, owned, stale A→B→A');
} finally {
  await browser.close();
}
