/* eslint-disable no-undef */
// Local only: demo Firestore emulator on loopback with copied repository rules.
// FIRESTORE_EMULATOR_HOST=127.0.0.1:18880 node tests/studioOwnerFence.browser.mjs
// Actual React components, persistence and browser SDK. Initialization, unrelated
// UI/AI and publishing API are substituted; no external platform publishes.
// Swap the emulator-only token provider AFTER the application callback returns.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { build } from 'esbuild';
import { chromium } from '@playwright/test';
const project = 'demo-owner-fence';
const host = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:18880';
assert.match(host, /^127\.0\.0\.1:\d+$/);
const port = Number(host.split(':')[1]);
const root = `http://${host}/v1/projects/${project}/databases/(default)/documents`;
const string = (stringValue) => ({ stringValue });
const stamp = { timestampValue: '2025-01-01T00:00:00Z' };
const admin = { Authorization: 'Bearer owner', 'Content-Type': 'application/json' };
const patch = async (path, fields) => {
  const r = await fetch(`${root}/${path}`, {
    method: 'PATCH',
    headers: admin,
    body: JSON.stringify({ fields }),
  });
  assert.equal(r.status, 200, await r.text());
};
const read = async (path) => {
  const r = await fetch(`${root}/${path}`, { headers: admin });
  if (r.status === 404) return null;
  assert.equal(r.status, 200);
  return (await r.json()).fields;
};
const validJourney = () => ({
  uid: string('alice'),
  version: { integerValue: '1' },
  currentStep: string('small_offer'),
  status: string('completed'),
  answers: { mapValue: { fields: { direction: string('Keep my answer') } } },
  completedSteps: {
    arrayValue: { values: [string('direction'), string('person'), string('small_offer')] },
  },
  createdAt: stamp,
  updatedAt: stamp,
});
const seed = async (mode = 'valid', kind = '') => {
  await patch('projects/browser-p', {
    userId: string('alice'),
    name: string('Old'),
    type: string('content'),
    status: string(kind === 'unschedule' ? 'Scheduled' : 'Draft'),
    createdAt: stamp,
    unknown: string('keep-project-field'),
    data: {
      mapValue: {
        fields: {
          title: string('Old'),
          body: string('Original'),
          platform: string('youtube'),
          keep: string('keep-nested-field'),
        },
      },
    },
    ...(kind === 'unschedule'
      ? {
          scheduledDate: { timestampValue: '2027-01-01T00:00:00Z' },
          publishTime: string('12:00'),
          autoPublish: { booleanValue: true },
        }
      : {}),
  });
  if (mode === 'missing') {
    const r = await fetch(`${root}/first_dollar_journeys/alice`, {
      method: 'DELETE',
      headers: admin,
    });
    assert.equal(r.status, 200);
  } else
    await patch(
      'first_dollar_journeys/alice',
      mode === 'valid' ? validJourney() : { ...validJourney(), extra: string('preserve-legacy') },
    );
};
const client = `
import React from 'react';
import {createRoot} from 'react-dom/client';
import {doc,updateDoc,setDoc,getDocFromServer} from 'firebase/firestore';
import {db,asAlice,asBob,adminDb} from 'test-init';
import ContentStudio from './src/components/ContentStudio';
import CalendarView from './src/components/CalendarView';
import {updateStudioStage} from './src/components/studio/studioHubPersistence';
import {updateOwnedContentProject,deleteOwnedContentProject} from './src/components/studio/studioOwnerFence';
import {scheduleProject,unscheduleProject} from './src/components/calendar/calendarPersistence';
window.asAlice=asAlice;window.asBob=asBob;
window.unfencedAdminUpdate=()=>updateDoc(doc(adminDb,'projects','browser-p'),{name:'Admin changed'});
window.forbiddenJourneyUpdate=()=>updateDoc(doc(adminDb,'first_dollar_journeys','alice'),{status:'in_progress'});
window.forbiddenCreate=()=>setDoc(doc(adminDb,'projects','admin-create'),{userId:'alice',name:'No',type:'content',createdAt:new Date()});
window.run=kind=>{
 const ref=doc(db,'projects','browser-p');
 if(kind==='stage')return updateStudioStage(db,ref,'alice','production',()=>window.current);
 if(kind==='legacy-save')return updateOwnedContentProject(db,ref,'alice',{'data.body':'Saved by Alice'},()=>window.current);
 if(kind==='delete')return deleteOwnedContentProject(db,ref,'alice',()=>window.current);
 if(kind==='publish')return window.detail.onSyncToPlatforms();
 if(kind==='schedule')return scheduleProject(db,ref,'alice',{status:'Draft'},{scheduledDate:new Date('2027-01-01T00:00:00Z'),publishTime:'12:00',autoPublish:true});
 return unscheduleProject(db,ref,'alice',{scheduledDate:new Date('2027-01-01T00:00:00Z'),publishTime:'12:00',autoPublish:true});
};
const root=createRoot(document.getElementById('root'));
window.mount=async mode=>{
 const snap=await getDocFromServer(doc(db,'projects','browser-p'));const p={id:'browser-p',...snap.data()};window.event=p;
 root.render(mode==='calendar'?<CalendarView user={{uid:'alice'}} setActiveTab={()=>{}}/>:<ContentStudio brand={{personality:'warm'}} user={{uid:'alice'}} selectedProject={p} canvasMode={true} isCurrentOwner={()=>window.current} setActiveTab={()=>{}}/>);
};
window.ready=true;asAlice();`;
const init = `
import {initializeApp} from 'firebase/app';
import {getFirestore,connectFirestoreEmulator,serverTimestamp} from 'firebase/firestore';
export const db=getFirestore(initializeApp({projectId:'${project}',apiKey:'demo-key'},'alice'));
export const adminDb=getFirestore(initializeApp({projectId:'${project}',apiKey:'demo-key'},'bob'));
connectFirestoreEmulator(db,'127.0.0.1',${port},{mockUserToken:{sub:'alice'}});
connectFirestoreEmulator(adminDb,'127.0.0.1',${port},{mockUserToken:{sub:'bob',admin:true}});
const tokenA=db._authCredentials.token,tokenB=adminDb._authCredentials.token;
export const auth={currentUser:{uid:'alice'}};
export function asAlice(){db._authCredentials.token=tokenA;auth.currentUser={uid:'alice'};window.current=true}
export function asBob(){db._authCredentials.token=tokenB;auth.currentUser={uid:'bob'};window.current=false}
export {serverTimestamp};
export async function authorizedFetch(url,options,owner){
 if(url==='/api/accounts')return [];
 if(url!=='/api/publish')throw Error('Unexpected API');
 if(!owner||owner.uid!=='alice'||!owner.isCurrent())throw Error('Account changed');
 window.publishOwner=owner.uid;return {success:true,results:{youtube:{status:'success'}}};
}
export const apiFetch=async()=>{throw Error('Unexpected API')};`;
const wrapper = `import * as real from 'real-firestore';export * from 'real-firestore';
export const runTransaction=(db,fn,...rest)=>real.runTransaction(db,async tx=>{
 window.callbackCount=(window.callbackCount||0)+1;const result=await fn(tx);
 if(window.hold)await new Promise(resolve=>{window.releaseCommit=resolve});return result;
},...rest).catch(error=>{window.lastTransactionCode=error.code||error.message;throw error});`;
const mocks = {
  init,
  wrapper,
  gemini:
    'export const scoreContent=async()=>({});export const quickPolish=async x=>x;export const remixContent=async x=>x;export const generateContentIdeas=async()=>[];',
  journey: 'export const recordJourneyEvent=async()=>{};',
  child: 'import React from "react";export default function Stub(){return null}',
  CalendarGrid:
    'import React from "react";export default function Grid(p){window.grid=p;return null}',
  EventDetailModal:
    'import React from "react";export default function Detail(p){window.detail=p;return <div><p role="alert">{p.syncError}</p></div>}',
};
const bundle = await build({
  stdin: {
    contents: client,
    resolveDir: process.cwd(),
    sourcefile: 'studio-owner-browser.tsx',
    loader: 'tsx',
  },
  bundle: true,
  write: false,
  format: 'iife',
  platform: 'browser',
  plugins: [
    {
      name: 'pause-before-commit',
      setup(b) {
        b.onResolve({ filter: /^firebase\/firestore$/ }, (args) =>
          args.pluginData === 'real' ? null : { path: 'wrapper', namespace: 'mock' },
        );
        b.onResolve({ filter: /^real-firestore$/ }, () =>
          b.resolve('firebase/firestore', {
            kind: 'import-statement',
            resolveDir: process.cwd(),
            pluginData: 'real',
          }),
        );
        b.onResolve({ filter: /^test-init$|firebase$/ }, (args) =>
          args.path === 'test-init' || args.path.startsWith('.')
            ? { path: 'init', namespace: 'mock' }
            : null,
        );
        b.onResolve({ filter: /services\/gemini$/ }, () => ({ path: 'gemini', namespace: 'mock' }));
        b.onResolve({ filter: /services\/creatorJourney$/ }, () => ({
          path: 'journey',
          namespace: 'mock',
        }));
        b.onResolve(
          {
            filter:
              /\/(VideoStudio|CustomVideoPlayer|ScenePlanner|RetentionHookLab|ContentRepurposer|AIToolPanel|ContentIdeaGenerator|ViralTemplatesLibrary|Confetti|UnscheduledSidebar|CalendarHeader|AutoPublishModal|NewEventModal)$/,
          },
          () => ({ path: 'child', namespace: 'mock' }),
        );
        b.onResolve({ filter: /\/(CalendarGrid|EventDetailModal)$/ }, (args) => ({
          path: args.path.split('/').pop(),
          namespace: 'mock',
        }));
        b.onLoad({ filter: /.*/, namespace: 'mock' }, (args) => ({
          contents: mocks[args.path],
          loader: 'jsx',
          resolveDir: process.cwd(),
        }));
      },
    },
  ],
});
const server = createServer((req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.end('<!doctype html><div id="root"></div>');
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const browser = await chromium.launch({ headless: true });
let cases = 0;
const fresh = async () => {
  const page = await browser.newPage();
  page.setDefaultTimeout(15000);
  await page.route('**/*', (route) =>
    new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort(),
  );
  await page.goto(`http://127.0.0.1:${server.address().port}/`);
  await page.addScriptTag({ content: bundle.outputFiles[0].text });
  await page.waitForFunction(() => window.ready);
  return page;
};
const start = (page, kind, hold = false) =>
  page.evaluate(
    ({ kind, hold }) => {
      window.hold = hold;
      window.finished = null;
      window.lastTransactionCode = null;
      window.run(kind).then(
        () => (window.finished = 'allowed'),
        (e) => (window.finished = e.code || e.message),
      );
    },
    { kind, hold },
  );
const finish = async (page) => {
  await page.waitForFunction(() => window.finished !== null);
  return page.evaluate(() => window.finished);
};
const swapAndRelease = async (page) => {
  await page.waitForFunction(() => typeof window.releaseCommit === 'function');
  await page.evaluate(() => {
    window.asBob();
    window.hold = false;
    window.releaseCommit();
    window.releaseCommit = null;
  });
};
const pristine = (j) => {
  assert.equal(j.uid.stringValue, 'alice');
  assert.equal(j.status.stringValue, 'not_started');
  assert.equal(j.currentStep.stringValue, 'direction');
  assert.deepEqual(j.answers.mapValue.fields || {}, {});
  assert.deepEqual(j.completedSteps.arrayValue.values || [], []);
  assert.ok(j.createdAt.timestampValue);
  assert.ok(j.updatedAt.timestampValue);
  assert.equal(Object.keys(j).length, 8);
};
try {
  await seed();
  const page = await fresh();
  await page.evaluate(() => window.unfencedAdminUpdate());
  assert.equal((await read('projects/browser-p')).name.stringValue, 'Admin changed');
  for (const fn of ['forbiddenJourneyUpdate', 'forbiddenCreate']) {
    const code = await page.evaluate(async (fn) => {
      try {
        await window[fn]();
        return 'allowed';
      } catch (e) {
        return e.code;
      }
    }, fn);
    assert.equal(code, 'permission-denied');
    cases++;
  }
  for (const mode of ['valid', 'missing'])
    for (const kind of ['stage', 'schedule', 'unschedule', 'legacy-save', 'delete']) {
      await seed(mode, kind);
      const before = await read('projects/browser-p'),
        journey = await read('first_dollar_journeys/alice');
      await page.evaluate(() => window.asAlice());
      await start(page, kind, true);
      await swapAndRelease(page);
      assert.equal(await finish(page), 'permission-denied', `${mode}/${kind}: admin B denied`);
      assert.deepEqual(await read('projects/browser-p'), before);
      assert.deepEqual(await read('first_dollar_journeys/alice'), journey);
      cases++;
      await page.evaluate(() => window.asAlice());
      await start(page, kind);
      assert.equal(await finish(page), 'allowed', `${mode}/${kind}: Alice allowed`);
      const saved = await read('projects/browser-p');
      if (kind === 'delete') assert.equal(saved, null);
      else {
        assert.equal(saved.unknown.stringValue, 'keep-project-field');
        assert.equal(saved.data.mapValue.fields.keep.stringValue, 'keep-nested-field');
        if (kind === 'stage') assert.equal(saved.studioStage.stringValue, 'production');
        if (kind === 'schedule') assert.equal(saved.status.stringValue, 'Scheduled');
        if (kind === 'unschedule') assert.equal(saved.scheduledDate.nullValue, null);
        if (kind === 'legacy-save')
          assert.equal(saved.data.mapValue.fields.body.stringValue, 'Saved by Alice');
      }
      const j = await read('first_dollar_journeys/alice');
      if (mode === 'missing') pristine(j);
      else assert.deepEqual(j, journey);
      cases++;
    }
  for (const kind of ['stage', 'schedule', 'unschedule', 'legacy-save', 'delete']) {
    await seed('malformed', kind);
    const p = await read('projects/browser-p'),
      j = await read('first_dollar_journeys/alice');
    await page.evaluate(() => window.asAlice());
    await start(page, kind);
    assert.match(await finish(page), /contact support/);
    assert.deepEqual(await read('projects/browser-p'), p);
    assert.deepEqual(await read('first_dollar_journeys/alice'), j);
    cases++;
  }
  await seed('missing');
  await page.evaluate(() => {
    window.asAlice();
    window.callbackCount = 0;
  });
  await start(page, 'stage', true);
  await page.waitForFunction(() => typeof window.releaseCommit === 'function');
  await patch('first_dollar_journeys/alice', validJourney());
  await page.evaluate(() => {
    window.hold = false;
    window.releaseCommit();
    window.releaseCommit = null;
  });
  assert.equal(await finish(page), 'allowed');
  assert.ok(await page.evaluate(() => window.callbackCount >= 2));
  assert.deepEqual(await read('first_dollar_journeys/alice'), validJourney());
  cases++;
  await page.close();
  for (const mode of ['valid', 'missing', 'malformed']) {
    await seed(mode);
    const before = await read('projects/browser-p'),
      j = await read('first_dollar_journeys/alice'),
      editor = await fresh();
    await editor.evaluate(() => window.mount('canvas'));
    await editor.getByLabel('Project script').fill('Keep this owner draft');
    await editor.evaluate((mode) => {
      window.hold = mode !== 'malformed';
    }, mode);
    await editor.getByRole('button', { name: 'Save', exact: true }).click();
    if (mode !== 'malformed') {
      await swapAndRelease(editor);
      await editor.waitForFunction(() => window.lastTransactionCode === 'permission-denied');
    } else await editor.getByRole('alert').filter({ hasText: 'contact support' }).waitFor();
    assert.equal(await editor.getByLabel('Project script').inputValue(), 'Keep this owner draft');
    assert.ok(await editor.evaluate(() => sessionStorage.getItem('studio-draft:alice:browser-p')));
    assert.deepEqual(await read('projects/browser-p'), before);
    assert.deepEqual(await read('first_dollar_journeys/alice'), j);
    if (mode === 'malformed')
      assert.match(
        await editor.getByRole('alert').filter({ hasText: 'contact support' }).innerText(),
        /contact support/,
      );
    else assert.equal(await editor.evaluate(() => window.lastTransactionCode), 'permission-denied');
    cases++;
    await editor.close();
  }
  await seed('missing');
  const editor = await fresh();
  await editor.evaluate(() => window.mount('canvas'));
  await editor.getByLabel('Project script').fill('Ordinary Alice save');
  await editor.getByRole('button', { name: 'Save', exact: true }).click();
  await editor.getByText('Saved to CreatorOS', { exact: true }).waitFor();
  assert.equal(
    (await read('projects/browser-p')).data.mapValue.fields.body.stringValue,
    'Ordinary Alice save',
  );
  pristine(await read('first_dollar_journeys/alice'));
  cases++;
  await editor.close();
  for (const mode of ['valid', 'missing', 'malformed'])
    for (const swap of mode === 'malformed' ? [false] : [true, false]) {
      await seed(mode);
      const before = await read('projects/browser-p'),
        journey = await read('first_dollar_journeys/alice'),
        calendar = await fresh();
      await calendar.evaluate(() => window.mount('calendar'));
      await calendar.waitForFunction(() => window.grid);
      await calendar.evaluate(() => window.grid.onSelectEvent(window.event));
      await calendar.waitForFunction(() => window.detail);
      await calendar.evaluate(() => window.detail.setSelectedSyncPlatforms(['youtube']));
      await calendar.waitForFunction(() => window.detail.selectedSyncPlatforms.length === 1);
      await start(calendar, 'publish', swap);
      if (swap) await swapAndRelease(calendar);
      await finish(calendar);
      assert.equal(await calendar.evaluate(() => window.publishOwner), 'alice');
      if (swap || mode === 'malformed') {
        assert.deepEqual(await read('projects/browser-p'), before);
        assert.deepEqual(await read('first_dollar_journeys/alice'), journey);
        if (swap)
          assert.equal(
            await calendar.evaluate(() => window.lastTransactionCode),
            'permission-denied',
          );
        else
          assert.match(
            await calendar.getByRole('alert').innerText(),
            /contact support.*Publishing may already have succeeded/,
          );
      } else {
        assert.equal((await read('projects/browser-p')).status.stringValue, 'Published');
        const j = await read('first_dollar_journeys/alice');
        if (mode === 'missing') pristine(j);
        else assert.deepEqual(j, journey);
      }
      cases++;
      await calendar.close();
    }
  console.log(
    `PASS ${cases} real-SDK/rules cases: admin bypass control; post-callback B denied; A allowed; missing journey initialized atomically; concurrent initialization retried; malformed data/timestamps/unknown fields retained; actual canvas draft recovery and Calendar publish handler covered.`,
  );
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
