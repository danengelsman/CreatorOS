// Run offline: node tests/calendarEventCreation.browser.mjs
// Real CalendarView and panels; I/O and decorative motion/icons are deterministic doubles.
/* global process, window, console */
import { build } from 'esbuild';
import { chromium, expect } from '@playwright/test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { dirname } from 'node:path';

const root = process.cwd();
const require = createRequire(import.meta.url);
const source = `
import React from 'react';
import {createRoot} from 'react-dom/client';
import CalendarView from './src/components/CalendarView';
window.writes = [];
createRoot(document.getElementById('root')).render(<CalendarView user={{uid:'calendar-owner'}} setActiveTab={() => {}} />);
`;
const mocks = {
  firebase: `export const db={}; export const auth={currentUser:{uid:'calendar-owner'}}; export const serverTimestamp=()=>({serverTimestamp:true}); export const authorizedFetch=async()=>[]; export const apiFetch=async()=>{throw Error('Unexpected API call')};`,
  decorations: `import React from 'react'; const Div=({initial,animate,exit,...props})=>React.createElement('div',props); export const motion={div:Div}; export const AnimatePresence=({children})=>children;`,
  icons: `export const AlertCircle=()=>null,Calendar=()=>null,Check=()=>null,CheckCircle=()=>null,ChevronLeft=()=>null,ChevronRight=()=>null,Clock=()=>null,CloudUpload=()=>null,ExternalLink=()=>null,Flame=()=>null,Instagram=()=>null,Plus=()=>null,RefreshCw=()=>null,Search=()=>null,Smartphone=()=>null,Sparkles=()=>null,Trash2=()=>null,Twitter=()=>null,Video=()=>null,X=()=>null,Youtube=()=>null;`,
  firestore: `export const collection=(_db,path)=>({path}); export const query=(...args)=>args; export const where=(...args)=>args; export const getDocs=async()=>({docs:[]}); export const doc=(_db,path,id)=>({path,id}); export const serverTimestamp=()=>({serverTimestamp:true}); export const addDoc=async(ref,value)=>{window.writes.push({ref,value});return {id:'new-event'}}; export const runTransaction=async()=>{throw Error('Unexpected transaction')}; export class Timestamp {}`,
};
console.log('Building Calendar regression bundle');
const bundle = await build({
  stdin: {
    contents: source,
    resolveDir: root,
    sourcefile: 'calendar-event-harness.tsx',
    loader: 'tsx',
  },
  alias: { '@': root + '/src', react: dirname(require.resolve('react')) },
  bundle: true,
  write: false,
  platform: 'browser',
  format: 'iife',
  plugins: [
    {
      name: 'calendar-io-doubles',
      setup(b) {
        b.onResolve({ filter: /^motion\/react$/ }, () => ({
          path: 'decorations',
          namespace: 'mock',
        }));
        b.onResolve({ filter: /^lucide-react$/ }, () => ({ path: 'icons', namespace: 'mock' }));
        b.onResolve({ filter: /^firebase\/firestore$/ }, () => ({
          path: 'firestore',
          namespace: 'mock',
        }));
        b.onResolve({ filter: /(^|\/)firebase$/ }, (args) =>
          args.path.startsWith('.') ? { path: 'firebase', namespace: 'mock' } : null,
        );
        b.onLoad({ filter: /.*/, namespace: 'mock' }, (args) => ({
          contents: mocks[args.path],
          loader: 'js',
        }));
      },
    },
  ],
});
console.log('Launching Calendar regression browser');
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  page.setDefaultTimeout(5000);
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.route('**/*', (route) => route.abort());
  await page.route('https://calendar.test/**', (route) =>
    route.fulfill({ contentType: 'text/html', body: '<div id="root"></div>' }),
  );
  await page.clock.setFixedTime(new Date(2026, 10, 7, 12));
  const title = page.getByPlaceholder('e.g. 5 AI tools that will save you 10 hours');
  const body = page.getByPlaceholder('Draft the narrative script, outline, or captions here...');
  const confirm = page.getByRole('button', { name: 'Confirm & Add', exact: true });
  const dayCell = (day) =>
    page.locator('div.cursor-pointer.group').filter({
      has: page.locator('span').filter({ hasText: new RegExp(`^${day}$`) }),
    });
  const failures = [];
  for (const reopen of ['different day', 'same day', 'sidebar']) {
    await page.goto('https://calendar.test/');
    await page.addScriptTag({ content: bundle.outputFiles[0].text });
    await page.getByText('No unscheduled drafts.', { exact: true }).waitFor();
    await dayCell(7).click();
    await title.fill('Canceled title');
    await body.fill('Canceled body');
    await page.getByText('TikTok', { exact: true }).click();
    await page.getByText('Scheduled', { exact: true }).click();
    await page.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(title).toHaveCount(0);
    assert.deepEqual(
      await page.evaluate(() => JSON.parse(JSON.stringify(window.writes))),
      [],
      'Cancel must not write',
    );
    if (reopen === 'sidebar') {
      await page.getByRole('button', { name: 'Add Unscheduled Block' }).click();
    } else {
      await dayCell(reopen === 'different day' ? 8 : 7).click();
    }
    await title.waitFor();
    try {
      await expect(title).toHaveValue('');
      await expect(body).toHaveValue('');
      await expect(confirm).toBeDisabled();
      console.log(`PASS cleared canceled content: ${reopen}`);
    } catch (error) {
      failures.push(`${reopen}: ${error.message}`);
      console.error(
        `FAIL cleared canceled content: ${reopen}: title=${await title.inputValue()}, body=${await body.inputValue()}`,
      );
    }
    // The reset must not reset platform/status preferences or change the saved payload.
    await title.fill('Fresh title');
    await body.fill('Fresh body');
    await confirm.click();
    await expect(title).toHaveCount(0);
    const writes = await page.evaluate(() => JSON.parse(JSON.stringify(window.writes)));
    assert.equal(writes.length, 1);
    const day = reopen === 'different day' ? 8 : 7;
    assert.deepEqual(writes[0], {
      ref: { path: 'projects' },
      value: {
        userId: 'calendar-owner',
        name: 'Fresh title',
        type: 'content',
        scheduledDate: new Date(2026, 10, day, reopen === 'sidebar' ? 12 : 0).toISOString(),
        status: 'Scheduled',
        autoPublish: true,
        publishTime: '12:00',
        data: { title: 'Fresh title', body: 'Fresh body', platform: 'tiktok' },
        createdAt: { serverTimestamp: true },
        updatedAt: { serverTimestamp: true },
      },
    });
    console.log(`PASS platform/status preference and exact scheduling payload: ${reopen}`);
  }
  assert.deepEqual(pageErrors, [], 'Browser must not report component errors');
  assert.deepEqual(failures, [], 'Canceled title/body must clear on every open');
  console.log(
    'Calendar cancel/reopen regressions passed (real components, Firestore double, network blocked).',
  );
} finally {
  await browser.close();
}
