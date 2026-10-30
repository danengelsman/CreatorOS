/* global window, document, sessionStorage, navigator, process, console, Storage */
// Real Studio route and editor in Chromium; only external IO and unrelated tools are doubled.
import { build } from 'esbuild';
import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

const root = process.cwd();
const harness = `
import React, {useState} from 'react';
import {createRoot} from 'react-dom/client';
import {createRootRoute, createRoute, createRouter, RouterProvider, Outlet, Link} from '@tanstack/react-router';
import {Route as fileRoute} from './src/routes/_auth.studio.$projectId';
import {AuthContext} from '@/contexts/AuthContext';
import {auth} from '@/firebase';
import {useWorkspaceStore} from '@/store/workspaceStore';
window.listeners=[]; window.writes=[];
const initialToken=useWorkspaceStore.getState().changeAccount('A'); auth.currentUser={uid:'A'};
function App(){
 const [account,setAccount]=useState({user:{uid:'A'},workspaceToken:initialToken});
 window.switchAccount=(uid)=>{const workspaceToken=useWorkspaceStore.getState().changeAccount(uid); auth.currentUser={uid}; setAccount({user:{uid},workspaceToken});};
 return <AuthContext.Provider value={account}><Link to="/studio">Shell studio</Link><Outlet/></AuthContext.Provider>;
}
const rootRoute=createRootRoute({component:App});
const studio=createRoute({getParentRoute:()=>rootRoute,path:'/studio',component:()=> <div>Studio home</div>});
const project=fileRoute.update({getParentRoute:()=>rootRoute,id:'/studio/$projectId',path:'/studio/$projectId'});
const router=createRouter({routeTree:rootRoute.addChildren([studio,project])});
window.router=router;
createRoot(document.getElementById('root')).render(<RouterProvider router={router}/>);
`;
const mocks = {
  authContext: `import React from 'react'; export const AuthContext=React.createContext(null); export const useAuth=()=>React.useContext(AuthContext);`,
  firebase: `export const auth={currentUser:null}, db={}, serverTimestamp=()=>1; export const apiFetch=async()=>({ok:true,json:async()=>({text:'{}'})});`,
  firestore: `
export const doc=(_db,_col,id)=>({id}), collection=()=>({}), query=()=>({}), where=()=>({}), orderBy=()=>({});
export const onSnapshot=(ref,next,error)=>{const entry={ref,next,error,active:true}; window.listeners.push(entry); return ()=>{entry.active=false}};
export const getDocs=async()=>({docs:[]});
export const getDocFromServer=async()=>{if(window.holdRefresh) await new Promise(resolve=>window.releaseRefresh=resolve); return {exists:()=>!!window.remote,data:()=>window.remote,metadata:{fromCache:false,hasPendingWrites:false}}};
export const addDoc=async()=>{throw Error('unexpected create')}; export const updateDoc=async()=>{throw Error('unexpected update')};
export const runTransaction=async(_db,fn)=>{if(window.holdSave) await new Promise(resolve=>window.releaseSave=resolve); return fn({get:async()=>({exists:()=>!!window.remote,data:()=>window.remote}),update:(ref,changes)=>{window.writes.push({id:ref.id,changes}); for(const [key,value] of Object.entries(changes)){if(key.startsWith('data.'))window.remote.data[key.slice(5)]=value;else window.remote[key]=value}}});};`,
  gemini: `export const analyzeAndOptimizeRetention=async()=>({}); export const generateScenePlan=async()=>({}); export const repurposeContent=async()=>({}); export const scoreContent=async()=>({}); export const quickPolish=async x=>x; export const remixContent=async x=>x; export const generateContentIdeas=async()=>[]; export const optimizeSearchTerms=async()=>''; export const generateSmartSuggestions=async()=>({}); export const transcribeAudio=async()=>'';`,
  journey: `export const recordJourneyEvent=async()=>{};`,
  child: `import React from 'react'; export default function Stub(){return null}`,
};
const bundle=await build({stdin:{contents:harness,resolveDir:root,sourcefile:'route-harness.tsx',loader:'tsx'},bundle:true,write:false,preserveSymlinks:true,format:'iife',platform:'browser',plugins:[{name:'boundaries',setup(b){
 b.onResolve({filter:/^react$/},()=>({path:require.resolve('react')}));
 b.onResolve({filter:/^@\/contexts\/AuthContext$/},()=>({path:'authContext',namespace:'mock'}));
 b.onResolve({filter:/^(?:@\/firebase|\.\.\/firebase)$/},()=>({path:'firebase',namespace:'mock'}));
 b.onResolve({filter:/^firebase\/firestore$/},()=>({path:'firestore',namespace:'mock'}));
 b.onResolve({filter:/services\/gemini$/},()=>({path:'gemini',namespace:'mock'}));
 b.onResolve({filter:/services\/creatorJourney$/},()=>({path:'journey',namespace:'mock'}));
 b.onResolve({filter:/\/(VideoStudio|CalendarView|CustomVideoPlayer|AIToolPanel|ContentIdeaGenerator|Confetti)$/},()=>({path:'child',namespace:'mock'}));
 b.onLoad({filter:/.*/,namespace:'mock'},args=>({contents:mocks[args.path],loader:'jsx',resolveDir:root}));
}}]});
const browser=await chromium.launch({headless:true});
try {
 for(const failure of ['missing','denied','owner','type']) {
  const page=await browser.newPage();
  page.on('pageerror', error => console.error('PAGE ERROR', error));
  await page.route('https://studio.test/**',route=>route.fulfill({contentType:'text/html',body:'<div id="root"></div>'}));
  await page.goto('https://studio.test/studio/p1');
  await page.addScriptTag({content:bundle.outputFiles[0].text});
  await page.waitForFunction(()=>window.listeners.length===1);
  await page.evaluate(()=>{window.remote={userId:'A',type:'content',name:'Title',data:{title:'Title',body:'Original',platform:'youtube'}};window.listeners[0].next({id:'p1',exists:()=>true,data:()=>window.remote})});
  const input=page.getByLabel('Project script'); await input.fill('Private draft A');
  await page.evaluate(()=>{window.holdSave=true;});
  await page.getByRole('button',{name:'Save',exact:true}).click();
  await page.waitForFunction(()=>typeof window.releaseSave==='function');
  await page.evaluate(failure=>{const l=window.listeners[0]; if(failure==='missing'){window.remote=null;l.next({exists:()=>false})}else if(failure==='denied') l.error(Error('permission-denied')); else l.next({id:'p1',exists:()=>true,data:()=>({...window.remote,...(failure==='owner'?{userId:'B'}:{type:'brand'})})})},failure);
  await page.getByText(/copy your draft/i).first().waitFor();
  assert.equal(await input.inputValue(),'Private draft A');
  await page.evaluate(()=>window.releaseSave());
  await page.waitForFunction(()=>document.querySelector('[role=alert]')?.textContent.includes('Saving is disabled'));
  await page.waitForTimeout(100);
  assert.equal(await page.getByRole('button',{name:'Save',exact:true}).isDisabled(),true);
  assert.deepEqual(await page.evaluate(()=>window.writes),[]);
  await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>{window.copied=text}}}));
  await page.getByRole('button',{name:'Copy draft'}).click();
  assert.match(await page.evaluate(()=>window.copied),/Private draft A/);
  assert.match(await page.evaluate(()=>sessionStorage.getItem('studio-draft:A:p1')),/Private draft A/);
  page.once('dialog',dialog=>dialog.dismiss());
  await page.getByRole('button',{name:'Back to projects'}).click();
  assert.equal(await input.inputValue(),'Private draft A');
  page.once('dialog',dialog=>dialog.dismiss());
  await page.getByRole('link',{name:'Shell studio'}).click();
  assert.equal(await input.inputValue(),'Private draft A');
  page.once('dialog',dialog=>dialog.accept());
  await page.reload();
  await page.addScriptTag({content:bundle.outputFiles[0].text});
  await page.waitForFunction(()=>window.listeners.length===1);
  await page.evaluate(failure=>{const l=window.listeners[0]; if(failure==='denied') l.error(Error('permission-denied')); else l.next({exists:()=>false});},failure);
  const recovered=page.getByLabel('Recovered draft');
  await recovered.waitFor(); assert.match(await recovered.inputValue(),/Private draft A/);
  page.once('dialog',dialog=>dialog.dismiss());
  await page.getByRole('link',{name:'Back to Studio'}).click();
  assert.match(await recovered.inputValue(),/Private draft A/);
  await page.evaluate(()=>window.switchAccount('B'));
  await page.waitForFunction(()=>window.listeners.length===2);
  assert.equal(await input.count(),0);
  assert.equal(await recovered.count(),0);
  await page.evaluate(()=>{window.remote={userId:'B',type:'content',name:'B title',data:{title:'B title',body:'B content',platform:'youtube'}}; window.listeners[1].next({id:'p1',exists:()=>true,data:()=>window.remote});window.listeners[0].next({id:'p1',exists:()=>true,data:()=>({userId:'A',type:'content',data:{body:'Private draft A'}})})});
  await input.waitFor(); assert.equal(await input.inputValue(),'B content');
  await page.close();
 }
 for(const [name,platform] of [['The Contrarian Thread','twitter'],['3 Reasons Why','tiktok'],['Behind the Scenes Process','instagram'],['The "How I..." Story','youtube']]) {
  const page=await browser.newPage(); await page.route('https://studio.test/**',route=>route.fulfill({contentType:'text/html',body:'<div id="root"></div>'})); await page.goto('https://studio.test/studio/p1'); await page.addScriptTag({content:bundle.outputFiles[0].text});
  await page.waitForFunction(()=>window.listeners.length===1);
  await page.evaluate(()=>{window.remote={userId:'A',type:'content',name:'Title',data:{title:'Title',body:'Original',platform:'youtube'}};window.listeners[0].next({id:'p1',exists:()=>true,data:()=>window.remote})});
  await page.getByRole('button',{name:'Templates',exact:true}).click();
  await page.getByText(name,{exact:true}).first().click();
  page.once('dialog',dialog=>dialog.accept());
  await page.getByRole('button',{name:/Use Template/i}).click();
  await page.getByLabel('Project script').waitFor();
  await page.getByRole('button',{name:'Save',exact:true}).click();
  await page.waitForFunction(()=>window.writes.length===1);
  assert.equal(await page.evaluate(()=>window.remote.data.platform),platform);
  await page.waitForFunction(()=>document.querySelector('[role=status]')?.textContent.includes('No unsaved'));
  await page.evaluate(()=>window.router.navigate({to:'/studio'}));
  await page.getByText('Studio home').waitFor();
  await page.evaluate(()=>window.router.navigate({to:'/studio/p1'}));
  await page.waitForFunction(()=>window.listeners.length===2);
  await page.evaluate(()=>window.listeners[1].next({id:'p1',exists:()=>true,data:()=>window.remote}));
  await page.getByLabel('Project script').waitFor();
  assert.equal(await page.evaluate(()=>window.remote.data.platform),platform);
  const label={twitter:'X',tiktok:'TikTok',instagram:'Instagram',youtube:'YouTube'}[platform];
  assert.match(await page.locator('section').filter({has:page.getByLabel('Project script')}).last().getByRole('button',{name:label,exact:true}).getAttribute('class'),/ios-elevated/);
  await page.close();
 }
 {
  const page=await browser.newPage();
  await page.route('https://studio.test/**',route=>route.fulfill({contentType:'text/html',body:'<div id="root"></div>'}));
  await page.goto('https://studio.test/studio/p1'); await page.addScriptTag({content:bundle.outputFiles[0].text});
  await page.waitForFunction(()=>window.listeners.length===1);
  await page.evaluate(()=>{window.remote={userId:'A',type:'content',name:'Title',data:{title:'Title',body:'Original',platform:'youtube'}};window.listeners[0].next({id:'p1',exists:()=>true,data:()=>window.remote})});
  const input=page.getByLabel('Project script'); await input.fill('A remains private');
  await page.evaluate(()=>window.listeners[0].error(Error('permission-denied')));
  await page.getByRole('button',{name:'Copy draft'}).waitFor();
  await page.evaluate(()=>window.switchAccount('B'));
  await page.waitForFunction(()=>window.listeners.length===2);
  assert.equal(await input.count(),0);
  await page.evaluate(()=>{window.remote={userId:'B',type:'content',name:'B',data:{title:'B',body:'B only',platform:'youtube'}};window.listeners[1].next({id:'p1',exists:()=>true,data:()=>window.remote});window.listeners[0].next({id:'p1',exists:()=>true,data:()=>({userId:'A',type:'content',data:{body:'A remains private'}})})});
  await input.waitFor(); assert.equal(await input.inputValue(),'B only');
  await page.close();
 }
 {
  const page=await browser.newPage();
  await page.route('https://studio.test/**',route=>route.fulfill({contentType:'text/html',body:'<div id="root"></div>'}));
  await page.goto('https://studio.test/studio/p1'); await page.addScriptTag({content:bundle.outputFiles[0].text});
  await page.waitForFunction(()=>window.listeners.length===1);
  await page.evaluate(()=>{window.remote={userId:'A',type:'content',name:'Title',data:{title:'Title',body:'Original',platform:'youtube'}};window.listeners[0].next({id:'p1',exists:()=>true,data:()=>window.remote});window.holdRefresh=true});
  const input=page.getByLabel('Project script'); await input.fill('Draft during refresh');
  await page.getByRole('button',{name:'Save',exact:true}).click(); await page.waitForFunction(()=>typeof window.releaseRefresh==='function');
  await page.evaluate(()=>{window.listeners[0].error(Error('permission-denied'));window.releaseRefresh()});
  await page.getByRole('button',{name:'Copy draft'}).waitFor();
  await page.waitForFunction(()=>document.body.innerText.includes('Could not save your draft'));
  assert.match(await page.evaluate(()=>sessionStorage.getItem('studio-draft:A:p1')),/Draft during refresh/);
  assert.equal(await input.inputValue(),'Draft during refresh');
  await page.close();
 }
 {
  const page=await browser.newPage();
  await page.route('https://studio.test/**',route=>route.fulfill({contentType:'text/html',body:'<div id="root"></div>'}));
  await page.goto('https://studio.test/studio/p1'); await page.addScriptTag({content:bundle.outputFiles[0].text});
  await page.waitForFunction(()=>window.listeners.length===1);
  await page.evaluate(()=>{window.remote={userId:'A',type:'content',name:'Title',data:{title:'Title',body:'Original',platform:'youtube'}};window.listeners[0].next({id:'p1',exists:()=>true,data:()=>window.remote}); Storage.prototype.setItem=()=>{throw Error('quota')};});
  const input=page.getByLabel('Project script'); await input.fill('Unstored draft');
  await page.evaluate(()=>{window.remote=null;window.listeners[0].next({exists:()=>false});Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{throw Error('denied')}}})});
  await page.getByRole('button',{name:'Copy draft'}).click();
  await page.getByText('Copy unavailable. Select and copy the title and script from the editor.').waitFor();
  assert.equal(await input.inputValue(),'Unstored draft');
  page.once('dialog',dialog=>{assert.match(dialog.message(),/recovery is unavailable/i);return dialog.dismiss()});
  await page.getByRole('button',{name:'Back to projects'}).click(); assert.equal(await input.inputValue(),'Unstored draft');
  await page.close();
 }
 {
  const page=await browser.newPage();
  await page.route('https://studio.test/**',route=>route.fulfill({contentType:'text/html',body:'<div id="root"></div>'}));
  await page.goto('https://studio.test/studio/p1'); await page.addScriptTag({content:bundle.outputFiles[0].text});
  await page.waitForFunction(()=>window.listeners.length===1);
  await page.evaluate(()=>{window.remote={userId:'A',type:'content',name:'Title',data:{title:'Title',body:'Original',platform:'youtube'}};window.listeners[0].next({id:'p1',exists:()=>true,data:()=>window.remote})});
  await page.getByLabel('Project script').waitFor(); await page.getByRole('button',{name:'Templates',exact:true}).click();
  await page.getByText('The Common Mistake',{exact:true}).first().click(); await page.getByRole('button',{name:/Use Template/i}).click();
  await page.getByText('This template’s platform is not supported in the editor. Choose a different template.').waitFor();
  await page.getByRole('button',{name:'Editor',exact:true}).click(); assert.equal(await page.getByLabel('Project script').inputValue(),'Original');
  assert.deepEqual(await page.evaluate(()=>window.writes),[]); await page.close();
 }
 console.log('Studio route recovery and template roundtrip passed');
} finally {await browser.close()}
