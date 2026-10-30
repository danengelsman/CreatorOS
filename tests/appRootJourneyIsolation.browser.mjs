// Offline: node tests/appRootJourneyIsolation.browser.mjs
/* global process, window, console */
// Exercises the real AppRoot and journey service; auth, UI and Firestore are doubles.
import { build } from 'esbuild';
import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const root = process.cwd();
const source = `
import React from 'react';
import { createRoot } from 'react-dom/client';
import AppRoot from './src/AppRoot';
import { useWorkspaceStore } from './src/store/workspaceStore';
window.initialToken = useWorkspaceStore.getState().changeAccount('A');
window.change = uid => { const token = useWorkspaceStore.getState().changeAccount(uid); window.setAuth({user:{uid}, workspaceToken:token, showOnboarding:window.onboarding}); };
createRoot(document.getElementById('root')).render(<AppRoot />);
`;
const mocks = {
 auth: `import React,{createContext,useContext,useState} from 'react'; const C=createContext(null); export function AuthProvider({children}) {const [v,set]=useState({user:{uid:'A'},workspaceToken:window.initialToken,showOnboarding:window.onboarding}); window.setAuth=set; return <C.Provider value={{...v,isAuthLoading:false,authError:false,setShowOnboarding:value=>{window.completed=value}}}>{children}</C.Provider>}; export const useAuth=()=>useContext(C);`,
 routerProvider: `import React,{useLayoutEffect} from 'react'; export function RouterProvider(){useLayoutEffect(()=>{if(window.switchBeforeEffect){const switches=window.switchBeforeEffect; window.switchBeforeEffect=null; for(const uid of switches) window.change(uid)}},[]);return <div>Router ready</div>}`,
 onboarding: `import React from 'react'; export default function Onboarding({onComplete}){window.complete=onComplete; return <button onClick={()=>onComplete().catch(e=>window.completionError=e.message)}>Skip</button>}`,
 verification: `export default function VerificationBanner(){return null}`,
 router: `export const router={navigate(){},invalidate(){}}`,
 firebase: `export const db={};export const logout=async()=>{};export const serverTimestamp=()=>1;`,
 firestore: `
 export const doc=(_db,col,id)=>({key:col+'/'+id}); export const serverTimestamp=()=>1; export const onSnapshot=()=>()=>{};
 export const runTransaction=async (_db,fn)=>{
   const id=window.nextTransaction++;
   const get=async ref=>{window.reads.push(ref.key); window.readDetails.push({id,key:ref.key}); if(ref.key.startsWith('first_dollar_journeys/') && window.holdRead){window.holdRead=false; await new Promise(resolve=>window.releaseRead=resolve)};return {exists:()=>!ref.key.startsWith('first_dollar_journeys/'),data:()=>({})}};
   const tx={get,set:(ref)=>window.writes.push(ref.key)};
   const result=await fn(tx);
   if(window.retryJourney && window.reads.at(-1)?.startsWith('first_dollar_journeys/')) {window.retryJourney=false; await new Promise(resolve=>window.releaseRetry=resolve); return fn(tx)}
   return result;
 };`,
};
const bundle=await build({stdin:{contents:source,resolveDir:root,loader:'tsx'},bundle:true,write:false,platform:'browser',format:'iife',preserveSymlinks:true,plugins:[{name:'boundaries',setup(b){
 b.onResolve({filter:/^react$/},()=>({path:require.resolve('react')}));
 b.onResolve({filter:/^\.\/contexts\/AuthContext$/},()=>({path:'auth',namespace:'mock'}));
 b.onResolve({filter:/^@tanstack\/react-router$/},()=>({path:'routerProvider',namespace:'mock'}));
 b.onResolve({filter:/^\.\/components\/Onboarding$/},()=>({path:'onboarding',namespace:'mock'}));
 b.onResolve({filter:/^\.\/components\/VerificationBanner$/},()=>({path:'verification',namespace:'mock'}));
 b.onResolve({filter:/^\.\/router$/},()=>({path:'router',namespace:'mock'}));
 b.onResolve({filter:/^(?:@\/firebase|\.\.\/firebase)$/},()=>({path:'firebase',namespace:'mock'}));
 b.onResolve({filter:/^firebase\/firestore$/},()=>({path:'firestore',namespace:'mock'}));
 b.onResolve({filter:/^@\//},args=>({path:path.join(root,'src',args.path.slice(2)+'.ts')}));
 b.onLoad({filter:/.*/,namespace:'mock'},args=>({contents:mocks[args.path],loader:'tsx'}));
}}]});
const browser=await chromium.launch({headless:true,timeout:15000});
try {
 const page=await browser.newPage();
 await page.route('**/*',r=>r.request().url()==='https://local.test/'?r.fulfill({contentType:'text/html',body:'<div id="root"></div>'}):r.abort());
 const open=async opts=>{await page.goto('https://local.test/');await page.evaluate(opts=>Object.assign(window,{reads:[],readDetails:[],nextTransaction:0,writes:[],...opts}),opts);await page.addScriptTag({content:bundle.outputFiles[0].text});};
 const reads=()=>page.evaluate(()=>window.reads.filter(x=>x.startsWith('first_dollar_journeys/')));
 for (const switches of [['B'],['B','A']]) {
  await open({switchBeforeEffect:switches});
  await page.waitForFunction(()=>window.reads.filter(x=>x.startsWith('first_dollar_journeys/')).length>=1);
  assert.deepEqual(await reads(),[`first_dollar_journeys/${switches.at(-1)}`],`stale A effect must not dispatch after A-${switches.join('-')}`);
  console.log(`PASS stale passive effect A-${switches.join('-')}`);
 }
 await open({retryJourney:true});
 await page.waitForFunction(()=>typeof window.releaseRetry==='function');
 await page.evaluate(()=>{window.change('B');window.change('A');window.releaseRetry()});
 await page.waitForFunction(()=>window.readDetails.length>=2);
 assert.equal(await page.evaluate(()=>window.readDetails.filter(x=>x.id===0).length),1,'stale effect retry must not read again');
 console.log('PASS passive effect retry A-B-A');
 await open({onboarding:true,retryJourney:true});
 await page.getByText('Skip').click();
 await page.waitForFunction(()=>typeof window.releaseRetry==='function');
 await page.evaluate(()=>{window.change('B');window.change('A');window.releaseRetry()});
 await page.waitForFunction(()=>window.completionError);
 assert.deepEqual(await reads(),['first_dollar_journeys/A'],'stale retry must not read');
 assert.equal(await page.evaluate(()=>window.completed),undefined);
 console.log('PASS onboarding retry A-B-A');
 await open({onboarding:true,holdRead:true});
 await page.getByText('Skip').click();
 await page.waitForFunction(()=>typeof window.releaseRead==='function');
 await page.evaluate(()=>{window.change('B');window.change('A');window.releaseRead()});
 await page.waitForFunction(()=>window.completionError);
 assert.deepEqual(await page.evaluate(()=>window.writes.filter(x=>x.startsWith('first_dollar_journeys/'))),[]);
 console.log('PASS onboarding held read A-B-A');
 await open({onboarding:true});
 await page.getByText('Skip').click();
 await page.waitForFunction(()=>window.completed===false);
 assert.deepEqual(await reads(),['first_dollar_journeys/A']);
 assert.ok((await page.evaluate(()=>window.writes)).includes('users/A'));
 console.log('PASS current skip');
} finally {await browser.close()}
