// Offline real Calendar, ContentStudio parent, and StudioHub; deterministic I/O only.
/* global process, window, console, DataTransfer */
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
import ContentStudio from './src/components/ContentStudio';
import StudioHub from './src/components/studio/StudioHub';
import {auth} from './src/firebase';
window.requests=[]; window.writes=[];
window.records={};
for(const uid of ['a','b']) for(const [id,status,published,scheduledDate,autoPublish] of [
 ['draft','Production',false,null,true],
 ['past','Scheduled',false,new Date(2020,0,1),true],
 ['future','Scheduled',false,new Date(2030,0,1),true],
 ['recorded','Published',true,null,true],
 ['contradiction','Scheduled',true,null,true],
]) window.records[uid+'-'+id]={id:uid+'-'+id,userId:uid,type:'content',name:uid+'-'+id,status,published,scheduledDate,autoPublish,publishTime:'12:00',data:{body:'keep body',platform:'youtube'},unknown:{keep:1}};
function App(){const [uid,setUid]=useState('a');const [mode,setMode]=useState('content');const [,refresh]=useState(0);
 window.switchOwner=u=>{auth.currentUser={uid:u};setUid(u)};window.setMode=setMode;window.refresh=()=>refresh(n=>n+1);
 return mode==='hub'?<StudioHub user={{uid}} brand={{}} projects={Object.values(window.records)} isProjectsLoading={false} projectsLoadError={false} onOpenProject={()=>{}} isCurrentOwner={()=>auth.currentUser?.uid===uid}/>:<ContentStudio brand={{}} user={{uid}} setActiveTab={()=>{}}/>;
}
createRoot(document.getElementById('root')).render(<App/>);
`;
const mocks = {
  firebase: `export const db={}; export const auth={currentUser:{uid:'a'}}; export const serverTimestamp=()=>({stamp:true}); export const apiFetch=async()=>{throw Error('unexpected AI')}; export const authorizedFetch=async(url,options,owner)=>{window.requests.push({url,options,uid:owner?.uid}); if(url==='/api/accounts') return window.connected?[{platform:'youtube',profile:{name:'channel'}}]:[]; throw Error('Publishing from CreatorOS is not available. Publish directly on the destination platform instead.');};`,
  decorations: `import React from 'react';const Div=({initial,animate,exit,...props})=>React.createElement('div',props);export const motion={div:Div};export const AnimatePresence=({children})=>children;`,
  firestore: `export const collection=(_db,path)=>({path});export const query=(...args)=>args;export const where=(...args)=>args;export const orderBy=(...args)=>args;export const doc=(_db,path,id)=>({path,id});export const serverTimestamp=()=>({stamp:true});export class Timestamp{};
 export const getDocs=async(q)=>({docs:Object.values(window.records).filter(p=>p.userId===q[1][2]).map(p=>({id:p.id,data:()=>({...p,scheduledDate:p.scheduledDate?{toDate:()=>p.scheduledDate}:null})}))});
 export const getDocFromServer=async()=>{throw Error('unexpected editor read')};export const addDoc=async()=>{throw Error('unexpected create')};
 export const runTransaction=async(_db,fn)=>{const staged=[];await fn({get:async(ref)=>{if(window.delayRead) await new Promise(r=>window.releaseRead=r);return {exists:()=>ref.path==='projects'&&!!window.records[ref.id],data:()=>window.records[ref.id]};},set:(ref,value)=>staged.push({ref,value}),update:(ref,value)=>staged.push({ref,value})});if(window.failWrite)throw Error('offline');for(const w of staged){window.writes.push(w);if(w.ref.path==='projects')Object.assign(window.records[w.ref.id],w.value);}window.refresh();};`,
  gemini: 'export const scoreContent=async()=>({});',
  journey: 'export const recordJourneyEvent=async()=>{};',
  child: 'export default function Stub(){return null}',
};
const bundle = await build({
  stdin: {
    contents: source,
    resolveDir: root,
    sourcefile: 'publishing-harness.tsx',
    loader: 'tsx',
  },
  alias: { '@': root + '/src', react: dirname(require.resolve('react')) },
  bundle: true,
  write: false,
  platform: 'browser',
  format: 'iife',
  plugins: [
    {
      name: 'io-doubles',
      setup(b) {
        b.onResolve({ filter: /^motion\/react$/ }, () => ({
          path: 'decorations',
          namespace: 'mock',
        }));
        b.onResolve({ filter: /^firebase\/firestore$/ }, () => ({
          path: 'firestore',
          namespace: 'mock',
        }));
        b.onResolve({ filter: /(^|\/)firebase$/ }, (a) =>
          a.path.startsWith('.') ? { path: 'firebase', namespace: 'mock' } : null,
        );
        b.onResolve({ filter: /services\/gemini$/ }, () => ({ path: 'gemini', namespace: 'mock' }));
        b.onResolve({ filter: /services\/creatorJourney$/ }, () => ({
          path: 'journey',
          namespace: 'mock',
        }));
        b.onResolve(
          {
            filter:
              /\/(VideoStudio|CustomVideoPlayer|ScenePlanner|RetentionHookLab|ContentRepurposer|AIToolPanel|ContentIdeaGenerator|ViralTemplatesLibrary|Confetti|ContentEditorView)$/,
          },
          () => ({ path: 'child', namespace: 'mock' }),
        );
        b.onLoad({ filter: /.*/, namespace: 'mock' }, (a) => ({
          contents: mocks[a.path],
          loader: 'jsx',
          resolveDir: root,
        }));
      },
    },
  ],
});
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  page.setDefaultTimeout(5000);
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.route('**/*', (r) => r.abort());
  await page.route('https://publishing.test/**', (r) =>
    r.fulfill({ contentType: 'text/html', body: '<div id="root"></div>' }),
  );
  const reset = async (connected = true) => {
    await page.goto('https://publishing.test/');
    await page.evaluate((c) => (window.connected = c), connected);
    await page.addScriptTag({ content: bundle.outputFiles[0].text });
  };
  const calendar = async () => {
    await page.getByRole('button', { name: 'Calendar', exact: true }).click();
    await page.getByText('a-recorded', { exact: true }).waitFor();
  };
  const open = async (name) => {
    await page.getByText(name, { exact: true }).first().click();
    await expect(
      page.getByText('Publishing from CreatorOS is not available.', { exact: false }),
    ).toBeVisible();
  };
  const noPublishing = async () => {
    assert.equal(
      await page.evaluate(() => window.requests.filter((r) => r.url === '/api/publish').length),
      0,
    );
    assert.equal(
      await page.evaluate(() => window.writes.filter((w) => w.value.status === 'Published').length),
      0,
    );
  };
  for (const connected of [true, false]) {
    await reset(connected);
    await calendar();
    await open('a-recorded');
    await expect(page.getByText(/Recorded Published.*not verified/)).toBeVisible();
    await expect(page.getByText(/Saved auto-publish flag.*does not run/)).toBeVisible();
    assert.equal(
      await page.evaluate(() => window.writes.length),
      0,
      'opening historical records must not migrate them',
    );
    await page.getByRole('button', { name: 'Close', exact: true }).click();
    await open('a-draft');
    await expect(
      page.getByRole('button', { name: /Sync to Platforms|Synchronizing|Publishing unavailable/ }),
    ).toHaveCount(0);
    await page.getByRole('button', { name: 'AI Ideas', exact: true }).click();
    await calendar();
    await open('a-recorded');
    await page.evaluate(() => window.switchOwner('b'));
    await expect(page.locator('h3').filter({ hasText: 'a-recorded' })).toHaveCount(0);
    await page.evaluate(() => window.switchOwner('a'));
    await page.getByText('a-recorded', { exact: true }).first().waitFor();
    await page.getByRole('button', { name: 'AI Ideas', exact: true }).click();
    await calendar();
    await open('a-recorded');
    await noPublishing();
    assert.equal(await page.evaluate(() => window.writes.length), 0);
  }
  console.log(
    'PASS unavailable flow, connected/disconnected, parent remount and A-B-A: no publish request or Published write',
  );
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  for (const [id, year] of [
    ['past', 2020],
    ['future', 2030],
  ]) {
    await page.clock.setFixedTime(new Date(year, 0, 1, 12));
    await reset();
    await calendar();
    await open('a-' + id);
    await expect(page.getByText(/Recorded Published/)).toHaveCount(0);
    await expect(
      page.getByText(/went live automatically|Successfully Auto-Published|Linked to Auto-Publish/),
    ).toHaveCount(0);
    assert.equal(await page.evaluate(() => window.writes.length), 0);
    await page.getByRole('button', { name: 'Close', exact: true }).click();
  }
  console.log('PASS actual past/future calendar plans never become Published');
  await reset();
  await calendar();
  const targetDay = page
    .locator('div.cursor-pointer.group')
    .filter({ has: page.locator('span').filter({ hasText: /^10$/ }) });
  const transfer = await page.evaluateHandle(() => {
    const transfer = new DataTransfer();
    transfer.setData('blockId', 'a-draft');
    return transfer;
  });
  await targetDay.dispatchEvent('drop', { dataTransfer: transfer });
  await expect(page.getByRole('heading', { name: 'Plan Content' })).toBeVisible();
  await page.getByRole('button', { name: 'Schedule', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Plan Content' })).toHaveCount(0);
  const planned = await page.evaluate(() => ({
    record: window.records['a-draft'],
    write: window.writes.find((w) => w.ref.path === 'projects'),
  }));
  assert.equal(planned.record.status, 'Production');
  assert.equal(planned.record.autoPublish, true);
  assert.equal(planned.record.data.body, 'keep body');
  assert.deepEqual(planned.record.unknown, { keep: 1 });
  assert.deepEqual(Object.keys(planned.write.value).sort(), [
    'publishTime',
    'scheduledDate',
    'updatedAt',
  ]);
  await open('a-contradiction');
  page.once('dialog', async (d) => {
    assert.match(d.message(), /recorded status and published flag stay unchanged/);
    await d.dismiss();
  });
  await page.getByRole('button', { name: 'Clear scheduling' }).click();
  assert.equal(
    await page.evaluate(() => window.writes.filter((w) => w.ref.path === 'projects').length),
    1,
  );
  page.once('dialog', (d) => d.accept());
  await page.getByRole('button', { name: 'Clear scheduling' }).click();
  await expect(page.getByRole('button', { name: 'Close', exact: true })).toHaveCount(0);
  const cleared = await page.evaluate(() => window.records['a-contradiction']);
  assert.equal(cleared.status, 'Scheduled');
  assert.equal(cleared.published, true);
  assert.equal(cleared.autoPublish, false);
  assert.equal(cleared.data.body, 'keep body');
  await noPublishing();
  console.log(
    'PASS actual drag planning and confirmed Calendar clearing preserve unrelated/contradictory records',
  );
  await reset();
  await calendar();
  await open('a-recorded');
  await page.evaluate(() => (window.failWrite = true));
  page.once('dialog', (d) => d.accept());
  await page.getByRole('button', { name: 'Correct recorded publication' }).click();
  await expect(page.getByRole('alert')).toContainText('offline');
  assert.equal(await page.evaluate(() => window.records['a-recorded'].status), 'Published');
  assert.equal(await page.evaluate(() => window.writes.length), 0);
  await page.evaluate(() => {
    window.failWrite = false;
    window.delayRead = true;
  });
  page.once('dialog', (d) => d.accept());
  await page.getByRole('button', { name: 'Correct recorded publication' }).click();
  await page.waitForFunction(() => !!window.releaseRead);
  await page.evaluate(() => window.switchOwner('b'));
  await page.getByText('b-recorded', { exact: true }).first().waitFor();
  await page.evaluate(() => {
    window.delayRead = false;
    window.releaseRead();
  });
  await page.waitForTimeout(50);
  assert.equal(
    await page.evaluate(() => window.writes.length),
    0,
    'owner switch during transaction read prevents staging writes',
  );
  console.log(
    'PASS correction failure and delayed account-switch read retain record without writes',
  );
  await reset();
  await page.evaluate(() => window.setMode('hub'));
  const recorded = page
    .locator('li')
    .filter({ has: page.getByRole('button', { name: 'a-recorded', exact: true }) });
  await expect(recorded.getByText(/Recorded Published.*not verified/)).toBeVisible();
  const correct = recorded.getByRole('button', {
    name: 'Correct recorded publication',
    exact: true,
  });
  page.once('dialog', (d) => d.dismiss());
  await correct.click();
  assert.equal(await page.evaluate(() => window.writes.length), 0);
  page.once('dialog', (d) => d.accept());
  await correct.click();
  await expect(correct).toHaveCount(0);
  const corrected = await page.evaluate(() => window.records['a-recorded']);
  assert.equal(corrected.status, 'Draft');
  assert.equal(corrected.published, false);
  assert.equal(corrected.autoPublish, true);
  assert.equal(corrected.data.body, 'keep body');
  assert.deepEqual(corrected.unknown, { keep: 1 });
  const contradiction = page
    .locator('li')
    .filter({ has: page.getByRole('button', { name: 'a-contradiction', exact: true }) });
  page.once('dialog', (d) => d.accept());
  await contradiction.getByRole('button', { name: 'Correct recorded publication' }).click();
  await expect(contradiction.getByRole('button', { name: 'Clear scheduling' })).toBeVisible();
  page.once('dialog', async (d) => {
    assert.match(d.message(), /Scheduled.*Draft/);
    assert.match(d.message(), /auto-publish/);
    await d.dismiss();
  });
  await contradiction.getByRole('button', { name: 'Clear scheduling' }).click();
  assert.equal(await page.evaluate(() => window.records['a-contradiction'].autoPublish), true);
  page.once('dialog', (d) => d.accept());
  await contradiction.getByRole('button', { name: 'Clear scheduling' }).click();
  await expect(contradiction.getByRole('button', { name: 'Clear scheduling' })).toHaveCount(0);
  assert.equal(await page.evaluate(() => window.records['a-contradiction'].status), 'Draft');
  console.log(
    'PASS Studio explicit correction and clear-scheduling confirmation preserve content/unknown fields',
  );
  await noPublishing();
  assert.deepEqual(errors, []);
  console.log(
    'Publishing honesty browser regressions passed (offline real components, not provider/rules evidence).',
  );
} finally {
  await browser.close();
}
