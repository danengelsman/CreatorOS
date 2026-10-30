/* global process, window, document, console, URL, Event, DOMException, sessionStorage, Storage, structuredClone */
// Run with: node tests/studioCanvas.browser.mjs
// Real React/Chromium interactions; Firebase and AI are deterministic test doubles.
import { build } from 'esbuild';
import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';


const root = process.cwd();
const source = `
import React, {useState} from 'react';
import {createRoot} from 'react-dom/client';
import {createRootRoute, createRoute, createRouter, RouterProvider, Outlet, Link, useNavigate} from '@tanstack/react-router';
import StudioCanvas from './src/components/studio/StudioCanvas';
window.remote = window.initialRemote || {id:'p1',userId:'u1',type:'content',name:window.blankProject ? 'Untitled Content' : 'Title',journeyStep:'first_content',starterBody:window.blankProject ? '' : 'Original',data:{title:window.blankProject ? '' : 'Title',body:window.blankProject ? '' : 'Original',platform:'youtube',keep:'safe'}};
window.calls = []; window.writes = []; window.journey = [];
function App(){
  const [project,setProject] = useState(window.remote);
  const navigate = useNavigate();
  window.emitProject = (value) => setProject(value);
  return <StudioCanvas user={{uid:'u1'}} brand={window.noBrand ? null : {personality:'warm'}} project={project} isCurrentOwner={() => window.ownerCurrent !== false} initialInspector={window.initialInspector} onBack={()=>navigate({to:'/projects'})}/>;
}
const rootRoute = createRootRoute({component:()=> <><Link to="/projects">Shell projects</Link><Outlet/></>});
const canvasRoute = createRoute({getParentRoute:()=>rootRoute,path:'/canvas',component:App});
const projectsRoute = createRoute({getParentRoute:()=>rootRoute,path:'/projects',component:()=> <div>Projects page</div>});
const router = createRouter({routeTree:rootRoute.addChildren([canvasRoute,projectsRoute])});
window.router = router;
createRoot(document.getElementById('root')).render(<RouterProvider router={router}/>);
`;
const mockFirebase = `
export const auth = {currentUser:{uid:'u1'}}; export const db = {}; export const serverTimestamp = () => 'timestamp'; export const apiFetch = async () => ({ok:true,json:async()=>({text:'formatted'})});
`;
const mockFirestore = `
export const doc = (_db,_col,id) => ({id}); export const collection = () => ({}); export const query = () => ({}); export const where = () => ({}); export const orderBy = () => ({});
export const getDocs = async () => ({docs:[]}); export const getDoc = async () => ({exists:()=>true,data:()=>window.remote}); export const getDocFromServer = async () => {window.refreshCount = (window.refreshCount || 0) + 1; const captured = window.captureRefresh ? structuredClone(window.remote) : null; if(window.holdRefresh) await new Promise(resolve => {window.releaseRefresh=resolve}); return {exists:()=>true,data:()=>captured || window.remote,metadata:window.refreshMetadata ?? {fromCache:false,hasPendingWrites:false}};}; export const addDoc = async () => { throw Error('unexpected create'); }; export const updateDoc = async () => { throw Error('unexpected non-transactional save'); };
export const runTransaction = async (_db, callback) => {
 if(window.holdSave) await new Promise(resolve => {window.releaseSave = resolve;});
 if(window.failSave) throw Error('offline');
 return callback({ get: async () => ({exists:()=>true, data:()=>window.remote}), update: (_ref, changes) => {window.writes.push({id:_ref.id,changes}); for(const [k,v] of Object.entries(changes)){ if(k.startsWith('data.')) window.remote.data[k.slice(5)] = v; else window.remote[k]=v; } } });
};
`;
const mockAI = `
export const analyzeAndOptimizeRetention = async (text) => {window.calls.push(['retention',text]);return {optimized_hooks:[{hook_text:'NEW HOOK'}]}};
export const generateScenePlan = async (text,title) => {window.calls.push(['planner',text,title]);return {sections:[]}};
export const repurposeContent = async (text) => {window.calls.push(['repurpose',text]);return {platforms:[]}};
export const scoreContent = async () => {window.calls.push(['score']);return {}}; export const quickPolish = async text => text; export const remixContent = async text => text; export const generateContentIdeas = async () => []; export const optimizeSearchTerms = async () => ''; export const generateSmartSuggestions = async () => ({}); export const transcribeAudio = async () => '';
`;
const replacements = {
  firebase: mockFirebase,
  firestore: mockFirestore,
  gemini: mockAI,
  journey: 'export const recordJourneyEvent = async (uid, event) => {window.journey.push({uid,event});};',
  child: 'import React from "react"; export default function Stub(){return null}',
};
const result = await build({
  stdin: { contents: source, resolveDir: root, sourcefile: 'studio-harness.tsx', loader: 'tsx' },
  bundle: true, write: false, format: 'iife', platform: 'browser',
  plugins: [{name:'test-doubles', setup(b) {
    b.onResolve({filter:/firebase\/firestore$/}, () => ({path:'firestore',namespace:'mock'}));
    b.onResolve({filter:/firebase$/}, (args) => args.path.startsWith('.') ? {path:'firebase',namespace:'mock'} : null);
    b.onResolve({filter:/services\/gemini$/}, () => ({path:'gemini',namespace:'mock'}));
    b.onResolve({filter:/services\/creatorJourney$/}, () => ({path:'journey',namespace:'mock'}));
    b.onResolve({filter:/\/(VideoStudio|CalendarView|CustomVideoPlayer|AIToolPanel|ContentIdeaGenerator|ViralTemplatesLibrary|Confetti)$/}, () => ({path:'child',namespace:'mock'}));
    b.onLoad({filter:/.*/,namespace:'mock'}, args => ({contents:replacements[args.path],loader:'jsx',resolveDir:root}));
  }}],
});
const browser = await chromium.launch({headless:true});
try {
  if (!process.env.CANVAS_RACE_ONLY) {
    const page = await browser.newPage();
    await page.route('https://studio.test/**', route => route.fulfill({contentType:'text/html',body:'<div id="root"></div>'}));
    await page.goto('https://studio.test/canvas');
    await page.addScriptTag({content:result.outputFiles[0].text});
    await page.getByLabel('Project script').fill('Account-bound draft');
    await page.evaluate(() => { window.holdSave = true; });
    await page.getByRole('button',{name:'Save',exact:true}).click();
    await page.waitForFunction(() => typeof window.releaseSave === 'function');
    await page.evaluate(() => { window.ownerCurrent = false; window.releaseSave(); });
    await page.waitForFunction(() => document.querySelector('[role="alert"]')?.textContent.includes('Could not save'));
    assert.deepEqual(await page.evaluate(() => window.writes), []);
    assert.ok(await page.evaluate(() => sessionStorage.getItem('studio-draft:u1:p1')));
    await page.close();
  }
  if (!process.env.CANVAS_RACE_ONLY || process.env.CANVAS_RACE_ONLY === 'partial') {
    for (const mode of ['initial', 'live', 'already-pruned']) {
      const page = await browser.newPage();
      await page.route('https://studio.test/**', route => route.fulfill({contentType:'text/html',body:'<div id="root"></div>'}));
      await page.goto('https://studio.test/canvas');
      await page.evaluate(mode => {
        const baseline = {title:'Title',body:'Original',platform:'youtube',name:'Title'};
        const a = {title:'Title',body:'A',platform:'youtube'};
        const b = {...a,body:'B'};
        const pruned = mode === 'already-pruned';
        sessionStorage.setItem('studio-draft:u1:p1', JSON.stringify({draft:a,baseline:pruned ? {...baseline,body:'A'} : baseline,pendingWrites:pruned ? [b] : [a,b]}));
        if (mode !== 'live') window.initialRemote = {id:'p1',userId:'u1',type:'content',name:'Title',data:{title:'Title',body:'A',platform:'youtube'}};
      }, mode);
      await page.addScriptTag({content:result.outputFiles[0].text});
      const input = page.getByLabel('Project script');
      await input.waitFor();
      if (mode === 'live') {
        await page.evaluate(() => {window.remote={...window.remote,data:{...window.remote.data,body:'A'}}; window.emitProject(window.remote);});
        await page.waitForTimeout(150);
      }
      await page.evaluate(() => {window.failSave=true;});
      await page.getByRole('button',{name:'Save',exact:true}).click();
      await page.waitForFunction(() => document.querySelector('[role="alert"]')?.textContent.includes('Could not save'));
      for (const body of ['B','A','B']) {
        await page.evaluate(body => {window.remote={...window.remote,data:{...window.remote.data,body}}; window.emitProject(window.remote);}, body);
        await page.waitForTimeout(150);
      }
      assert.equal(await input.inputValue(), 'A', 'stale repeated snapshots must not overwrite the local draft');
      assert.match(await page.getByRole('status').first().innerText(), /^Unsaved changes/);
      const record = await page.evaluate(() => JSON.parse(sessionStorage.getItem('studio-draft:u1:p1')));
      assert.ok(record, 'recovery must survive repeated snapshots');
      assert.equal(record.draft.body, 'A');
      assert.deepEqual(record.pendingWrites.map(write => write.body), mode === 'already-pruned' ? ['B','A'] : ['A','B','A']);
      page.once('dialog', dialog => dialog.accept());
      await page.reload();
      await page.addScriptTag({content:result.outputFiles[0].text});
      await input.waitFor();
      assert.equal(await input.inputValue(), 'A');
      assert.ok(await page.evaluate(() => sessionStorage.getItem('studio-draft:u1:p1')));
      await page.close();
    }
  }
  if (!process.env.CANVAS_RACE_ONLY || process.env.CANVAS_RACE_ONLY === 'repeated') {
    for (const initialMatch of [true, false]) {
      const repeated = await browser.newPage();
      await repeated.route('https://studio.test/**', route => route.fulfill({contentType:'text/html',body:'<div id="root"></div>'}));
      await repeated.goto('https://studio.test/canvas');
      await repeated.evaluate(initialMatch => {
        const baseline = {title:'Title',body:'Original',platform:'youtube',name:'Title'};
        const a = {title:'Title',body:'A',platform:'youtube'};
        const b = {title:'Title',body:'B',platform:'youtube'};
        sessionStorage.setItem('studio-draft:u1:p1', JSON.stringify({draft:a,baseline,pendingWrites:[a,b,a]}));
        if (initialMatch) window.initialRemote = {id:'p1',userId:'u1',type:'content',name:'Title',data:{title:'Title',body:'A',platform:'youtube'}};
      }, initialMatch);
      await repeated.addScriptTag({content:result.outputFiles[0].text});
      const input = repeated.getByLabel('Project script');
      await input.waitFor();
      const assertProtected = async () => {
        assert.equal(await input.inputValue(), 'A');
        assert.match(await repeated.getByRole('status').first().innerText(), /^Unsaved changes/);
        const record = await repeated.evaluate(() => JSON.parse(sessionStorage.getItem('studio-draft:u1:p1')));
        assert.ok(record, 'ambiguous recovery record must be retained');
        assert.equal(record.baseline.body, 'Original');
        assert.deepEqual(record.pendingWrites.map(write => write.body), ['A','B','A']);
      };
      await assertProtected();
      // Repeated, out-of-order snapshots do not identify which identical write committed.
      for (const body of ['A','B','A','B']) {
        await repeated.evaluate(body => {window.remote={...window.remote,name:'Title',data:{...window.remote.data,body}}; window.emitProject(window.remote);}, body);
        await repeated.waitForTimeout(100);
        await assertProtected();
      }
      // A competing rename must still conflict instead of overwriting another version.
      await repeated.evaluate(() => {window.remote={...window.remote,name:'Competing rename'}; window.emitProject(window.remote);});
      await repeated.getByRole('button',{name:'Save',exact:true}).click();
      await repeated.waitForFunction(() => document.querySelector('[role="alert"]')?.textContent.includes('changed elsewhere'));
      assert.equal(await repeated.evaluate(() => window.writes.length), 0);
      await assertProtected();
      repeated.once('dialog', dialog => dialog.accept());
      await repeated.reload();
      await repeated.addScriptTag({content:result.outputFiles[0].text});
      await input.waitFor();
      await assertProtected();
      // A successful transaction cannot prove earlier ambiguous writes are ordered.
      await repeated.evaluate(() => {window.remote={...window.remote,name:'Title',data:{...window.remote.data,body:'Original'}};});
      await repeated.getByRole('button',{name:'Save',exact:true}).click();
      await repeated.waitForFunction(() => window.writes.length === 1 && document.querySelector('[role="status"]')?.textContent.includes('Unsaved'));
      assert.equal(await repeated.evaluate(() => window.remote.data.body), 'A');
      assert.ok(await repeated.evaluate(() => sessionStorage.getItem('studio-draft:u1:p1')));
      await repeated.evaluate(() => {window.remote={...window.remote,data:{...window.remote.data,body:'B'}}; window.emitProject(window.remote);});
      await repeated.waitForTimeout(100);
      assert.equal(await input.inputValue(), 'A');
      await repeated.close();
    }
  }
  if (!process.env.CANVAS_RACE_ONLY || process.env.CANVAS_RACE_ONLY === 'retry') {
    const retry = await browser.newPage();
    await retry.route('https://studio.test/**', route => route.fulfill({contentType:'text/html',body:'<div id="root"></div>'}));
    await retry.goto('https://studio.test/canvas');
    await retry.evaluate(() => {
      const baseline = {title:'Title',body:'Original',platform:'youtube',name:'Title'};
      const pending = {title:'Title',body:'First interrupted write',platform:'youtube'};
      sessionStorage.setItem('studio-draft:u1:p1', JSON.stringify({draft:pending,baseline,pending}));
    });
    await retry.addScriptTag({content:result.outputFiles[0].text});
    const input = retry.getByLabel('Project script');
    await input.waitFor();
    await retry.evaluate(() => {window.failSave=true;});
    await retry.getByRole('button',{name:'Save',exact:true}).click();
    await retry.waitForFunction(() => document.querySelector('[role="alert"]')?.textContent.includes('Could not save'));
    await input.fill('Second committed write');
    await retry.evaluate(() => {window.failSave=false; window.holdRefresh=true;});
    await retry.getByRole('button',{name:'Save',exact:true}).click();
    await retry.waitForFunction(() => window.writes.length === 1 && typeof window.releaseRefresh === 'function');
    await input.fill('Edit after second write');
    const remote = await retry.evaluate(() => structuredClone(window.remote));
    const record = await retry.evaluate(() => JSON.parse(sessionStorage.getItem('studio-draft:u1:p1')));
    const stale = await browser.newPage();
    await stale.route('https://studio.test/**', route => route.fulfill({contentType:'text/html',body:'<div id="root"></div>'}));
    await stale.goto('https://studio.test/canvas');
    await stale.evaluate(({record, remote}) => {
      sessionStorage.setItem('studio-draft:u1:p1', JSON.stringify(record));
      window.initialRemote = {...remote,data:{...remote.data,body:'First interrupted write'}};
    }, {record, remote});
    await stale.addScriptTag({content:result.outputFiles[0].text});
    const staleInput = stale.getByLabel('Project script');
    await staleInput.waitFor();
    assert.equal(await staleInput.inputValue(), 'Edit after second write');
    const retained = await stale.evaluate(() => JSON.parse(sessionStorage.getItem('studio-draft:u1:p1')));
    assert.equal(retained.baseline.body, 'Original');
    assert.equal(retained.pendingWrites.at(-1).body, 'Second committed write');
    await stale.evaluate(remote => {window.remote={...remote,name:'Competing rename'}; window.emitProject(window.remote);}, remote);
    await stale.getByRole('button',{name:'Save',exact:true}).click();
    await stale.waitForFunction(() => document.querySelector('[role="alert"]')?.textContent.includes('changed elsewhere'));
    assert.equal(await stale.evaluate(() => window.remote.name), 'Competing rename');
    assert.equal(await staleInput.inputValue(), 'Edit after second write');
    assert.equal(await stale.evaluate(() => window.writes.length), 0);
    await stale.evaluate(remote => {window.remote=remote; window.emitProject(remote);}, remote);
    await stale.waitForTimeout(100);
    assert.equal(await stale.evaluate(() => JSON.parse(sessionStorage.getItem('studio-draft:u1:p1')).baseline.body), 'Original');
    assert.equal(await staleInput.inputValue(), 'Edit after second write');
    await stale.close();
    await retry.addInitScript(value => {window.initialRemote = value;}, remote);
    retry.once('dialog', dialog => dialog.accept());
    await retry.reload();
    await retry.addScriptTag({content:result.outputFiles[0].text});
    await input.waitFor();
    assert.equal(await input.inputValue(), 'Edit after second write');
    assert.equal(await retry.evaluate(() => JSON.parse(sessionStorage.getItem('studio-draft:u1:p1')).baseline.body), 'Original');
    await retry.getByRole('button',{name:'Save',exact:true}).click();
    await retry.waitForFunction(() => document.querySelector('[role="alert"]')?.textContent.includes('changed elsewhere'));
    assert.equal(await retry.evaluate(() => window.writes.length), 0);
    assert.equal(await input.inputValue(), 'Edit after second write');
    await retry.close();
  }
  if (!process.env.CANVAS_RACE_ONLY || process.env.CANVAS_RACE_ONLY === 'reload') {
    const reload = await browser.newPage();
    await reload.route('https://studio.test/**', route => route.fulfill({contentType:'text/html',body:'<div id="root"></div>'}));
    await reload.goto('https://studio.test/canvas');
    await reload.addScriptTag({content:result.outputFiles[0].text});
    const input = reload.getByLabel('Project script');
    await input.waitFor();
    await input.fill('Local draft to preserve');
    await reload.evaluate(() => {window.remote={...window.remote,data:{...window.remote.data,body:'Earlier server value'}};});
    await reload.getByRole('button',{name:'Save',exact:true}).click();
    await reload.getByRole('button',{name:'Discard local draft and load project'}).waitFor();
    await reload.evaluate(() => {window.holdRefresh=true; window.captureRefresh=true;});
    reload.once('dialog', dialog => dialog.accept());
    await reload.getByRole('button',{name:'Discard local draft and load project'}).click();
    await reload.waitForFunction(() => typeof window.releaseRefresh === 'function');
    await reload.evaluate(() => {window.remote={...window.remote,data:{...window.remote.data,body:'Newer server value'}}; window.emitProject(window.remote);});
    await reload.waitForTimeout(100);
    await reload.evaluate(() => {window.holdRefresh=false; window.releaseRefresh();});
    await reload.waitForTimeout(200);
    assert.equal(await input.inputValue(), 'Local draft to preserve');
    assert.ok(await reload.evaluate(() => sessionStorage.getItem('studio-draft:u1:p1')));
    reload.once('dialog', dialog => dialog.accept());
    await reload.getByRole('button',{name:'Discard local draft and load project'}).click();
    await reload.waitForFunction(() => document.querySelector('[aria-label="Project script"]').value === 'Newer server value');
    await reload.close();
  }
  if (!process.env.CANVAS_RACE_ONLY || process.env.CANVAS_RACE_ONLY === 'freshness') {
    const page = await browser.newPage();
    await page.route('https://studio.test/**', route => route.fulfill({contentType:'text/html',body:'<div id="root"></div>'}));
    await page.goto('https://studio.test/canvas');
    await page.addScriptTag({content:result.outputFiles[0].text});
    const input = page.getByLabel('Project script');
    await input.fill('Verified saved content');
    await page.getByRole('button',{name:'Save',exact:true}).click();
    await page.waitForFunction(() => document.querySelector('[role="status"]')?.textContent.includes('No unsaved'));
    await page.evaluate(() => window.emitProject({...window.remote,data:{...window.remote.data,body:'Original'}}));
    await page.waitForTimeout(300);
    assert.equal(await input.inputValue(), 'Verified saved content', 'delayed old props must not replace a confirmed save');
    await page.evaluate(() => {window.remote={...window.remote,data:{...window.remote.data,body:'Current server value'}}; window.emitProject(window.remote);});
    await page.waitForFunction(() => document.querySelector('[aria-label="Project script"]').value === 'Current server value');
    await page.evaluate(() => {window.refreshMetadata={fromCache:true,hasPendingWrites:false}; window.remote={...window.remote,data:{...window.remote.data,body:'Unverified cache'}}; window.emitProject(window.remote);});
    await page.waitForTimeout(300);
    assert.equal(await input.inputValue(), 'Current server value', 'cached reads must not replace verified content');
    await page.evaluate(() => {window.refreshMetadata={fromCache:false,hasPendingWrites:false}; window.holdRefresh=true; window.captureRefresh=true; window.remote={...window.remote,data:{...window.remote.data,body:'Remote while editing'}}; window.emitProject(window.remote);});
    await page.waitForFunction(() => typeof window.releaseRefresh === 'function');
    await input.fill('User edit during read');
    await page.evaluate(() => {window.holdRefresh=false; window.releaseRefresh();});
    await page.waitForTimeout(300);
    assert.equal(await input.inputValue(), 'User edit during read');
    await page.close();
  }
  if (!process.env.CANVAS_RACE_ONLY || process.env.CANVAS_RACE_ONLY === 'dedupe') {
    const page = await browser.newPage();
    await page.route('https://studio.test/**', route => route.fulfill({contentType:'text/html',body:'<div id="root"></div>'}));
    await page.goto('https://studio.test/canvas');
    await page.addScriptTag({content:result.outputFiles[0].text});
    const input = page.getByLabel('Project script');
    await input.fill('Saved value');
    await page.getByRole('button',{name:'Save',exact:true}).click();
    await page.waitForFunction(() => document.querySelector('[role="status"]')?.textContent.includes('No unsaved'));
    await page.waitForTimeout(200);
    const base = await page.evaluate(() => window.refreshCount);
    await page.evaluate(() => {window.emitProject({...window.remote,data:{...window.remote.data,body:'Old prop'}});});
    await page.waitForFunction(count => window.refreshCount === count, base + 1);
    await page.waitForTimeout(100);
    for (let i=0; i<4; i++) {
      await page.evaluate(() => window.emitProject({...window.remote,data:{...window.remote.data,body:'Old prop'}}));
      await page.waitForTimeout(100);
    }
    assert.equal(await page.evaluate(() => window.refreshCount), base + 1, 'identical stale deliveries must not trigger another read');
    assert.equal(await input.inputValue(), 'Saved value');
    await page.evaluate(() => {window.holdRefresh=true; window.captureRefresh=true; window.remote={...window.remote,data:{...window.remote.data,body:'New remote'}}; window.emitProject(window.remote);});
    await page.waitForFunction(count => window.refreshCount === count && typeof window.releaseRefresh === 'function', base + 2);
    await page.evaluate(() => window.emitProject(structuredClone(window.remote)));
    await page.waitForTimeout(100);
    assert.equal(await page.evaluate(() => window.refreshCount), base + 2, 'identical deliveries must not cancel an in-flight read');
    await input.fill('Concurrent edit');
    await page.evaluate(() => {window.holdRefresh=false; window.releaseRefresh();});
    await page.waitForTimeout(100);
    assert.equal(await input.inputValue(), 'Concurrent edit');
    await input.fill('Saved value');
    await page.waitForFunction(() => document.querySelector('[aria-label="Project script"]').value === 'New remote');
    await page.evaluate(() => {window.remote={...window.remote,data:{...window.remote.data,body:'Newest remote'}}; window.emitProject({...window.remote,data:{...window.remote.data,body:'Old prop'}});});
    await page.waitForFunction(() => document.querySelector('[aria-label="Project script"]').value === 'Newest remote');
    assert.equal(await page.evaluate(() => window.refreshCount), base + 4, 'a later changed delivery must trigger a fresh read');
    await page.evaluate(() => {window.holdRefresh=true; window.releaseRefresh=undefined; window.remote={...window.remote,data:{...window.remote.data,body:'Final remote'}}; window.emitProject(window.remote);});
    await page.waitForFunction(count => window.refreshCount === count && typeof window.releaseRefresh === 'function', base + 5);
    await page.evaluate(() => window.emitProject(structuredClone(window.remote)));
    await page.waitForTimeout(100);
    await page.evaluate(() => {window.holdRefresh=false; window.releaseRefresh();});
    await page.waitForFunction(() => document.querySelector('[aria-label="Project script"]').value === 'Final remote');
    assert.equal(await page.evaluate(() => window.refreshCount), base + 5);
    await page.evaluate(() => window.emitProject({...window.remote,data:{...window.remote.data,body:'Old prop'}}));
    await page.waitForFunction(count => window.refreshCount === count, base + 6);
    await page.waitForTimeout(100);
    await page.evaluate(() => {window.remote={...window.remote,data:{...window.remote.data,body:'Changed after verified value'}}; window.emitProject({...window.remote,data:{...window.remote.data,body:'Final remote'}});});
    await page.waitForFunction(() => document.querySelector('[aria-label="Project script"]').value === 'Changed after verified value');
    assert.equal(await page.evaluate(() => window.refreshCount), base + 7, 'a changed delivery equal to the verified baseline still triggers a fresh read');
    await page.close();
  }
  if (!process.env.CANVAS_RACE_ONLY || process.env.CANVAS_RACE_ONLY === 'quota') {
    const page = await browser.newPage();
    await page.route('https://studio.test/**', route => route.fulfill({contentType:'text/html',body:'<div id="root"></div>'}));
    await page.goto('https://studio.test/canvas');
    await page.evaluate(() => {
      const baseline = {title:'Title',body:'Original',platform:'youtube',name:'Title'};
      const draft = {title:'Title',body:'Stored old draft',platform:'youtube'};
      sessionStorage.setItem('studio-draft:u1:p1', JSON.stringify({draft,baseline,pendingWrites:Array.from({length:10},(_,i)=>({...draft,body:'history '+i}))}));
    });
    await page.addScriptTag({content:result.outputFiles[0].text});
    const input = page.getByLabel('Project script');
    await input.waitFor();
    await page.evaluate(() => {window.originalSetItem = Storage.prototype.setItem; Storage.prototype.setItem = function() { throw new DOMException('Quota exceeded', 'QuotaExceededError'); };});
    await input.fill('Latest unsaved draft');
    assert.match(await page.getByRole('alert').innerText(), /latest draft could not be stored/i);
    await page.getByRole('button',{name:'Save',exact:true}).click();
    assert.equal(await input.inputValue(), 'Latest unsaved draft');
    assert.equal(await page.evaluate(() => JSON.parse(sessionStorage.getItem('studio-draft:u1:p1')).draft.body), 'Stored old draft');
    assert.equal(await page.evaluate(() => window.writes.length), 0);
    const alerts = await page.locator('[role="alert"]').allTextContents();
    assert.match(alerts.join(' '), /latest.*(not|could not).*\b(saved|stored|recover)/i);
    assert.doesNotMatch(alerts.join(' '), /your draft (and earlier recovery data are preserved|will remain protected)/i);
    assert.match(alerts.join(' '), /copy/i);
    await page.evaluate(() => {Storage.prototype.setItem = window.originalSetItem;});
    await input.fill('Latest draft after recovery');
    assert.equal(await page.evaluate(() => JSON.parse(sessionStorage.getItem('studio-draft:u1:p1')).draft.body), 'Latest draft after recovery');
    assert.doesNotMatch(await page.getByRole('alert').innerText(), /could not be stored/i);
    assert.match(await page.getByRole('status').first().innerText(), /draft kept in this browser tab/i);
    await page.close();
  }
  if (!process.env.CANVAS_RACE_ONLY || process.env.CANVAS_RACE_ONLY === 'bounded') {
    const page = await browser.newPage();
    await page.route('https://studio.test/**', route => route.fulfill({contentType:'text/html',body:'<div id="root"></div>'}));
    await page.goto('https://studio.test/canvas');
    await page.evaluate(() => {
      const baseline = {title:'Title',body:'Original',platform:'youtube',name:'Title'};
      const draft = {title:'Title',body:'Protected draft',platform:'youtube'};
      sessionStorage.setItem('studio-draft:u1:p1', JSON.stringify({draft,baseline,pendingWrites:Array.from({length:10},(_,i)=>({...draft,body:'history '+i}))}));
    });
    await page.addScriptTag({content:result.outputFiles[0].text});
    await page.getByLabel('Project script').waitFor();
    await page.getByRole('button',{name:'Save',exact:true}).click();
    await page.getByText(/recovery history is full/i).waitFor();
    assert.equal(await page.evaluate(() => window.writes.length), 0);
    const saved = await page.evaluate(() => JSON.parse(sessionStorage.getItem('studio-draft:u1:p1')));
    assert.equal(saved.draft.body, 'Protected draft');
    assert.equal(saved.pendingWrites.length, 10);
    assert.equal(saved.pendingWrites[0].body, 'history 0');
    await page.close();
  }
  if (process.env.CANVAS_RACE_ONLY) {
    console.log(`PASS: ${process.env.CANVAS_RACE_ONLY} race`);
  } else {
  const page = await browser.newPage();
  await page.route('https://studio.test/**', route => route.fulfill({contentType:'text/html',body:'<div id="root"></div>'}));
  await page.goto('https://studio.test/canvas');
  await page.addScriptTag({content:result.outputFiles[0].text});
  const editor = page.getByLabel('Project script');
  await editor.waitFor();
  assert.equal(await editor.inputValue(), 'Original');
  // Establish a real history entry before editing.
  await page.evaluate(() => window.router.navigate({to:'/projects'}));
  await page.getByText('Projects page').waitFor();
  await page.goBack();
  await editor.waitFor();
  await editor.fill('Navigation draft');
  let messages = [];
  page.once('dialog', async dialog => { messages.push(dialog.message()); await dialog.dismiss(); });
  await page.getByRole('link',{name:'Shell projects'}).click();
  assert.match(messages[0], /unsaved/i);
  assert.equal(new URL(page.url()).pathname, '/canvas');
  assert.equal(await page.evaluate(() => {const e = new Event('beforeunload', {cancelable:true}); window.dispatchEvent(e); return e.defaultPrevented;}), true);
  page.once('dialog', async dialog => { messages.push(dialog.message()); await dialog.dismiss(); });
  await page.goForward();
  await page.waitForTimeout(200);
  assert.equal(new URL(page.url()).pathname, '/canvas');
  assert.equal(messages.length, 2);
  await editor.fill('Original');
  await page.evaluate(() => { window.remote = {...window.remote, data:{...window.remote.data,body:'Remote clean'}}; window.emitProject(window.remote); });
  await page.waitForFunction(() => document.querySelector('[aria-label="Project script"]').value === 'Remote clean');
  await editor.fill('Unsaved current script');
  await page.evaluate(() => { window.remote = {...window.remote, data:{...window.remote.data,body:'Remote concurrent'}}; window.emitProject(window.remote); });
  assert.equal(await editor.inputValue(), 'Unsaved current script');
  await editor.fill('Remote clean');
  await page.waitForFunction(() => document.querySelector('[aria-label="Project script"]').value === 'Remote concurrent', null, {timeout: 3000});
  await page.evaluate(() => { window.remote = {...window.remote, data:{...window.remote.data,body:'Remote clean'}}; window.emitProject(window.remote); });
  await page.waitForFunction(() => document.querySelector('[aria-label="Project script"]').value === 'Remote clean');
  await editor.fill('Unsaved current script');
  await page.evaluate(() => { window.remote = {...window.remote, data:{...window.remote.data,body:'Remote concurrent'}}; window.emitProject(window.remote); });
  await page.getByRole('button',{name:'Diagnose & Optimize'}).click();
  await page.getByRole('button',{name:'Apply to Editor'}).click();
  assert.equal(await editor.inputValue(), 'NEW HOOK\n\nUnsaved current script');
  await page.getByRole('button',{name:'Scene planner',exact:true}).click();
  await page.locator('#studio-inspector').getByRole('button',{name:'Segment Script into Visual Beats'}).click();
  await page.getByRole('button',{name:'Repurpose',exact:true}).click();
  await page.getByRole('button',{name:'Repurpose Content'}).click();
  await page.waitForFunction(() => window.calls.length === 3);
  assert.deepEqual(await page.evaluate(() => window.calls), [
    ['retention','Unsaved current script'],
    ['planner','NEW HOOK\n\nUnsaved current script','Title'],
    ['repurpose','NEW HOOK\n\nUnsaved current script'],
  ]);
  await page.getByRole('button',{name:'Save',exact:true}).click();
  await page.getByRole('alert').waitFor();
  assert.match(await page.getByRole('alert').innerText(), /changed elsewhere/i);
  assert.equal((await page.evaluate(() => window.writes)).length, 0);
  assert.equal(await editor.inputValue(), 'NEW HOOK\n\nUnsaved current script');
  await page.evaluate(() => {window.remote.data.body='Remote clean'; window.failSave=true;});
  await page.getByRole('button',{name:'Save',exact:true}).click();
  await page.waitForFunction(() => document.querySelector('[role="alert"]')?.textContent.includes('Could not save'));
  assert.equal(await editor.inputValue(), 'NEW HOOK\n\nUnsaved current script');
  await page.evaluate(() => {window.failSave=false;});
  await page.getByRole('button',{name:'Save',exact:true}).click();
  await page.waitForFunction(() => window.writes.length === 1);
  const writes = await page.evaluate(() => window.writes);
  assert.equal(writes[0].id, 'p1');
  assert.equal(writes[0].changes['data.body'], 'NEW HOOK\n\nUnsaved current script');
  assert.equal(writes[0].changes.data, undefined);
  assert.equal(writes[0].changes.journeyDraftSavedAt, 'timestamp');
  await page.waitForFunction(() => window.journey.length === 1);
  assert.deepEqual(await page.evaluate(() => window.journey[0]), {uid:'u1',event:{type:'save_draft',projectId:'p1'}});
  assert.equal(await page.evaluate(() => window.remote.data.keep), 'safe');
  await editor.fill('Local second draft');
  await page.evaluate(() => { window.remote = {...window.remote, data:{...window.remote.data,body:'New server version'}}; window.emitProject(window.remote); });
  await page.getByRole('button',{name:'Save',exact:true}).click();
  await page.getByRole('button',{name:'Discard local draft and load project'}).waitFor();
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button',{name:'Discard local draft and load project'}).click();
  await page.waitForFunction(() => document.querySelector('[aria-label="Project script"]').value === 'New server version');
  await editor.fill('Rename conflict local');
  await page.evaluate(() => {window.remote = {...window.remote,name:'Renamed elsewhere'};});
  await page.getByRole('button',{name:'Save',exact:true}).click();
  await page.waitForFunction(() => document.querySelector('[role="alert"]')?.textContent.includes('changed elsewhere'));
  assert.equal((await page.evaluate(() => window.writes)).length, 1);
  await page.evaluate(() => {window.remote = {...window.remote,name:'Title'}; window.holdSave=true;});
  await page.getByRole('button',{name:'Save',exact:true}).click();
  await page.waitForFunction(() => typeof window.releaseSave === 'function');
  await editor.fill('Typed while saving');
  const recovery = await page.evaluate(() => JSON.parse(sessionStorage.getItem('studio-draft:u1:p1')));
  assert.equal(recovery.pending.body, 'Rename conflict local');
  assert.equal(recovery.draft.body, 'Typed while saving');
  page.once('dialog', async dialog => {messages.push(dialog.message()); await dialog.accept();});
  await page.getByRole('link',{name:'Shell projects'}).click();
  assert.match(messages.at(-1), /wait.*save/i);
  assert.equal(new URL(page.url()).pathname, '/canvas');
  await page.evaluate(() => {window.holdSave=false; window.releaseSave();});
  await page.waitForFunction(() => window.writes.length === 2);
  await page.waitForFunction(() => !document.querySelector('button[disabled]') || document.querySelector('[role="status"]')?.textContent.includes('Unsaved'));
  assert.equal(await editor.inputValue(), 'Typed while saving');
  await page.waitForFunction(() => JSON.parse(sessionStorage.getItem('studio-draft:u1:p1'))?.baseline.body === 'Rename conflict local');
  // Mimic an interrupted page after the write committed but before its baseline was updated.
  const interrupted = {...recovery};
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('link',{name:'Shell projects'}).click();
  await page.getByText('Projects page').waitFor();
  await page.evaluate((record) => {sessionStorage.setItem('studio-draft:u1:p1', JSON.stringify(record)); window.initialInspector='planner';}, interrupted);
  await page.evaluate(() => window.router.navigate({to:'/canvas'}));
  await editor.waitFor();
  assert.equal(await editor.inputValue(), 'Typed while saving');
  assert.equal(await page.getByRole('button',{name:'Scene planner',exact:true}).getAttribute('aria-pressed'), 'true');
  assert.equal(await page.evaluate(() => JSON.parse(sessionStorage.getItem('studio-draft:u1:p1')).baseline.body), 'New server version');
  await page.getByRole('button',{name:'Save',exact:true}).click();
  await page.waitForFunction(() => document.querySelector('[role="alert"]')?.textContent.includes('changed elsewhere'));
  assert.equal(await editor.inputValue(), 'Typed while saving');
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button',{name:'Discard local draft and load project'}).click();
  await page.waitForFunction(() => document.querySelector('[aria-label="Project script"]').value === 'Rename conflict local');
  await editor.fill('Typed while saving');
  await page.getByRole('button',{name:'Save',exact:true}).click();
  await page.waitForFunction(() => window.writes.length === 3);
  await page.waitForFunction(() => document.querySelector('[role="status"]')?.textContent.includes('No unsaved'));
  await page.evaluate(() => {window.originalSetItem = Storage.prototype.setItem; Storage.prototype.setItem = function(){throw Error('unavailable')};});
  await editor.fill('No recovery available');
  await page.waitForFunction(() => document.querySelector('[role="status"]')?.textContent.includes('recovery is unavailable'));
  page.once('dialog', async dialog => {messages.push(dialog.message()); await dialog.dismiss();});
  await page.goBack();
  await page.waitForTimeout(200);
  assert.match(messages.at(-1), /recovery is unavailable/i);
  assert.equal(new URL(page.url()).pathname, '/canvas');
  await page.evaluate(() => {Storage.prototype.setItem=window.originalSetItem; window.holdRefresh=true;});
  await page.getByRole('button',{name:'Save',exact:true}).click();
  await page.waitForFunction(() => typeof window.releaseRefresh === 'function');
  await editor.fill('Newer local edits');
  await page.evaluate(() => {window.remote={...window.remote,data:{...window.remote.data,body:'Remote after save'}}; window.emitProject(window.remote);});
  await page.evaluate(() => {window.holdRefresh=false; window.releaseRefresh();});
  await page.waitForFunction(() => window.writes.length === 4);
  assert.equal(await editor.inputValue(), 'Newer local edits');
  await editor.fill('No recovery available');
  await page.waitForFunction(() => document.querySelector('[aria-label="Project script"]').value === 'Remote after save');
  await editor.fill('Back button draft');
  page.once('dialog', async dialog => {messages.push(dialog.message()); await dialog.dismiss();});
  await page.getByRole('button',{name:'Back to projects'}).click();
  assert.equal(new URL(page.url()).pathname, '/canvas');
  let confirmationCount = 0;
  page.on('dialog', async dialog => {confirmationCount++; await dialog.accept();});
  await page.getByRole('button',{name:'Back to projects'}).click();
  await page.getByText('Projects page').waitFor();
  assert.equal(confirmationCount, 1);
  await page.evaluate(() => {window.initialInspector='repurpose';});
  await page.evaluate(() => window.router.navigate({to:'/canvas'}));
  await editor.waitFor();
  assert.equal(await page.getByRole('button',{name:'Repurpose',exact:true}).getAttribute('aria-pressed'), 'true');
  await page.getByRole('link',{name:'Shell projects'}).click();
  await page.getByText('Projects page').waitFor();
  await page.evaluate((record) => {
    sessionStorage.setItem('studio-draft:u1:p1', JSON.stringify(record));
    window.remote={...window.remote,data:{...window.remote.data,body:'Different remote'}};
  }, interrupted);
  await page.evaluate(() => window.router.navigate({to:'/canvas'}));
  await editor.waitFor();
  assert.equal(await editor.inputValue(), 'Typed while saving');
  await page.getByRole('button',{name:'Save',exact:true}).click();
  await page.waitForFunction(() => document.querySelector('[role="alert"]')?.textContent.includes('changed elsewhere'));
  assert.equal(await page.evaluate(() => window.remote.data.body), 'Different remote');
  assert.equal((await page.evaluate(() => window.writes)).length, 4);
  // A committed write can outlive an interrupted editor while its newer local edit
  // happens to equal the old baseline. The first snapshot on remount may be stale.
  const interruptedPage = await browser.newPage();
  await interruptedPage.route('https://studio.test/**', route => route.fulfill({contentType:'text/html',body:'<div id="root"></div>'}));
  await interruptedPage.goto('https://studio.test/canvas');
  await interruptedPage.addScriptTag({content:result.outputFiles[0].text});
  const interruptedEditor = interruptedPage.getByLabel('Project script');
  await interruptedEditor.waitFor();
  await interruptedEditor.fill('Committed text');
  await interruptedPage.evaluate(() => {window.holdRefresh=true;});
  await interruptedPage.getByRole('button',{name:'Save',exact:true}).click();
  await interruptedPage.waitForFunction(() => typeof window.releaseRefresh === 'function' && window.writes.length === 1);
  await interruptedEditor.fill('Original');
  const interruptedRecord = await interruptedPage.evaluate(() => JSON.parse(sessionStorage.getItem('studio-draft:u1:p1')));
  assert.equal(interruptedRecord.draft.body, 'Original');
  assert.equal(interruptedRecord.pending.body, 'Committed text');
  interruptedPage.once('dialog', dialog => dialog.accept());
  await interruptedPage.reload();
  await interruptedPage.addScriptTag({content:result.outputFiles[0].text});
  await interruptedEditor.waitFor();
  assert.equal(await interruptedEditor.inputValue(), 'Original');
  assert.match(await interruptedPage.getByRole('status').first().innerText(), /^Unsaved changes/);
  assert.equal((await interruptedPage.evaluate(() => JSON.parse(sessionStorage.getItem('studio-draft:u1:p1')))).pending.body, 'Committed text');
  // A save against the stale baseline must conflict, not erase the pending write.
  await interruptedPage.evaluate(() => {window.remote={...window.remote,data:{...window.remote.data,body:'Committed text'}}; window.holdSave=true;});
  await interruptedPage.getByRole('button',{name:'Save',exact:true}).click();
  await interruptedPage.waitForFunction(() => typeof window.releaseSave === 'function');
  assert.equal((await interruptedPage.evaluate(() => JSON.parse(sessionStorage.getItem('studio-draft:u1:p1')))).pending.body, 'Committed text');
  await interruptedPage.evaluate(() => {window.holdSave=false; window.releaseSave();});
  await interruptedPage.waitForFunction(() => document.querySelector('[role="alert"]')?.textContent.includes('changed elsewhere'));
  assert.equal((await interruptedPage.evaluate(() => JSON.parse(sessionStorage.getItem('studio-draft:u1:p1')))).pending.body, 'Committed text');
  assert.equal((await interruptedPage.evaluate(() => window.writes)).length, 0);
  await interruptedPage.evaluate(() => window.emitProject(window.remote));
  await interruptedPage.waitForTimeout(100);
  assert.equal(await interruptedPage.evaluate(() => JSON.parse(sessionStorage.getItem('studio-draft:u1:p1')).baseline.body), 'Original');
  assert.equal(await interruptedEditor.inputValue(), 'Original');
  assert.match(await interruptedPage.getByRole('status').first().innerText(), /^Unsaved changes/);
  for (const metadata of [{fromCache:true,hasPendingWrites:false}, {fromCache:false,hasPendingWrites:true}, {}]) {
    await interruptedPage.evaluate(metadata => {window.refreshMetadata=metadata;}, metadata);
    interruptedPage.once('dialog', dialog => dialog.accept());
    await interruptedPage.getByRole('button',{name:'Discard local draft and load project'}).click();
    await interruptedPage.waitForFunction(() => document.querySelector('[role="alert"]')?.textContent.includes('Could not load'));
    assert.equal(await interruptedEditor.inputValue(), 'Original');
    assert.ok(await interruptedPage.evaluate(() => sessionStorage.getItem('studio-draft:u1:p1')));
  }
  await interruptedPage.evaluate(() => {window.refreshMetadata={fromCache:false,hasPendingWrites:false};});
  interruptedPage.once('dialog', dialog => dialog.accept());
  await interruptedPage.getByRole('button',{name:'Discard local draft and load project'}).click();
  await interruptedPage.waitForFunction(() => document.querySelector('[aria-label="Project script"]').value === 'Committed text');
  await interruptedEditor.fill('Original');
  await interruptedPage.getByRole('button',{name:'Save',exact:true}).click();
  await interruptedPage.waitForFunction(() => window.writes.length === 1);
  assert.equal(await interruptedPage.evaluate(() => window.remote.data.body), 'Original');
  await interruptedPage.close();
  const unbranded = await browser.newPage();
  await unbranded.route('https://studio.test/**', route => route.fulfill({contentType:'text/html',body:'<div id="root"></div>'}));
  await unbranded.addInitScript(() => {window.noBrand = true; window.blankProject = true;});
  await unbranded.goto('https://studio.test/canvas');
  await unbranded.addScriptTag({content:result.outputFiles[0].text});
  const unbrandedEditor = unbranded.getByLabel('Project script');
  await unbrandedEditor.waitFor({timeout: 3000});
  assert.equal(await unbrandedEditor.inputValue(), '');
  await unbrandedEditor.fill('Draft without a brand');
  await unbranded.getByRole('button',{name:'Score',exact:true}).click();
  await unbranded.getByText('Set up your brand to score your draft.', {exact:true}).waitFor();
  assert.deepEqual(await unbranded.evaluate(() => window.calls), []);
  await unbranded.getByRole('button',{name:'Save',exact:true}).click();
  await unbranded.waitForFunction(() => window.writes.length === 1);
  assert.equal(await unbranded.evaluate(() => window.remote.data.body), 'Draft without a brand');
  await unbranded.close();
  const legacy = await browser.newPage();
  await legacy.route('https://studio.test/**', route => route.fulfill({contentType:'text/html',body:'<div id="root"></div>'}));
  await legacy.goto('https://studio.test/canvas');
  await legacy.evaluate(() => {
    const draft = {title:'Title', body:'Original', platform:'youtube'};
    sessionStorage.setItem('studio-draft:u1:p1', JSON.stringify({draft, baseline:draft}));
  });
  await legacy.addScriptTag({content:result.outputFiles[0].text});
  const legacyEditor = legacy.getByLabel('Project script');
  await legacyEditor.waitFor();
  assert.match(await legacy.getByRole('status').first().innerText(), /^Unsaved changes/);
  assert.match(await legacy.getByRole('alert').innerText(), /older version.*name is unknown/i);
  await legacy.evaluate(() => {window.remote={...window.remote,data:{...window.remote.data,body:'Remote update'}}; window.emitProject(window.remote);});
  await legacy.waitForTimeout(100);
  assert.equal(await legacyEditor.inputValue(), 'Original');
  assert.ok(await legacy.evaluate(() => sessionStorage.getItem('studio-draft:u1:p1')));
  legacy.once('dialog', dialog => dialog.accept());
  await legacy.getByRole('button',{name:'Discard local draft and load project'}).click();
  await legacy.waitForFunction(() => document.querySelector('[aria-label="Project script"]').value === 'Remote update');
  await legacy.close();
  console.log('PASS: router guards, interrupted and legacy recovery, unbranded editing, concurrency, inspector, and journey save');
  }
} finally { await browser.close(); }
