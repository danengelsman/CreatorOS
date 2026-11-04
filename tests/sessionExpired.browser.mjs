/* global window, process, console, CustomEvent */
// Real Chromium and React; Firebase and the API are isolated test doubles.
import { build } from 'esbuild';
import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const root = process.cwd();
const require = createRequire(import.meta.url);
const source = `
import React from 'react';
import {createRoot} from 'react-dom/client';
import SessionExpired from './src/components/SessionExpired';
import {apiFetch} from './src/lib/apiClient';
import {auth} from './src/firebase';
import {useWorkspaceStore} from './src/store/ownedWorkspaceStore';
window.calls = [];
window.switchAccount = uid => {
  auth.currentUser = {uid, email:uid+'@example.test', providerData:[{providerId:'password'}], getIdToken:async()=>uid+'-token'};
  useWorkspaceStore.getState().changeAccount(uid);
};
window.expire = () => apiFetch('/api/onboarding/chat').catch(e => e.name);
window.fetch = async (_url, options) => {window.calls.push(options.headers.get('Authorization')); return new Response('{}',{status:401});};
window.switchAccount('A');
window.oldGeneration = useWorkspaceStore.getState().generation;
createRoot(document.getElementById('root')).render(<><div>{location.pathname === '/onboarding' ? 'Onboarding' : 'Normal routes'}</div><button onClick={() => window.expire()}>Make request</button><SessionExpired/></>);
`;
const firebase = `export const auth = {currentUser:null}; export const onAuthStateChanged = () => () => {};`;
const authMock = `
export const EmailAuthProvider = {credential:(email,password)=>({email,password})};
export class GoogleAuthProvider {}
export const reauthenticateWithCredential = (user, credential) => { window.reauthUser=user.uid; window.reauthEmail=credential.email; return new Promise(resolve => {window.finishReauth=resolve}); };
export const reauthenticateWithPopup = reauthenticateWithCredential;
`;
const result = await build({
  stdin: { contents: source, resolveDir: root, loader: 'tsx' },
  bundle: true,
  write: false,
  preserveSymlinks: true,
  platform: 'browser',
  format: 'iife',
  plugins: [
    {
      name: 'doubles',
      setup(b) {
        b.onResolve({ filter: /^react$/ }, () => ({ path: require.resolve('react') }));
        b.onResolve({ filter: /^firebase\/auth$/ }, () => ({ path: 'auth', namespace: 'mock' }));
        b.onResolve({ filter: /firebase$/ }, (args) =>
          args.path.startsWith('.') ? { path: 'firebase', namespace: 'mock' } : null,
        );
        b.onLoad({ filter: /.*/, namespace: 'mock' }, (args) => ({
          contents: args.path === 'auth' ? authMock : firebase,
          loader: 'js',
        }));
      },
    },
  ],
});
const browser = await chromium.launch({ headless: true });
try {
  for (const path of ['/onboarding', '/dashboard']) {
    const page = await browser.newPage();
    page.on('pageerror', (error) => console.error('pageerror:', error));
    page.on('console', (message) => {
      if (message.type() === 'error') console.error('browser:', message.text());
    });
    await page.route('**/*', (route) => route.abort());
    await page.route('https://session.test/**', (route) =>
      route.fulfill({ contentType: 'text/html', body: '<div id="root"></div>' }),
    );
    await page.goto('https://session.test' + path);
    await page.addScriptTag({ content: result.outputFiles[0].text });
    await page.waitForFunction(() => typeof window.expire === 'function');
    await page.getByRole('button', { name: 'Make request' }).click();
    const alert = page.getByRole('alert', { name: 'Session expired' });
    await alert.waitFor();
    assert.match(await alert.innerText(), /A@example.test/);
    await alert.getByLabel('Password').fill('test-password');
    await alert.getByRole('button', { name: 'Sign in again', exact: true }).click();
    await page.waitForFunction(() => typeof window.finishReauth === 'function');
    assert.equal(await page.evaluate(() => window.reauthUser), 'A');
    assert.equal(await page.evaluate(() => window.reauthEmail), 'A@example.test');
    await page.evaluate(() => window.switchAccount('B'));
    await alert.waitFor({ state: 'hidden' });
    await page.evaluate(() => window.finishReauth());
    assert.equal(await page.evaluate(() => window.calls.length), 2);
    await page.evaluate(() => {
      window.switchAccount('A');
      window.dispatchEvent(
        new CustomEvent('creatoros:auth-expired', {
          detail: { uid: 'A', generation: window.oldGeneration },
        }),
      );
    });
    assert.equal(await alert.count(), 0);
    await page.getByRole('button', { name: 'Make request' }).click();
    await alert.waitFor();
    await alert.getByLabel('Password').fill('test-password');
    await alert.getByRole('button', { name: 'Sign in again', exact: true }).click();
    await page.evaluate(() => window.finishReauth());
    await alert.waitFor({ state: 'hidden' });
    await page.close();
  }
  console.log('sessionExpired.browser: onboarding and normal-route harness passed');
} finally {
  await browser.close();
}
