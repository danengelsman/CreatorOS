// Run offline: node tests/workspaceNavigation.browser.mjs
// Real route tree and route components; auth, shell, dashboard/profile and journey I/O are deterministic doubles.
import { build } from 'esbuild';
import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

const root = process.cwd();
const source = `
import React from 'react';
import {createRoot} from 'react-dom/client';
import {RouterProvider} from '@tanstack/react-router';
import {router} from './src/router';
import {useWorkspaceStore} from './src/store/workspaceStore';
window.switchAccount = uid => { const token=useWorkspaceStore.getState().changeAccount(uid); window.setAuth({user:{uid}, userData:{}, workspaceToken:token}); };
window.transitionBeforeEffects = () => { for (const uid of window.beforeEffectsSwitch) window.switchAccount(uid); };
window.initialToken=useWorkspaceStore.getState().changeAccount('A');
router.update({context:{auth:{isAuthenticated:true}}});
window.router=router;
import {Provider} from '@/contexts/AuthContext';
createRoot(document.getElementById('root')).render(<Provider><RouterProvider router={router}/></Provider>);
`;
const mocks = {
 auth: `import React,{createContext,useContext,useState} from 'react'; const C=createContext(null); export function Provider({children}){const [v,set]=useState({user:{uid:'A'},userData:{},workspaceToken:window.initialToken});window.setAuth=set;return <C.Provider value={v}>{children}</C.Provider>} export const useAuth=()=>useContext(C);`,
 shell: `import React from 'react'; export default function Shell({children}){return <main>{children}</main>}`,
 dashboard: `import React,{useLayoutEffect} from 'react'; import Today from './src/components/Today'; export default function Dashboard({user,setActiveTab}){useLayoutEffect(()=>{if(window.beforeEffectsSwitch&&!window.switchedBeforeEffects){window.switchedBeforeEffects=true;window.transitionBeforeEffects()}},[]);return <Today user={user} setActiveTab={setActiveTab}/>}`,
 profile: `import React from 'react'; export default function Profile(){return <h1>Profile page</h1>}`,
 firebase: `export const db={};export const serverTimestamp=()=>0;export const handleFirestoreError=()=>{};export const OperationType={WRITE:'write'};`,
 firestore: `export const collection=()=>({});export const addDoc=async()=>({});`,
 journey: `const initial=uid=>({uid,version:1,currentStep:'direction',status:'in_progress',answers:{direction:uid+' current'},completedSteps:[]}); export const ensureFirstDollarJourney=async uid=>{(window.ensureCalls??=[]).push(uid);return initial(uid)};export const watchFirstDollarJourney=()=>()=>{};export const updateFirstDollarJourney=(uid,action)=>new Promise((resolve,reject)=>{window.pending={uid,action,resolve,reject}});`,
 stubroute: `import {createFileRoute} from '@tanstack/react-router'; export const Route=createFileRoute('/unused')({component:()=>null});`,
};
const kept = new Set(['__root','_auth','_auth.help','_auth.help_.$topic','_auth.community','_auth.profile','_auth.dashboard','_auth.first-dollar']);
console.log('Building harness');
const bundle = await build({alias:{react:path.dirname(require.resolve('react/package.json'))},stdin:{contents:source,resolveDir:root,sourcefile:'navigation-harness.tsx',loader:'tsx'},bundle:true,write:false,format:'iife',platform:'browser',plugins:[{name:'test-doubles',setup(b){
 b.onResolve({filter:/^@\/contexts\/AuthContext$/},()=>({path:'auth',namespace:'mock'}));
 b.onResolve({filter:/^@\/components\/LayoutShell$/},()=>({path:'shell',namespace:'mock'}));
 b.onResolve({filter:/^@\/components\/(Dashboard|FirstDollarDashboard)$/},()=>({path:'dashboard',namespace:'mock'}));
 b.onResolve({filter:/^@\/components\/Profile$/},()=>({path:'profile',namespace:'mock'}));
 b.onResolve({filter:/firebase\/firestore$/},()=>({path:'firestore',namespace:'mock'}));
 b.onResolve({filter:/^\.\.\/firebase$/},()=>({path:'firebase',namespace:'mock'}));
 b.onResolve({filter:/^\.\.\/services\/firstDollarJourney$/},()=>({path:'journey',namespace:'mock'}));
 b.onResolve({filter:/^\.\/routes\//},args=>kept.has(path.basename(args.path))?null:{path:args.path,namespace:'stubroute'});
 b.onLoad({filter:/.*/,namespace:'stubroute'},args=>({contents:`import {createFileRoute} from '@tanstack/react-router'; export const Route=createFileRoute('/${path.basename(args.path)}')({component:()=>null});`,loader:'jsx',resolveDir:root}));
 b.onLoad({filter:/.*/,namespace:'mock'},args=>({contents:mocks[args.path],loader:'jsx',resolveDir:root}));
}}]});
console.log('Launching browser');
const browser = await chromium.launch({headless:true, timeout: 15000});
try {
 const page=await browser.newPage();
 page.on('pageerror', error => console.error('PAGE ERROR', error));
 page.on('console', msg => { if (msg.type() === 'error') console.error('BROWSER', msg.text()); });
 page.setDefaultTimeout(10000);
 await page.route('**/*',r=>r.request().url().startsWith('https://local.test/')?r.fulfill({contentType:'text/html',body:'<div id="root"></div>'}):r.abort());
 const open=async url=>{await page.goto('https://local.test'+url);await page.addScriptTag({content:bundle.outputFiles[0].text});};
 if(!process.env.TEST_CASE || process.env.TEST_CASE === 'pre-effect'){
  for (const route of ['/dashboard','/first-dollar']) {
   for (const switches of [['B'], ['B','A']]) {
    await page.goto('https://local.test'+route);
    await page.evaluate(switches=>{window.beforeEffectsSwitch=switches},switches);
    await page.addScriptTag({content:bundle.outputFiles[0].text});
    const expected=switches[switches.length-1];
    await page.waitForFunction(expected=>document.querySelector('#today-answer')?.value===expected+' current',expected);
    assert.equal(await page.evaluate(()=>window.switchedBeforeEffects),true);
    assert.deepEqual(await page.evaluate(()=>window.ensureCalls),[expected],`${route}: stale rendered generation must not dispatch`);
    console.log(`PASS ${route}: A to ${switches.join(' to ')} before passive effect`);
   }
  }
 }
 if(process.env.TEST_CASE !== 'race' && process.env.TEST_CASE !== 'pre-effect'){
  await open('/help');
  const link=page.getByRole('link',{name:/Getting Started/});
  await link.focus(); await page.keyboard.press('Enter');
  await page.getByRole('heading',{name:'Getting Started',exact:true}).waitFor({timeout:3000});
  assert.equal(new URL(page.url()).pathname,'/help/getting-started');
  await page.reload(); await page.addScriptTag({content:bundle.outputFiles[0].text});
  await page.getByRole('heading',{name:'Getting Started',exact:true}).waitFor();
  await page.getByRole('button',{name:'Back to Help Center'}).click();
  assert.equal(new URL(page.url()).pathname,'/help');
  const sections=[['getting-started','Getting Started'],['branding','Branding Engine'],['studio-workflow','Content Studio Workflow'],['scene-planner','Scene Planner'],['retention-lab','Retention Lab'],['video-studio','Video Studio'],['first-dollar','First Dollar Dashboard']];
  for (const [slug,title] of sections) {
    const articleLink=page.locator(`a[href="/help/${slug}"]`);
    assert.equal(await articleLink.count(),1);
    await articleLink.click();
    await page.getByRole('heading',{name:title,exact:true}).waitFor();
    await page.getByRole('button',{name:'Back to Help Center'}).click();
  }
  await page.goBack(); await page.getByRole('heading',{name:'First Dollar Dashboard',exact:true}).waitFor();
  await page.evaluate(()=>window.router.navigate({to:'/community'}));
  await page.getByRole('button',{name:'View My Page'}).click();
  await page.getByRole('heading',{name:'Profile page'}).waitFor({timeout:3000});
  assert.equal(new URL(page.url()).pathname,'/profile');
  console.log('PASS navigation keyboard, reload, back and profile');
 }
 if(process.env.TEST_CASE !== 'navigation' && process.env.TEST_CASE !== 'pre-effect'){
  for (const route of ['/dashboard','/first-dollar']) {
  await open(route);
  const answer=page.locator('#today-answer'); await answer.waitFor();
  assert.equal(await answer.inputValue(),'A current');
  await answer.fill('A pending'); await page.getByRole('button',{name:'Save answer'}).click();
  await page.waitForFunction(()=>!!window.pending);
  await page.evaluate(()=>window.switchAccount('B'));
  await page.waitForFunction(()=>document.querySelector('#today-answer')?.value==='B current');
  await page.evaluate(()=>window.switchAccount('A'));
  await page.waitForFunction(()=>document.querySelector('#today-answer')?.value==='A current');
  await page.evaluate(()=>window.pending.resolve({uid:'A',version:1,currentStep:'direction',status:'in_progress',answers:{direction:'A stale'},completedSteps:[]}));
  await page.waitForTimeout(100);
  assert.equal(await answer.inputValue(),'A current');
  assert.equal(await page.getByText('Answer saved. Mark the task complete when you are ready.').count(),0);
  await answer.fill('A failed pending'); await page.getByRole('button',{name:'Save answer'}).click();
  await page.waitForFunction(()=>window.pending?.action?.answer==='A failed pending');
  await page.evaluate(()=>{window.oldPending=window.pending;window.switchAccount('B')});
  await page.waitForFunction(()=>document.querySelector('#today-answer')?.value==='B current');
  await answer.fill('B saved'); await page.getByRole('button',{name:'Save answer'}).click();
  await page.waitForFunction(()=>window.pending?.uid==='B');
  await page.evaluate(()=>window.oldPending.reject(new Error('old failure')));
  await page.waitForTimeout(100);
  assert.equal(await page.getByRole('alert').count(),0);
  assert.equal(await page.getByRole('button',{name:'Saving…'}).isDisabled(),true);
  await page.evaluate(()=>window.pending.resolve({uid:'B',version:1,currentStep:'direction',status:'in_progress',answers:{direction:'B saved'},completedSteps:[]}));
  await page.getByText('Answer saved. Mark the task complete when you are ready.').waitFor();
  assert.equal(await answer.inputValue(),'B saved');
  console.log(`PASS ${route}: delayed A to B to A result isolation, stale rejection and current save`);
  }
 }
} finally {await browser.close();}
