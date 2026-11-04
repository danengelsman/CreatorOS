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
export const getDocFromServer=async()=>{if(window.holdRefresh) await new Promise(resolve=>window.releaseRefresh=resolve); if(window.failRefresh) throw Error('offline'); return {exists:()=>!!window.remote,data:()=>window.remote,metadata:window.refreshMetadata ?? {fromCache:false,hasPendingWrites:false}}};
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
const newPage=async()=>{const page=await browser.newPage(); await page.route('**/*',route=>route.abort()); return page;};
try {
 // The same legacy key can represent two different account/project pairs.
 for(const [uid,projectId] of [['A:legacy','p1'],['A','legacy:p1']]) {
  const page=await newPage();
  await page.route('https://studio.test/**',route=>route.fulfill({contentType:'text/html',body:'<div id="root"></div>'}));
  await page.goto(`https://studio.test/studio/${projectId}`);
  const old=JSON.stringify({draft:{title:'Secret',body:'Ambiguous private draft',platform:'youtube'},baseline:{title:'Secret',body:'Original',platform:'youtube',name:'Secret'}});
  await page.evaluate(old=>sessionStorage.setItem('studio-draft:A:legacy:p1',old),old);
  await page.addScriptTag({content:bundle.outputFiles[0].text});
  await page.waitForFunction(()=>window.listeners.length===1);
  if(uid!=='A') { await page.evaluate(uid=>window.switchAccount(uid),uid); await page.waitForFunction(()=>window.listeners.length===2); }
  await page.evaluate(({uid,projectId})=>{window.remote={userId:uid,type:'content',name:'Title',data:{title:'Title',body:'Current account',platform:'youtube'}};window.listeners.at(-1).next({id:projectId,exists:()=>true,data:()=>window.remote})},{uid,projectId});
  const input=page.getByLabel('Project script'); await input.waitFor();
  assert.equal(await input.inputValue(),'Current account');
  await page.getByText(/older draft may not be recoverable automatically/i).waitFor();
  assert.equal(await page.getByText('Ambiguous private draft').count(),0);
  await input.fill('New scoped draft '+uid);
  const key=`studio-draft-v2:${JSON.stringify([uid,projectId])}`;
  await page.waitForFunction(key=>sessionStorage.getItem(key)?.includes('New scoped draft'),key);
  assert.equal(await page.evaluate(()=>sessionStorage.getItem('studio-draft:A:legacy:p1')),old);
  page.once('dialog',dialog=>dialog.accept()); await page.reload();
  await page.addScriptTag({content:bundle.outputFiles[0].text}); await page.waitForFunction(()=>window.listeners.length===1);
  if(uid!=='A') { await page.evaluate(uid=>window.switchAccount(uid),uid); await page.waitForFunction(()=>window.listeners.length===2); }
  await page.evaluate(()=>window.listeners.at(-1).next({exists:()=>false}));
  await page.getByText(/older draft may not be recoverable automatically/i).waitFor();
  assert.match(await page.getByLabel('Recovered draft').inputValue(),new RegExp('New scoped draft '+uid));
  assert.equal(await page.evaluate(()=>sessionStorage.getItem('studio-draft:A:legacy:p1')),old);
  await page.close();
 }
 // Warning does not reveal whether an ambiguous legacy entry exists.
 for(const present of [false,true]) {
  const page=await newPage();
  await page.route('https://studio.test/**',route=>route.fulfill({contentType:'text/html',body:'<div id="root"></div>'}));
  await page.goto('https://studio.test/studio/legacy:p1');
  if(present) await page.evaluate(()=>sessionStorage.setItem('studio-draft:A:legacy:p1',JSON.stringify({draft:{title:'Secret',body:'Do not show',platform:'youtube'}})));
  await page.addScriptTag({content:bundle.outputFiles[0].text}); await page.waitForFunction(()=>window.listeners.length===1);
  await page.evaluate(()=>window.listeners[0].next({exists:()=>false}));
  await page.getByText(/older draft may not be recoverable automatically/i).waitFor();
  assert.equal(await page.getByLabel('Recovered draft').count(),0);
  assert.equal(await page.getByText('Do not show').count(),0);
  assert.equal(!!await page.evaluate(()=>sessionStorage.getItem('studio-draft:A:legacy:p1')),present);
  await page.close();
 }
 // Both v2 records coexist in one tab despite the shared old key.
 {
  const page=await newPage();
  await page.route('https://studio.test/**',route=>route.fulfill({contentType:'text/html',body:'<div id="root"></div>'}));
  await page.goto('https://studio.test/studio/p1');
  const values=await page.evaluate(()=>{
   const record=body=>JSON.stringify({draft:{title:'T',body,platform:'youtube'},baseline:{title:'T',body:'original',platform:'youtube',name:'T'}});
   const old=record('Ambiguous secret'), first=record('First owner secret'), second=record('Second owner secret');
   const k1=`studio-draft-v2:${JSON.stringify(['A:legacy','p1'])}`, k2=`studio-draft-v2:${JSON.stringify(['A','legacy:p1'])}`;
   sessionStorage.setItem('studio-draft:A:legacy:p1',old);sessionStorage.setItem(k1,first);sessionStorage.setItem(k2,second);
   return {old,first,second,k1,k2};
  });
  await page.addScriptTag({content:bundle.outputFiles[0].text}); await page.waitForFunction(()=>window.listeners.length===1);
  await page.evaluate(()=>window.switchAccount('A:legacy')); await page.waitForFunction(()=>window.listeners.length===2);
  await page.evaluate(()=>window.listeners.at(-1).next({exists:()=>false}));
  assert.match(await page.getByLabel('Recovered draft').inputValue(),/First owner secret/);
  await page.getByText(/older draft may not be recoverable automatically/i).waitFor();
  await page.evaluate(()=>window.switchAccount('A')); await page.waitForFunction(()=>window.listeners.length===3);
  page.once('dialog',dialog=>dialog.accept());
  await page.evaluate(()=>window.router.navigate({to:'/studio/$projectId',params:{projectId:'legacy:p1'}}));
  await page.waitForFunction(()=>window.listeners.some(l=>l.active && l.ref.id==='legacy:p1'));
  await page.evaluate(()=>window.listeners.find(l=>l.active && l.ref.id==='legacy:p1').next({exists:()=>false}));
  assert.match(await page.getByLabel('Recovered draft').inputValue(),/Second owner secret/);
  assert.doesNotMatch(await page.getByLabel('Recovered draft').inputValue(),/First owner secret|Ambiguous secret/);
  assert.deepEqual(await page.evaluate(v=>[sessionStorage.getItem('studio-draft:A:legacy:p1'),sessionStorage.getItem(v.k1),sessionStorage.getItem(v.k2)],values),[values.old,values.first,values.second]);
  await page.close();
 }
 for(const failure of ['missing','denied','owner','type']) {
  const page=await newPage();
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
  const page=await newPage(); await page.route('https://studio.test/**',route=>route.fulfill({contentType:'text/html',body:'<div id="root"></div>'})); await page.goto('https://studio.test/studio/p1'); await page.addScriptTag({content:bundle.outputFiles[0].text});
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
  const page=await newPage();
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
  const page=await newPage();
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
  const page=await newPage();
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
  const page=await newPage();
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
 {
  const page=await newPage();
  await page.route('https://studio.test/**',route=>route.fulfill({contentType:'text/html',body:'<div id="root"></div>'}));
  await page.goto('https://studio.test/studio/p1'); await page.addScriptTag({content:bundle.outputFiles[0].text});
  await page.waitForFunction(()=>window.listeners.length===1);
  await page.evaluate(()=>{window.remote={userId:'A',type:'content',name:'Title',data:{title:'Title',body:'Original',platform:'youtube'}};window.listeners[0].next({id:'p1',exists:()=>true,data:()=>window.remote});Storage.prototype.setItem=()=>{throw Error('quota')};});
  await page.getByLabel('Project script').fill('Memory-only private A');
  await page.evaluate(()=>window.listeners[0].error(Error('permission-denied')));
  await page.getByRole('button',{name:'Copy draft'}).waitFor();
  await page.evaluate(()=>window.switchAccount('B'));
  await page.waitForFunction(()=>window.listeners.length===2);
  await page.evaluate(()=>window.listeners[1].error(Error('permission-denied')));
  await page.getByText('Unable to load project').waitFor();
  assert.equal(await page.getByLabel('Recovered draft').count(),0);
  assert.doesNotMatch(await page.locator('body').innerText(),/Memory-only private A/);
  await page.evaluate(()=>window.switchAccount('A'));
  await page.waitForFunction(()=>window.listeners.length===3);
  await page.evaluate(()=>window.listeners[2].error(Error('permission-denied')));
  const recovered=page.getByLabel('Recovered draft'); await recovered.waitFor();
  assert.match(await recovered.inputValue(),/Memory-only private A/);
  assert.match(await page.locator('body').innerText(),/reload|close/i);
  await page.close();
 }
 // A newer memory-only draft must supersede the older storage-backed record.
 // A successful save must clear recovery rather than resurrecting that old copy.
 for (const unavailable of ['missing','denied']) {
  const page=await newPage();
  await page.route('https://studio.test/**',route=>route.fulfill({contentType:'text/html',body:'<div id="root"></div>'}));
  await page.goto('https://studio.test/studio/p1'); await page.addScriptTag({content:bundle.outputFiles[0].text});
  await page.waitForFunction(()=>window.listeners.length===1);
  await page.evaluate(()=>{window.remote={userId:'A',type:'content',name:'Title',data:{title:'Title',body:'Original',platform:'youtube'}};window.listeners[0].next({id:'p1',exists:()=>true,data:()=>window.remote});});
  const input=page.getByLabel('Project script'); await input.fill('Older stored A');
  await page.evaluate(()=>{window.oldSet=Storage.prototype.setItem;Storage.prototype.setItem=()=>{throw Error('quota')};});
  await input.fill('Newer memory A');
  await page.getByText(/only and will be lost on reload/).first().waitFor();
  await page.evaluate(()=>window.switchAccount('B')); await page.waitForFunction(()=>window.listeners.length===2);
  await page.evaluate(()=>{window.remote={userId:'B',type:'content',name:'B',data:{title:'B',body:'B only',platform:'youtube'}};window.listeners[1].next({id:'p1',exists:()=>true,data:()=>window.remote})});
  await input.waitFor(); assert.equal(await input.inputValue(),'B only'); await input.fill('Private B');
  await page.evaluate(()=>window.switchAccount('A')); await page.waitForFunction(()=>window.listeners.length===3);
  await page.evaluate(()=>{window.remote={userId:'A',type:'content',name:'Title',data:{title:'Title',body:'Original',platform:'youtube'}};window.listeners[2].next({id:'p1',exists:()=>true,data:()=>window.remote})});
  await input.waitFor(); assert.equal(await input.inputValue(),'Newer memory A');
  await input.fill('New edit saved A');
  await page.getByRole('button',{name:'Save',exact:true}).click();
  await page.waitForFunction(()=>window.writes.length===1);
  await page.waitForFunction(()=>document.querySelector('[role=status]')?.textContent.includes('No unsaved'));
  assert.equal(await page.evaluate(()=>window.remote.data.body),'New edit saved A');
  await page.evaluate(()=>window.switchAccount('B')); await page.waitForFunction(()=>window.listeners.length===4);
  await page.evaluate(()=>window.listeners[3].error(Error('denied')));
  const recovered=page.getByLabel('Recovered draft'); await recovered.waitFor(); assert.match(await recovered.inputValue(),/Private B/);
  await page.evaluate(()=>window.switchAccount('A')); await page.waitForFunction(()=>window.listeners.length===5);
  await page.evaluate(unavailable=>{if(unavailable==='missing') window.listeners[4].next({exists:()=>false}); else window.listeners[4].error(Error('denied'))},unavailable);
  await page.getByText(unavailable==='missing'?'Project not found':'Unable to load project').waitFor();
  assert.equal(await recovered.count(),0);
  await page.close();
 }
 // An old in-flight save resolving after A → B → A must not overwrite the new
 // generation's recovery, or clear its unresolved save record.
 {
  const page=await newPage();
  await page.route('https://studio.test/**',route=>route.fulfill({contentType:'text/html',body:'<div id="root"></div>'}));
  await page.goto('https://studio.test/studio/p1'); await page.addScriptTag({content:bundle.outputFiles[0].text});
  await page.waitForFunction(()=>window.listeners.length===1);
  await page.evaluate(()=>{window.remote={userId:'A',type:'content',name:'Title',data:{title:'Title',body:'Original',platform:'youtube'}};window.listeners[0].next({id:'p1',exists:()=>true,data:()=>window.remote});Storage.prototype.setItem=()=>{throw Error('quota')};window.holdSave=true;});
  const input=page.getByLabel('Project script'); await input.fill('Old in-flight A');
  await page.getByRole('button',{name:'Save',exact:true}).click(); await page.waitForFunction(()=>typeof window.releaseSave==='function');
  await page.evaluate(()=>window.switchAccount('B')); await page.waitForFunction(()=>window.listeners.length===2);
  await page.evaluate(()=>window.listeners[1].error(Error('denied'))); await page.getByText('Unable to load project').waitFor();
  assert.equal(await page.getByLabel('Recovered draft').count(),0);
  await page.evaluate(()=>window.switchAccount('A')); await page.waitForFunction(()=>window.listeners.length===3);
  await page.evaluate(()=>window.listeners[2].next({id:'p1',exists:()=>true,data:()=>window.remote}));
  await input.waitFor(); assert.equal(await input.inputValue(),'Old in-flight A'); await input.fill('New generation A');
  await page.evaluate(()=>window.releaseSave()); await page.waitForTimeout(100);
  assert.deepEqual(await page.evaluate(()=>window.writes),[]);
  await page.evaluate(()=>window.switchAccount('B')); await page.waitForFunction(()=>window.listeners.length===4);
  await page.evaluate(()=>window.listeners[3].error(Error('denied')));
  await page.evaluate(()=>window.switchAccount('A')); await page.waitForFunction(()=>window.listeners.length===5);
  await page.evaluate(()=>window.listeners[4].next({exists:()=>false}));
  const recovered=page.getByLabel('Recovered draft'); await recovered.waitFor(); assert.match(await recovered.inputValue(),/New generation A/);
  assert.match(await page.locator('body').innerText(),/Project not found/);
  await page.close();
 }
 // A failed remove after a confirmed save must shadow old storage until reload.
 {
  const page=await newPage();
  await page.route('https://studio.test/**',route=>route.fulfill({contentType:'text/html',body:'<div id="root"></div>'}));
  await page.goto('https://studio.test/studio/p1'); await page.addScriptTag({content:bundle.outputFiles[0].text});
  await page.waitForFunction(()=>window.listeners.length===1);
  await page.evaluate(()=>{window.remote={userId:'A',type:'content',name:'Title',data:{title:'Title',body:'Original',platform:'youtube'}};window.listeners[0].next({id:'p1',exists:()=>true,data:()=>window.remote})});
  const input=page.getByLabel('Project script'); await input.fill('Stale stored draft');
  await page.evaluate(()=>{Storage.prototype.setItem=()=>{throw Error('quota')};Storage.prototype.removeItem=()=>{throw Error('denied')};});
  await input.fill('Actually saved'); await page.getByRole('button',{name:'Save',exact:true}).click();
  await page.getByText(/An older local draft may reappear/).waitFor();
  assert.match(await page.evaluate(()=>sessionStorage.getItem('studio-draft:A:p1')),/Stale stored draft/);
  await page.evaluate(()=>window.switchAccount('B')); await page.waitForFunction(()=>window.listeners.length===2);
  await page.evaluate(()=>window.listeners[1].error(Error('denied'))); await page.getByText('Unable to load project').waitFor();
  await page.evaluate(()=>window.switchAccount('A')); await page.waitForFunction(()=>window.listeners.length===3);
  await page.evaluate(()=>window.listeners[2].next({exists:()=>false})); await page.getByText('Project not found').waitFor();
  assert.equal(await page.getByLabel('Recovered draft').count(),0);
  await page.close();
 }
 // A read failure, even when setItem succeeds, requires memory escrow too.
 {
  const page=await newPage();
  await page.route('https://studio.test/**',route=>route.fulfill({contentType:'text/html',body:'<div id="root"></div>'}));
  await page.goto('https://studio.test/studio/p1'); await page.addScriptTag({content:bundle.outputFiles[0].text});
  await page.waitForFunction(()=>window.listeners.length===1);
  await page.evaluate(()=>{window.remote={userId:'A',type:'content',name:'Title',data:{title:'Title',body:'Original',platform:'youtube'}};window.listeners[0].next({id:'p1',exists:()=>true,data:()=>window.remote});Storage.prototype.getItem=()=>{throw Error('denied')};});
  await page.getByLabel('Project script').fill('Read blocked A');
  await page.getByText(/only and will be lost on reload/).first().waitFor();
  await page.evaluate(()=>window.switchAccount('B')); await page.waitForFunction(()=>window.listeners.length===2);
  await page.evaluate(()=>window.listeners[1].error(Error('denied'))); await page.getByText('Unable to load project').waitFor();
  assert.equal(await page.getByLabel('Recovered draft').count(),0);
  await page.evaluate(()=>window.switchAccount('A')); await page.waitForFunction(()=>window.listeners.length===3);
  await page.evaluate(()=>window.listeners[2].next({exists:()=>false}));
  const recovered=page.getByLabel('Recovered draft'); await recovered.waitFor(); assert.match(await recovered.inputValue(),/Read blocked A/);
  await page.close();
 }
 // A failed initial read must not overwrite an unseen storage-backed draft.
 {
  const page=await newPage();
  await page.route('https://studio.test/**',route=>route.fulfill({contentType:'text/html',body:'<div id="root"></div>'}));
  await page.goto('https://studio.test/studio/p1');
  await page.evaluate(()=>{
   sessionStorage.setItem('studio-draft:A:p1',JSON.stringify({draft:{title:'Title',body:'Unseen saved draft',platform:'youtube'},baseline:{title:'Title',body:'Original',platform:'youtube',name:'Title'}}));
   window.originalGet=Storage.prototype.getItem; Storage.prototype.getItem=()=>{throw Error('read denied')};
  });
  await page.addScriptTag({content:bundle.outputFiles[0].text}); await page.waitForFunction(()=>window.listeners.length===1);
  await page.evaluate(()=>{window.remote={userId:'A',type:'content',name:'Title',data:{title:'Title',body:'Original',platform:'youtube'}};window.listeners[0].next({id:'p1',exists:()=>true,data:()=>window.remote})});
  const input=page.getByLabel('Project script'); await input.fill('New memory draft');
  await page.getByText(/only and will be lost on reload/).first().waitFor();
  await page.evaluate(()=>{Storage.prototype.getItem=window.originalGet}); await input.fill('Newer memory draft');
  assert.match(await page.evaluate(()=>sessionStorage.getItem('studio-draft:A:p1')),/Unseen saved draft/);
  await page.evaluate(()=>window.switchAccount('B')); await page.waitForFunction(()=>window.listeners.length===2);
  await page.evaluate(()=>window.listeners[1].error(Error('denied'))); await page.getByText('Unable to load project').waitFor();
  assert.equal(await page.getByLabel('Recovered draft').count(),0);
  await page.evaluate(()=>window.switchAccount('A')); await page.waitForFunction(()=>window.listeners.length===3);
  await page.evaluate(()=>window.listeners[2].next({exists:()=>false}));
  const recovered=page.getByLabel('Recovered draft'); await recovered.waitFor(); assert.match(await recovered.inputValue(),/Newer memory draft/);
  await page.close();
 }
 // Colons in IDs cannot make two account/project pairs share a stored draft.
 {
  const page=await newPage();
  await page.route('https://studio.test/**',route=>route.fulfill({contentType:'text/html',body:'<div id="root"></div>'}));
  await page.goto('https://studio.test/studio/p1'); await page.addScriptTag({content:bundle.outputFiles[0].text});
  await page.waitForFunction(()=>window.listeners.length===1);
  await page.evaluate(()=>window.switchAccount('A:p1')); await page.waitForFunction(()=>window.listeners.length===2);
  await page.evaluate(()=>{window.remote={userId:'A:p1',type:'content',name:'Title',data:{title:'Title',body:'Original',platform:'youtube'}};window.listeners[1].next({id:'p1',exists:()=>true,data:()=>window.remote})});
  await page.getByLabel('Project script').fill('Delimiter private');
  await page.evaluate(()=>window.switchAccount('A')); await page.waitForFunction(()=>window.listeners.length===3);
  await page.evaluate(()=>window.router.navigate({to:'/studio/p1:p1'})); await page.waitForFunction(()=>window.listeners.length===4);
  await page.evaluate(()=>window.listeners[3].next({exists:()=>false})); await page.getByText('Project not found').waitFor();
  assert.equal(await page.getByLabel('Recovered draft').count(),0);
  await page.close();
 }
 // An authoritative read can see a type change before the listener delivers it.
 for (const [memoryOnly, invalid] of [[false,'type'],[true,'type'],[false,'owner'],[true,'owner']]) {
  const page=await newPage();
  await page.route('**/*',route=>route.abort());
  await page.route('https://studio.test/**',route=>route.fulfill({contentType:'text/html',body:'<div id="root"></div>'}));
  await page.goto('https://studio.test/studio/p1'); await page.addScriptTag({content:bundle.outputFiles[0].text});
  await page.waitForFunction(()=>window.listeners.length===1);
  await page.evaluate(()=>{window.remote={userId:'A',type:'content',name:'Title',data:{title:'Title',body:'Original',platform:'youtube'}};window.listeners[0].next({id:'p1',exists:()=>true,data:()=>window.remote})});
  const input=page.getByLabel('Project script');
  if(memoryOnly) await page.evaluate(()=>{Storage.prototype.setItem=()=>{throw Error('quota')}});
  await input.fill('Protected local draft');
  await page.evaluate(()=>{window.remote={...window.remote,data:{...window.remote.data,body:'Remote conflict'}}});
  await page.getByRole('button',{name:'Save',exact:true}).click();
  await page.getByText(/Project changed elsewhere. Your draft was not saved/).waitFor();
  await page.evaluate(invalid=>{window.remote={...window.remote,...(invalid==='type'?{type:'brand'}:{userId:'B'}),data:{...window.remote.data,body:'Not available to A'}}},invalid);
  page.once('dialog',dialog=>dialog.accept());
  await page.getByRole('button',{name:'Discard local draft and load project'}).click();
  await page.getByText(/no longer available to this account/i).waitFor();
  assert.equal(await input.inputValue(),'Protected local draft');
  if(!memoryOnly) assert.match(await page.evaluate(()=>sessionStorage.getItem('studio-draft:A:p1')),/Protected local draft/);
  await page.evaluate(()=>window.switchAccount('B')); await page.waitForFunction(()=>window.listeners.length===2);
  await page.evaluate(()=>window.listeners[1].error(Error('denied'))); await page.getByText('Unable to load project').waitFor();
  assert.equal(await page.getByLabel('Recovered draft').count(),0);
  await page.evaluate(()=>window.switchAccount('A')); await page.waitForFunction(()=>window.listeners.length===3);
  await page.evaluate(()=>window.listeners[2].next({exists:()=>false}));
  const recovered=page.getByLabel('Recovered draft'); await recovered.waitFor(); assert.match(await recovered.inputValue(),/Protected local draft/);
  await page.close();
 }
 // A clean editor must not reconcile a listener delivery to a different type.
 for (const mode of ['clean','stored-edit','memory-edit']) {
  const page=await newPage();
  await page.route('**/*',route=>route.abort());
  await page.route('https://studio.test/**',route=>route.fulfill({contentType:'text/html',body:'<div id="root"></div>'}));
  await page.goto('https://studio.test/studio/p1'); await page.addScriptTag({content:bundle.outputFiles[0].text});
  await page.waitForFunction(()=>window.listeners.length===1);
  await page.evaluate(()=>{window.remote={userId:'A',type:'content',name:'Title',data:{title:'Title',body:'Original',platform:'youtube'}};window.listeners[0].next({id:'p1',exists:()=>true,data:()=>window.remote})});
  const input=page.getByLabel('Project script'); await input.waitFor();
  await page.evaluate(()=>{window.holdRefresh=true;window.listeners[0].next({id:'p1',exists:()=>true,data:()=>({...window.remote,data:{...window.remote.data,body:'Listener update'}})});});
  await page.waitForFunction(()=>typeof window.releaseRefresh==='function');
  if(mode==='memory-edit') await page.evaluate(()=>{Storage.prototype.setItem=()=>{throw Error('quota')}});
  if(mode!=='clean') await input.fill('Edited during read');
  await page.evaluate(()=>{window.remote={...window.remote,type:'brand',data:{...window.remote.data,body:'Not a content project'}};window.releaseRefresh()});
  if(mode!=='clean') {
   await page.waitForTimeout(150);
   assert.equal(await input.inputValue(),'Edited during read');
   if(mode==='stored-edit') assert.match(await page.evaluate(()=>sessionStorage.getItem('studio-draft:A:p1')),/Edited during read/);
   await page.evaluate(()=>window.switchAccount('B')); await page.waitForFunction(()=>window.listeners.length===2);
   await page.evaluate(()=>window.listeners[1].error(Error('denied'))); await page.getByText('Unable to load project').waitFor();
   assert.equal(await page.getByLabel('Recovered draft').count(),0);
   await page.evaluate(()=>window.switchAccount('A')); await page.waitForFunction(()=>window.listeners.length===3);
   await page.evaluate(()=>window.listeners[2].next({exists:()=>false}));
   const recovered=page.getByLabel('Recovered draft'); await recovered.waitFor(); assert.match(await recovered.inputValue(),/Edited during read/);
  } else {
   await page.getByText(/no longer available to this account/i).waitFor();
   assert.equal(await input.inputValue(),'Original');
  }
  await page.close();
 }
 // A verified content project still supports explicit recovery discard.
 {
  const page=await newPage();
  await page.route('**/*',route=>route.abort());
  await page.route('https://studio.test/**',route=>route.fulfill({contentType:'text/html',body:'<div id="root"></div>'}));
  await page.goto('https://studio.test/studio/p1'); await page.addScriptTag({content:bundle.outputFiles[0].text});
  await page.waitForFunction(()=>window.listeners.length===1);
  await page.evaluate(()=>{window.remote={userId:'A',type:'content',name:'Title',data:{title:'Title',body:'Original',platform:'youtube'}};window.listeners[0].next({id:'p1',exists:()=>true,data:()=>window.remote})});
  const input=page.getByLabel('Project script'); await input.fill('Discardable draft');
  await page.evaluate(()=>{window.remote={...window.remote,data:{...window.remote.data,body:'Latest content'}}});
  await page.getByRole('button',{name:'Save',exact:true}).click();
  await page.getByText(/Project changed elsewhere. Your draft was not saved/).waitFor();
  page.once('dialog',dialog=>dialog.accept()); await page.getByRole('button',{name:'Discard local draft and load project'}).click();
  await page.waitForFunction(()=>document.querySelector('[role=status]')?.textContent.includes('No unsaved'));
  assert.equal(await input.inputValue(),'Latest content');
  assert.equal(await page.evaluate(()=>sessionStorage.getItem('studio-draft:A:p1')),null);
  await page.close();
 }
 // A normal content update still reconciles through a verified server read.
 {
  const page=await newPage();
  await page.route('https://studio.test/**',route=>route.fulfill({contentType:'text/html',body:'<div id="root"></div>'}));
  await page.goto('https://studio.test/studio/p1'); await page.addScriptTag({content:bundle.outputFiles[0].text});
  await page.waitForFunction(()=>window.listeners.length===1);
  await page.evaluate(()=>{window.remote={userId:'A',type:'content',name:'Title',data:{title:'Title',body:'Original',platform:'youtube'}};window.listeners[0].next({id:'p1',exists:()=>true,data:()=>window.remote})});
  const input=page.getByLabel('Project script'); await input.waitFor();
  await page.evaluate(()=>{window.remote={...window.remote,data:{...window.remote.data,body:'Verified update'}};window.listeners[0].next({id:'p1',exists:()=>true,data:()=>window.remote})});
  await page.waitForFunction(()=>document.querySelector('[aria-label="Project script"]')?.value==='Verified update');
  assert.equal(await page.getByRole('button',{name:'Save',exact:true}).isDisabled(),false);
  await page.close();
 }
 // A type change during a post-commit refresh also retains unresolved recovery.
 {
  const page=await newPage();
  await page.route('**/*',route=>route.abort());
  await page.route('https://studio.test/**',route=>route.fulfill({contentType:'text/html',body:'<div id="root"></div>'}));
  await page.goto('https://studio.test/studio/p1'); await page.addScriptTag({content:bundle.outputFiles[0].text});
  await page.waitForFunction(()=>window.listeners.length===1);
  await page.evaluate(()=>{window.remote={userId:'A',type:'content',name:'Title',data:{title:'Title',body:'Original',platform:'youtube'}};window.listeners[0].next({id:'p1',exists:()=>true,data:()=>window.remote});window.holdRefresh=true});
  const input=page.getByLabel('Project script'); await input.fill('Saved but recoverable');
  await page.getByRole('button',{name:'Save',exact:true}).click(); await page.waitForFunction(()=>typeof window.releaseRefresh==='function');
  await page.evaluate(()=>{window.remote={...window.remote,type:'brand',data:{...window.remote.data,body:'Not content'}};window.releaseRefresh()});
  await page.getByText(/no longer available to this account/i).waitFor();
  assert.equal(await input.inputValue(),'Saved but recoverable');
  const saved=await page.evaluate(()=>JSON.parse(sessionStorage.getItem('studio-draft:A:p1')));
  assert.equal(saved.draft.body,'Saved but recoverable'); assert.equal(saved.pendingWrites[0].body,'Saved but recoverable');
  assert.equal(await page.getByRole('button',{name:'Save',exact:true}).isDisabled(),true);
  await page.close();
 }
 // A failed or non-authoritative post-save read cannot prune recovery.
 for(const failure of ['offline','cache','pending']) {
  const page=await newPage();
  await page.route('https://studio.test/**',route=>route.fulfill({contentType:'text/html',body:'<div id="root"></div>'}));
  await page.goto('https://studio.test/studio/p1'); await page.addScriptTag({content:bundle.outputFiles[0].text});
  await page.waitForFunction(()=>window.listeners.length===1);
  await page.evaluate(failure=>{window.remote={userId:'A',type:'content',name:'Title',data:{title:'Title',body:'Original',platform:'youtube'}};window.listeners[0].next({id:'p1',exists:()=>true,data:()=>window.remote});window.failRefresh=failure==='offline';if(failure!=='offline') window.refreshMetadata={fromCache:failure==='cache',hasPendingWrites:failure==='pending'}},failure);
  const input=page.getByLabel('Project script'); await input.fill('Unverified saved draft');
  await page.getByRole('button',{name:'Save',exact:true}).click();
  await page.getByText(/save may have completed/).waitFor();
  const recovery=await page.evaluate(()=>JSON.parse(sessionStorage.getItem('studio-draft:A:p1')));
  assert.equal(recovery.draft.body,'Unverified saved draft'); assert.equal(recovery.pendingWrites[0].body,'Unverified saved draft');
  assert.equal(await input.inputValue(),'Unverified saved draft');
  await page.close();
 }
 console.log('Studio route recovery and template roundtrip passed');
} finally {await browser.close()}
