/* global window, sessionStorage, process, console */
// Real route, Hub, and workspace store; deterministic Firestore double, no network.
import { build } from 'esbuild';
import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { dirname } from 'node:path';
const root = process.cwd();
const require = createRequire(import.meta.url);
const reactDir = dirname(require.resolve('react'));
const source = `
import React from 'react'; import {createRoot} from 'react-dom/client'; import {flushSync} from 'react-dom';
import {Route} from './src/routes/_auth.studio.index'; import {useWorkspaceStore} from './src/store/ownedWorkspaceStore';
const store=useWorkspaceStore.getState(); let token=store.changeAccount('A');
const idea={title:'Same reference',description:'private'}; const other={title:'Other'};
store.setSelectedIdea(token,idea); window.user={uid:'A'}; window.token=token;
window.selectA=()=>flushSync(()=>useWorkspaceStore.getState().setSelectedIdea(token,idea));
window.selectB=()=>flushSync(()=>useWorkspaceStore.getState().setSelectedIdea(token,other));
window.selection=()=>useWorkspaceStore.getState().selectedIdea?.title || null;
window.receipt=()=>useWorkspaceStore.getState().owners.selectedIdea;
const root=createRoot(document.getElementById('root')); const C=Route.component;
window.mount=()=>flushSync(()=>root.render(<C/>)); window.unmount=()=>flushSync(()=>root.render(null)); window.mount();
window.switchAccount=uid=>flushSync(()=>{ token=useWorkspaceStore.getState().changeAccount(uid); window.user={uid}; window.token=token; if(uid==='A')useWorkspaceStore.getState().setSelectedIdea(token,idea); root.render(<C/>); });
`;
const mocks = {
  router: `export const createFileRoute=()=>({component})=>({component,useSearch:()=>({})}); export const useNavigate=()=>()=>{window.opened=(window.opened||0)+1}`,
  auth: `export const useAuth=()=>({user:window.user,workspaceToken:window.token})`,
  firebase: `export const db={}`,
  firestore: `export const collection=()=>({}); export const doc=(...a)=>({id:a.length===3?a[2]:'p'+(Number(sessionStorage.getItem('next')||0)+1)}); export const serverTimestamp=()=>0;
 export const runTransaction=async (_db,cb)=>{if(window.failBefore){window.failBefore=false;throw Error('offline')}; const docs=JSON.parse(sessionStorage.getItem('docs')||'{}'); await cb({get:async ref=>({exists:()=>!!docs[ref.id],data:()=>docs[ref.id]}),set:(ref,v)=>{docs[ref.id]=v;sessionStorage.setItem('next',ref.id.slice(1))}}); sessionStorage.setItem('docs',JSON.stringify(docs)); if(window.hold){window.hold=false;await new Promise(resolve=>window.release=resolve)} if(window.failAfter){window.failAfter=false;throw Error('ambiguous')}};`,
  child: `import React from 'react';export default function Stub(){return null}`,
};
const bundle = await build({
  stdin: { contents: source, resolveDir: root, sourcefile: 'route-receipt.tsx', loader: 'tsx' },
  alias: { '@': root + '/src', react: reactDir },
  bundle: true,
  write: false,
  platform: 'browser',
  format: 'iife',
  plugins: [
    {
      name: 'mock',
      setup(b) {
        b.onResolve({ filter: /^@tanstack\/react-router$/ }, () => ({
          path: 'router',
          namespace: 'mock',
        }));
        b.onResolve({ filter: /contexts\/AuthContext$/ }, () => ({
          path: 'auth',
          namespace: 'mock',
        }));
        b.onResolve({ filter: /firebase\/firestore$/ }, () => ({
          path: 'firestore',
          namespace: 'mock',
        }));
        b.onResolve({ filter: /(^|\/)firebase$/ }, (a) =>
          a.path.startsWith('.') ? { path: 'firebase', namespace: 'mock' } : null,
        );
        b.onResolve({ filter: /\/(ContentIdeaGenerator|ViralTemplatesLibrary)$/ }, () => ({
          path: 'child',
          namespace: 'mock',
        }));
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
  page.on('pageerror', (error) => console.error('Page error:', error));
  await page.route('**/*', (r) => r.abort());
  await page.route('https://hub.test/**', (r) =>
    r.fulfill({ contentType: 'text/html', body: '<div id="root"></div>' }),
  );
  const inject = () => page.addScriptTag({ content: bundle.outputFiles[0].text });
  const reset = async () => {
    await page.goto('https://hub.test/');
    await page.evaluate(() => sessionStorage.clear());
    await inject();
  };
  const open = () => page.getByRole('button', { name: 'New project' }).click();
  const create = () => page.getByRole('button', { name: 'Create from selected idea' }).click();
  const retry = () => page.getByRole('button', { name: 'Retry saving selected project' }).click();
  for (const change of ['same', 'A-B-A']) {
    await reset();
    await page.evaluate(() => (window.failBefore = true));
    await open();
    await create();
    await page.getByRole('alert').waitFor();
    await page.evaluate((change) => {
      window.oldReceipt = window.receipt();
      if (change === 'A-B-A') window.selectB();
      window.selectA();
      window.changed = window.oldReceipt !== window.receipt();
    }, change);
    assert.equal(await page.evaluate(() => window.changed), true);
    await retry();
    await page.waitForFunction(() => window.opened === 1);
    assert.equal(await page.evaluate(() => window.selection()), 'Same reference', change);
    assert.equal(
      await page.evaluate(() => JSON.parse(sessionStorage.getItem('docs')).p1.data.body),
      'Concept: private',
    );
  }
  // Reselecting while the original transaction is in flight must also be retained.
  await reset();
  await page.evaluate(() => (window.hold = true));
  await open();
  await create();
  await page.waitForFunction(() => window.release);
  await page.evaluate(() => {
    window.selectA();
    window.release();
  });
  await page.waitForFunction(() => window.opened === 1);
  assert.equal(await page.evaluate(() => window.selection()), 'Same reference');
  // Success must consume provenance; a subsequent blank project must not clear a new selection.
  await reset();
  await open();
  await create();
  await page.waitForFunction(() => window.opened === 1);
  assert.equal(await page.evaluate(() => window.selection()), null);
  await page.evaluate(() => window.selectA());
  await open();
  await page.getByRole('button', { name: 'Create blank project' }).click();
  await page.waitForFunction(() => window.opened === 2);
  assert.equal(await page.evaluate(() => window.selection()), 'Same reference');
  // In-memory provenance survives component remount, but a newer receipt remains untouched.
  for (const reselect of [false, true]) {
    await reset();
    await page.evaluate(() => (window.failAfter = true));
    await open();
    await create();
    await page.getByRole('alert').waitFor();
    await page.evaluate((reselect) => {
      window.unmount();
      if (reselect) window.selectA();
      window.mount();
    }, reselect);
    await open();
    await retry();
    await page.waitForFunction(() => window.opened === 1);
    assert.equal(await page.evaluate(() => window.selection()), reselect ? 'Same reference' : null);
    assert.equal(
      await page.evaluate(() => Object.keys(JSON.parse(sessionStorage.getItem('docs'))).length),
      1,
    );
  }
  // A new account generation cannot consume the earlier generation's receipt.
  await reset();
  await page.evaluate(() => (window.failAfter = true));
  await open();
  await create();
  await page.getByRole('alert').waitFor();
  await page.evaluate(() => {
    window.switchAccount('B');
    window.switchAccount('A');
  });
  await open();
  await retry();
  await page.waitForFunction(() => window.opened === 1);
  assert.equal(await page.evaluate(() => window.selection()), 'Same reference');
  assert.equal(
    await page.evaluate(() => Object.keys(JSON.parse(sessionStorage.getItem('docs'))).length),
    1,
  );
  // Full reload cannot prove identity, so retain the new in-memory selection and reuse the project.
  await reset();
  await page.evaluate(() => (window.failAfter = true));
  await open();
  await create();
  await page.getByRole('alert').waitFor();
  await page.reload();
  await inject();
  await open();
  await retry();
  await page.waitForFunction(() => window.opened === 1);
  assert.equal(await page.evaluate(() => window.selection()), 'Same reference');
  assert.equal(
    await page.evaluate(() => Object.keys(JSON.parse(sessionStorage.getItem('docs'))).length),
    1,
  );
  await reset();
  await page.evaluate(() => (window.failBefore = true));
  await open();
  await create();
  await page.getByRole('alert').waitFor();
  await page.reload();
  await inject();
  await open();
  await retry();
  await page.waitForFunction(() => window.opened === 1);
  assert.equal(await page.evaluate(() => window.selection()), 'Same reference');
  assert.equal(
    await page.evaluate(() => JSON.parse(sessionStorage.getItem('docs')).p1.data.body),
    'Concept: private',
  );
  console.log(
    'Route/Hub/store receipt provenance: reselection, A-B-A, blank, remount, reload passed (Firestore double).',
  );
} finally {
  await browser.close();
}
