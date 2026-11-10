// Run offline: node tests/calendarSyncLifecycle.browser.mjs
// Real CalendarView/detail/sync and owner fence; deterministic I/O doubles, all network blocked.
/* global process, window, document, console */
import { build } from 'esbuild';
import { chromium, expect } from '@playwright/test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { dirname } from 'node:path';

const root = process.cwd();
const require = createRequire(import.meta.url);
const source = `
import React, {useState} from 'react';
import {createRoot} from 'react-dom/client';
import CalendarView from './src/components/CalendarView';
import {auth} from './src/firebase';
window.requests=[]; window.writes=[]; window.pending=[];
function App(){const [uid,setUid]=useState('a'); window.switchOwner=(u)=>{auth.currentUser={uid:u};setUid(u)}; return <CalendarView user={{uid}} setActiveTab={()=>{}}/>}
createRoot(document.getElementById('root')).render(<App/>);
`;
const mocks = {
  firebase: `export const db={}; export const auth={currentUser:{uid:'a'}}; export const serverTimestamp=()=>({stamp:true}); export const apiFetch=async()=>{throw Error('unexpected')}; export const authorizedFetch=(url,options,owner)=>{if(url==='/api/accounts') return Promise.resolve([{platform:'youtube',profile:{name:auth.currentUser.uid+'-channel'}}]); if(url!=='/api/publish') throw Error('unexpected API'); window.requests.push({url,options,uid:owner.uid}); return new Promise((resolve,reject)=>window.pending.push({resolve,reject}));};`,
  decorations: `import React from 'react'; const Div=({initial,animate,exit,...props})=>React.createElement('div',props); export const motion={div:Div}; export const AnimatePresence=({children})=>children;`,
  icons: `export const AlertCircle=()=>null,Calendar=()=>null,Check=()=>null,CheckCircle=()=>null,ChevronLeft=()=>null,ChevronRight=()=>null,Clock=()=>null,CloudUpload=()=>null,ExternalLink=()=>null,Flame=()=>null,Instagram=()=>null,Plus=()=>null,RefreshCw=()=>null,Search=()=>null,Smartphone=()=>null,Sparkles=()=>null,Trash2=()=>null,Twitter=()=>null,Video=()=>null,X=()=>null,Youtube=()=>null;`,
  firestore: `export const collection=(_db,path)=>({path}); export const query=(...args)=>args; export const where=(...args)=>args; export const getDocs=async(q)=>{let uid=q[1][2]; return {docs:['one','two'].map(id=>({id,data:()=>({userId:uid,type:'content',name:uid+'-'+id,data:{body:'body',platform:'youtube'},status:'Draft'})}))}}; export const doc=(_db,path,id)=>({path,id}); export const serverTimestamp=()=>({stamp:true}); export const addDoc=async()=>{throw Error('unexpected')}; export class Timestamp {} export const runTransaction=async(_db,fn)=>fn({get:async(ref)=>({exists:()=>ref.path==='projects'||window.badJourney,data:()=>ref.path==='projects'?({userId:window.requests.at(-1).uid,type:'content'}):({})}),set:(ref,value)=>window.writes.push({ref,value}),update:(ref,value)=>window.writes.push({ref,value})});`,
};
const bundle = await build({
  stdin: { contents: source, resolveDir: root, sourcefile: 'sync-harness.tsx', loader: 'tsx' },
  alias: { '@': root + '/src', react: dirname(require.resolve('react')) },
  bundle: true,
  write: false,
  platform: 'browser',
  format: 'iife',
  plugins: [
    {
      name: 'doubles',
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
        b.onResolve({ filter: /(^|\/)firebase$/ }, (a) =>
          a.path.startsWith('.') ? { path: 'firebase', namespace: 'mock' } : null,
        );
        b.onLoad({ filter: /.*/, namespace: 'mock' }, (a) => ({
          contents: mocks[a.path],
          loader: 'js',
        }));
      },
    },
  ],
});
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  page.setDefaultTimeout(3500);
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.route('**/*', (r) => r.abort());
  await page.route('https://calendar.test/**', (r) =>
    r.fulfill({ contentType: 'text/html', body: '<div id="root"></div>' }),
  );
  const reset = async () => {
    await page.goto('https://calendar.test/');
    await page.addScriptTag({ content: bundle.outputFiles[0].text });
    await page.getByText('a-one', { exact: true }).waitFor();
  };
  const open = async (name) => {
    await page.getByText(name, { exact: true }).first().click();
    await page.getByText('Push and Sync to Connected Social Networks').waitFor();
  };
  const close = () => page.getByRole('button', { name: 'Close', exact: true }).click();
  const count = () => page.evaluate(() => window.requests.length);
  for (const outcome of ['success', 'error']) {
    await reset();
    await open('a-one');
    await page.getByRole('button', { name: 'Sync to Platforms (1)' }).click();
    assert.equal(await count(), 1);
    await close();
    await open('a-one');
    await expect(
      page.getByRole('button', { name: 'Synchronizing across platforms...' }),
    ).toBeDisabled();
    await page
      .getByRole('button', { name: 'Synchronizing across platforms...' })
      .evaluate((button) => button.click());
    assert.equal(await count(), 1, 'close/reopen must not permit a second provider request');
    await close();
    if (outcome === 'success')
      await page.evaluate(() =>
        window.pending[0].resolve({ success: true, results: { youtube: { status: 'success' } } }),
      );
    else await page.evaluate(() => window.pending[0].reject(new Error('offline')));
    await page.waitForFunction(
      () => !document.body.textContent.includes('Synchronizing across platforms...'),
    );
    await open('a-one');
    if (outcome === 'success') {
      await expect(page.getByText('Live Sync Success')).toBeVisible();
      await expect
        .poll(() =>
          page.evaluate(() => window.writes.filter((w) => w.ref.path === 'projects').length),
        )
        .toBe(1);
    } else
      await expect(
        page
          .locator('.text-red-500')
          .filter({ hasText: /something|try again|wrong/i })
          .first(),
      ).toBeVisible();
    await close();
    await open('a-one');
    if (outcome === 'success') await expect(page.getByText('Live Sync Success')).toBeVisible();
    else
      await expect(
        page
          .locator('.text-red-500')
          .filter({ hasText: /something|try again|wrong/i })
          .first(),
      ).toBeVisible();
    console.log('PASS close/reopen pending and ' + outcome);
  }
  await reset();
  await open('a-one');
  await page.getByRole('button', { name: 'Sync to Platforms (1)' }).click();
  await close();
  await page.evaluate(() => {
    window.badJourney = true;
    window.pending[0].resolve({ success: true, results: { youtube: { status: 'success' } } });
  });
  await page.waitForFunction(
    () => !document.body.textContent.includes('Synchronizing across platforms...'),
  );
  await open('a-one');
  await expect(page.getByText('Live Sync Success')).toBeVisible();
  await expect(page.getByText(/Publishing may already have succeeded/)).toBeVisible();
  assert.equal(await page.evaluate(() => window.writes.length), 0);
  assert.equal(await count(), 1);
  console.log('PASS fenced transaction failure remains visible after close');
  await reset();
  await open('a-one');
  await page.getByRole('button', { name: 'Sync to Platforms (1)' }).click();
  await close();
  await open('a-two');
  await expect(page.getByText('Live Sync Success')).toHaveCount(0);
  await page.evaluate(() =>
    window.pending[0].resolve({ success: true, results: { youtube: { status: 'success' } } }),
  );
  await expect
    .poll(() => page.evaluate(() => window.writes.filter((w) => w.ref.path === 'projects').length))
    .toBe(1);
  await expect(page.getByText('Live Sync Success')).toHaveCount(0);
  await close();
  await open('a-one');
  await expect(page.getByText('Live Sync Success')).toBeVisible();
  console.log('PASS outcome bound to originating item');
  await reset();
  await open('a-one');
  await page.getByRole('button', { name: 'Sync to Platforms (1)' }).click();
  await close();
  await page.evaluate(() => window.switchOwner('b'));
  await page.getByText('b-one', { exact: true }).waitFor();
  await open('b-one');
  await expect(page.getByText('@a-channel')).toHaveCount(0);
  await expect(page.getByText('Live Sync Success')).toHaveCount(0);
  await page.evaluate(() =>
    window.pending[0].resolve({ success: true, results: { youtube: { status: 'success' } } }),
  );
  await page.waitForTimeout(100);
  assert.equal(
    await page.evaluate(() => window.writes.length),
    0,
    'stale owner must not start transaction',
  );
  await expect(page.getByText('Live Sync Success')).toHaveCount(0);
  console.log('PASS account switch isolates outcome and transaction');
  await reset();
  await open('a-one');
  await page.getByRole('button', { name: 'Sync to Platforms (1)' }).click();
  await page.evaluate(() => window.switchOwner('b'));
  await page.getByText('b-one', { exact: true }).waitFor();
  assert.equal(
    await page.locator('h3').filter({ hasText: 'a-one' }).count(),
    0,
    'old detail is removed from the DOM',
  );
  await page.evaluate(() => window.switchOwner('a'));
  await page.getByText('Push and Sync to Connected Social Networks').waitFor();
  await expect(
    page.getByRole('button', { name: 'Synchronizing across platforms...' }),
  ).toBeDisabled();
  await page.evaluate(() =>
    window.pending[0].resolve({ success: true, results: { youtube: { status: 'success' } } }),
  );
  await page.waitForFunction(
    () => !document.body.textContent.includes('Synchronizing across platforms...'),
  );
  assert.equal(
    await page.evaluate(() => window.writes.length),
    0,
    'A-B-A must invalidate the old transaction',
  );
  await expect(page.getByText('Live Sync Success')).toHaveCount(0);
  assert.equal(await count(), 1);
  console.log('PASS A-B-A invalidates the old lifecycle');
  assert.deepEqual(errors, []);
  console.log('Calendar sync lifecycle regressions passed (offline deterministic doubles).');
} finally {
  await browser.close();
}
