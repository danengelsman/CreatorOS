/* global process, window, sessionStorage, Storage, console */
// Real UI with local Firestore and storage doubles; no network or rules coverage.
import { build } from 'esbuild';
import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
const root = process.cwd();
const source = `
import React,{useState} from 'react';
import {createRoot} from 'react-dom/client';
import {flushSync} from 'react-dom';
import StudioHub from './src/components/studio/StudioHub';
function App(){
 const [uid,setUid]=useState('A'); const [idea,setIdea]=useState({title:'Private idea',description:'private draft'});
 window.switchTo = v => flushSync(()=>setUid(v));
 window.opened=[]; window.cleared=[];
 return <StudioHub user={{uid}} brand={null} projects={[]} isProjectsLoading={false} projectsLoadError={false} selectedIdea={idea} onClearSelectedIdea={()=>{window.cleared.push(uid);setIdea(null)}} onOpenProject={id=>window.opened.push({uid,id})}/>;
}
createRoot(document.getElementById('root')).render(<App/>);
`;
const mocks = {
 firebase:'export const db={}',
 firestore:`
export const collection=()=>({});
export const doc=(...args)=>({id:args.length===3 ? args[2] : 'p'+(Number(sessionStorage.getItem('next')||0)+1)});
export const serverTimestamp=()=> 'timestamp';
export const runTransaction=async (_db,cb)=>{
 window.dispatched=(window.dispatched||0)+1;
 if(window.failBefore){window.failBefore=false;throw Error('offline')}
 let staged;
 await cb({get:async ref=>({exists:()=>!!JSON.parse(sessionStorage.getItem('docs')||'{}')[ref.id],data:()=>JSON.parse(sessionStorage.getItem('docs')||'{}')[ref.id]}),set:(ref,data)=>{staged={ref,data}}});
 if(window.hold){window.hold=false;window.staged=staged;await new Promise(r=>window.release=r)}
 if(staged){const docs=JSON.parse(sessionStorage.getItem('docs')||'{}');if(!docs[staged.ref.id])docs[staged.ref.id]=staged.data;sessionStorage.setItem('docs',JSON.stringify(docs));sessionStorage.setItem('next',staged.ref.id.slice(1))}
};`,
 child:'import React from "react";export default function Stub(){return null}'
};
const bundle=await build({stdin:{contents:source,resolveDir:root,sourcefile:'harness.tsx',loader:'tsx'},bundle:true,write:false,format:'iife',platform:'browser',plugins:[{name:'local',setup(b){
 b.onResolve({filter:/firebase\/firestore$/},()=>({path:'firestore',namespace:'mock'}));
 b.onResolve({filter:/firebase$/},a=>a.path.startsWith('.')?{path:'firebase',namespace:'mock'}:null);
 b.onResolve({filter:/\/(ContentIdeaGenerator|ViralTemplatesLibrary)$/},()=>({path:'child',namespace:'mock'}));
 b.onLoad({filter:/.*/,namespace:'mock'},a=>({contents:mocks[a.path],loader:'jsx',resolveDir:root}));
}}]});
const browser=await chromium.launch({headless:true});
const page=await browser.newPage();
await page.route('**/*',r=>r.abort());
await page.route('https://hub.test/**',r=>r.fulfill({contentType:'text/html',body:'<div id="root"></div>'}));
const inject=async()=>page.addScriptTag({content:bundle.outputFiles[0].text});
const reset=async()=>{await page.goto('https://hub.test');await page.evaluate(()=>sessionStorage.clear());await inject();};
const open=()=>page.getByRole('button',{name:'New project'}).click();
const create=()=>page.getByRole('button',{name:'Create from selected idea'}).click();
const retry=()=>page.getByRole('button',{name:'Retry saving selected project'}).click();
try {
 // A staged transaction may complete for A, but must never navigate or clear in B or a later A generation.
 await reset(); await page.evaluate(()=>window.hold=true); await open(); await create();
 await page.waitForFunction(()=>window.staged); await page.evaluate(()=>window.switchTo('B'));
 await open(); assert.equal(await page.getByText('A previous project save is unresolved.').count(),0);
 assert.equal(await page.getByText('Private idea').count(),0);
 await page.evaluate(()=>window.switchTo('A')); await page.evaluate(()=>window.release());
 await page.waitForFunction(()=>Object.keys(JSON.parse(sessionStorage.getItem('docs')||'{}')).length===1);
 assert.deepEqual(await page.evaluate(()=>({docs:JSON.parse(sessionStorage.getItem('docs')),opened:window.opened,cleared:window.cleared})).then(x=>({owner:x.docs.p1.userId,opened:x.opened,cleared:x.cleared})),{owner:'A',opened:[],cleared:[]});
 await open(); await retry(); await page.waitForFunction(()=>window.opened.length===1);
 assert.deepEqual(await page.evaluate(()=>window.opened),[{uid:'A',id:'p1'}]);
 assert.deepEqual(await page.evaluate(()=>window.cleared),[]);
 // Definite failure: payload and identity survive reload, even when the selected idea is gone/recreated.
 await reset(); await page.evaluate(()=>window.failBefore=true); await open(); await create(); await page.getByRole('alert').waitFor();
 await page.reload(); await inject(); await open(); await retry(); await page.waitForFunction(()=>window.opened.length===1);
 assert.equal(await page.evaluate(()=>JSON.parse(sessionStorage.getItem('docs')).p1.data.body),'Concept: private draft');
 assert.deepEqual(await page.evaluate(()=>window.cleared),[]);
 // Reload while commit is pending. Model the delayed server commit arriving after reload.
 await reset(); await page.evaluate(()=>window.hold=true); await open(); await create(); await page.waitForFunction(()=>window.staged);
 const staged=await page.evaluate(()=>window.staged); await page.reload(); await inject();
 await page.evaluate(staged=>sessionStorage.setItem('docs',JSON.stringify({[staged.ref.id]:staged.data})),staged);
 await open(); await retry(); await page.waitForFunction(()=>window.opened.length===1);
 assert.deepEqual(await page.evaluate(()=>Object.keys(JSON.parse(sessionStorage.getItem('docs')))),['p1']);
 // Retry can win before the older server attempt: the late transaction must not replace it.
 await reset(); await page.evaluate(()=>window.hold=true); await open(); await create(); await page.waitForFunction(()=>window.staged);
 const old=await page.evaluate(()=>window.staged); await page.reload(); await inject();
 await open(); await retry(); await page.waitForFunction(()=>window.opened.length===1);
 await page.evaluate(old=>{const docs=JSON.parse(sessionStorage.getItem('docs')); if (!docs[old.ref.id]) docs[old.ref.id]=old.data; sessionStorage.setItem('docs',JSON.stringify(docs));},old);
 assert.deepEqual(await page.evaluate(()=>Object.keys(JSON.parse(sessionStorage.getItem('docs')))),['p1']);
 // Quota/storage failure: no transaction dispatch and actionable error.
 await reset(); await page.evaluate(()=>{Storage.prototype.setItem=function(){throw Error('quota')};});
 await open(); await create(); await page.getByRole('alert').getByText(/storage is unavailable/i).waitFor();
 assert.equal(await page.evaluate(()=>window.dispatched||0),0);
 console.log('Studio recovery: owner generations, ordinary failure, late commit after reload, and storage failure passed (local doubles).');
} finally {await browser.close()}
