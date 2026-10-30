/* global process, sessionStorage, window, document, console */
// Reproduction: node tests/studioHubDuplicate.browser.mjs
// Real React and Chromium; Firestore is an in-browser deterministic double.
import { build } from 'esbuild';
import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';

const root = process.cwd();
const source = `
import React, {useState} from 'react';
import {createRoot} from 'react-dom/client';
import {flushSync} from 'react-dom';
import StudioHub from './src/components/studio/StudioHub';
function App() {
  const [mount, setMount] = useState(true);
  const [idea, setIdea] = useState({title:'Example idea',description:'Keep this'});
  window.remountHub = () => { flushSync(() => setMount(false)); setTimeout(() => setMount(true), 0); };
  return <>{mount && <StudioHub user={{uid:'owner'}} brand={null} projects={[]} isProjectsLoading={false} projectsLoadError={false} selectedIdea={idea} onClearSelectedIdea={() => setIdea(null)} onOpenProject={() => {}} />}</>;
}
createRoot(document.getElementById('root')).render(<App/>);
`;
const mocks = {
  firebase: 'export const db = {};',
  firestore: `
export const collection = () => ({});
export const doc = (...args) => ({id:args.length === 3 ? args[2] : 'project-' + (Number(sessionStorage.getItem('nextId') || 0) + 1)});
export const serverTimestamp = () => 'timestamp';
export const runTransaction = async (_db, callback) => {
  const docs = JSON.parse(sessionStorage.getItem('documents') || '{}');
  await callback({get:async ref=>({exists:()=>!!docs[ref.id],data:()=>docs[ref.id]}),set:(ref,value)=>{docs[ref.id]=value; sessionStorage.setItem('nextId',ref.id.split('-')[1]);}});
  sessionStorage.setItem('documents',JSON.stringify(docs));
  if (sessionStorage.getItem('failAfterWrite') === 'yes') {sessionStorage.removeItem('failAfterWrite'); throw Error('ambiguous response');}
};`,
  child: 'import React from "react"; export default function Stub(){return null}',
};
const result = await build({stdin:{contents:source,resolveDir:root,sourcefile:'hub-harness.tsx',loader:'tsx'},bundle:true,write:false,format:'iife',platform:'browser',plugins:[{name:'doubles',setup(b){
  b.onResolve({filter:/firebase\/firestore$/},()=>({path:'firestore',namespace:'mock'}));
  b.onResolve({filter:/firebase$/},args=>args.path.startsWith('.') ? {path:'firebase',namespace:'mock'} : null);
  b.onResolve({filter:/\/(ContentIdeaGenerator|ViralTemplatesLibrary)$/},()=>({path:'child',namespace:'mock'}));
  b.onLoad({filter:/.*/,namespace:'mock'},args=>({contents:mocks[args.path],loader:'jsx',resolveDir:root}));
}}]});
const browser = await chromium.launch({headless:true});
try {
  const page = await browser.newPage();
  await page.route('**/*', route => route.abort());
  await page.route('https://hub.test/**', route => route.fulfill({contentType:'text/html',body:'<div id="root"></div>'}));
  for (const scenario of ['remount','reload']) {
    await page.goto('https://hub.test/');
    await page.evaluate(() => {sessionStorage.clear(); sessionStorage.setItem('failAfterWrite','yes');});
    await page.addScriptTag({content:result.outputFiles[0].text});
    await page.getByRole('button',{name:'New project'}).click();
    await page.getByRole('button',{name:'Create from selected idea'}).click();
    await page.getByRole('alert').waitFor();
    assert.equal(await page.evaluate(() => Object.keys(JSON.parse(sessionStorage.getItem('documents'))).length),1);
    if (scenario === 'remount') {
      await page.evaluate(() => window.remountHub());
      await page.waitForFunction(() => !document.querySelector('dialog[open]'));
      await page.getByRole('button',{name:'New project'}).waitFor();
    } else {
      await page.reload();
      await page.addScriptTag({content:result.outputFiles[0].text});
      // The harness reselects the same idea after reload; the real workspace store is in memory.
    }
    await page.getByRole('button',{name:'New project'}).click();
    await page.getByRole('button',{name:'Retry saving selected project'}).click();
    await page.waitForFunction(() => !document.querySelector('dialog[open]'));
    assert.equal(await page.evaluate(() => Object.keys(JSON.parse(sessionStorage.getItem('documents'))).length),1);
    const ids = await page.evaluate(() => Object.keys(JSON.parse(sessionStorage.getItem('documents'))));
    console.log(`${scenario}: ambiguous committed create followed by retry retained ${ids.join(', ')}`);
  }
  await page.close();
} finally { await browser.close(); }
