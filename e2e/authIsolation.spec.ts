import { test, expect, type Page } from '@playwright/test';
import { build } from 'esbuild';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

// Exercise the real provider, React and workspace store in Chromium. Firebase is
// replaced only at its IO boundary so callbacks can arrive in arbitrary order.
const firebaseMock = `
export const auth = {}, db = {}, OperationType = { GET: 'get' };
export const completeGoogleRedirect = () => new Promise(resolve => { window.test.finishRedirect = resolve; });
export const onAuthStateChanged = (_auth, cb) => { window.test.auth = cb; return () => {}; };
export const handleFirestoreError = () => {};
`;
const firestoreMock = `
export const doc = (_db, collection, id) => ({ key: collection + '/' + id });
export const collection = (_db, name) => ({ key: name });
export const where = (_field, _op, uid) => uid;
export const query = (ref, uid) => ({ key: ref.key + '?user=' + uid });
export const getDoc = ref => new Promise((resolve, reject) => { window.test.lookups.push({ key: ref.key, resolve, reject }); });
export const setDoc = (ref, data) => {
  const write = { key: ref.key, data };
  window.test.writes.push(write);
  return window.test.deferWrites ? new Promise((resolve, reject) => { write.resolve = resolve; write.reject = reject; }) : Promise.resolve();
};
export const runTransaction = async (_db, fn) => {
  let writes = [];
  let result = await fn({ get: getDoc, set: (...args) => writes.push(args) });
  if (window.test.retryTransaction) {
    window.test.retryTransaction = false;
    writes = [];
    if (window.test.holdRetry) await new Promise(resolve => window.test.releaseRetry = resolve);
    result = await fn({ get: getDoc, set: (...args) => writes.push(args) });
  }
  for (const args of writes) await setDoc(...args);
  return result;
};
export const serverTimestamp = () => 1;
export const onSnapshot = (ref, next, error) => { window.test.listeners.push({key: ref.key, next, error}); return () => {}; };
`;
const harness = `
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { useWorkspaceStore, selectBrand, selectProjects, selectSelectedIdea, selectSelectedProject, selectProjectsLoading, selectProjectsError } from './src/store/workspaceStore';
window.IS_REACT_ACT_ENVIRONMENT = true;
window.test = { lookups: [], listeners: [], renders: [], writes: [] };
function Consumer() {
  const auth = useAuth();
  const store = useWorkspaceStore();
  window.test.current = { uid: auth.user?.uid || null, userData: auth.userData, isAuthLoading: auth.isAuthLoading, authError: auth.authError, showOnboarding: auth.showOnboarding, activeTab: auth.activeTab, projects: selectProjects(store, auth.workspaceToken), brand: selectBrand(store, auth.workspaceToken), selectedIdea: selectSelectedIdea(store, auth.workspaceToken), selectedProject: selectSelectedProject(store, auth.workspaceToken), isProjectsLoading: selectProjectsLoading(store, auth.workspaceToken), projectsLoadError: selectProjectsError(store, auth.workspaceToken) };
  window.test.renders.push(window.test.current);
  return null;
}
window.test.authEvent = async uid => { await act(async () => { window.test.auth(uid ? { uid, email: uid + '@example.test' } : null); }); };
window.test.batchedSwitch = async () => { await act(async () => { window.test.auth({uid:'B'}); window.test.auth({uid:'A'}); }); };
window.test.lookup = async (uid, exists = true, data = {}) => { await act(async () => { const lookup = window.test.lookups.find(x => x.key === 'users/' + uid && !x.done); lookup.done = true; lookup.resolve({ exists: () => exists, data: () => data }); }); };
window.test.rejectLookup = async uid => { await act(async () => { const lookup = window.test.lookups.find(x => x.key === 'users/' + uid && !x.done); lookup.done = true; lookup.reject(new Error('lookup failed')); }); };
window.test.rejectWrite = async uid => { await act(async () => { window.test.writes.find(x => x.key === 'users/' + uid).reject(new Error('write failed')); }); };
window.test.snapshot = async (key, data) => { await act(async () => { const l = window.test.listeners.find(x => x.key === key); l.next(key.startsWith('projects?') ? { docs: data.map(d => ({ id: d.id, data: () => d })) } : { exists: () => data !== null, data: () => data }); }); };
window.test.error = async key => { await act(async () => { window.test.listeners.find(x => x.key === key).error(new Error('failed')); }); };
window.test.select = async () => { await act(async () => { const s = useWorkspaceStore.getState(); s.setSelectedIdea(window.test.token, { id: 'idea-A' }); s.setSelectedProject(window.test.token, { id: 'project-A' }); }); };
window.test.tab = async () => { await act(async () => { window.test.setTab('settings'); }); };
function Controls() { const a = useAuth(); window.test.token = a.workspaceToken; window.test.setTab = a.setActiveTab; return <Consumer />; }
window.test.mount = async () => { await act(async () => { window.test.root = createRoot(document.getElementById('root')); window.test.root.render(<AuthProvider><Controls /></AuthProvider>); }); };
window.test.unmount = async () => { await act(async () => { window.test.root.unmount(); }); };
window.test.copyLegacy = async data => { await act(async () => { useWorkspaceStore.setState(data); }); };
window.test.generation = () => useWorkspaceStore.getState().generation;
`;
let page: Page;
let bundle: string;
async function call(method: string, ...args: unknown[]) {
  return page.evaluate(async ({ method, args }) => (window as any).test[method](...args), {
    method,
    args,
  });
}
async function state() {
  return page.evaluate(() => (window as any).test.current);
}
async function login(uid: string) {
  await call('authEvent', uid);
  await call('lookup', uid);
}
async function populateA() {
  await login('A');
  await call('snapshot', 'users/A', { name: 'A' });
  await call('snapshot', 'projects/brand_A', { status: 'active', data: { name: 'A brand' } });
  await call('snapshot', 'projects?user=A', [{ id: 'A project' }]);
  await call('select');
}
test.beforeAll(async () => {
  const root = process.cwd();
  const result = await build({
    stdin: { contents: harness, resolveDir: root, loader: 'tsx' },
    bundle: true,
    write: false,
    preserveSymlinks: true,
    platform: 'browser',
    format: 'iife',
    plugins: [
      {
        name: 'firebase-test-boundary',
        setup(build) {
          build.onResolve({ filter: /^react$/ }, () => ({ path: require.resolve('react') }));
          build.onResolve({ filter: /^@\/firebase$/ }, () => ({
            path: 'firebase',
            namespace: 'mock',
          }));
          build.onResolve({ filter: /^firebase\/firestore$/ }, () => ({
            path: 'firestore',
            namespace: 'mock',
          }));
          build.onResolve({ filter: /^@\// }, (args) => ({
            path: path.join(root, 'src', args.path.slice(2) + '.ts'),
          }));
          build.onLoad({ filter: /.*/, namespace: 'mock' }, (args) => ({
            contents: args.path === 'firebase' ? firebaseMock : firestoreMock,
            loader: 'js',
          }));
        },
      },
    ],
  });
  bundle = result.outputFiles[0].text;
});
test.beforeEach(async ({ page: testPage }) => {
  page = testPage;
  await page.route('**/*', (route) => route.abort());
  await page.setContent('<div id="root"></div>');
  await page.addScriptTag({ content: bundle });
  if (test.info().title.includes('initial observer timeout')) await page.clock.install();
  await call('mount');
  if (!test.info().title.includes('pending redirect')) {
    await page.evaluate(() => (window as any).test.finishRedirect(null));
    await page.waitForFunction(() => !!(window as any).test.auth);
  }
});

test.describe('account-boundary isolation', () => {
  test('handles signout and a subsequent login while pending redirect completes late', async () => {
    expect(await page.evaluate(() => !!(window as any).test.auth)).toBe(true);
    await login('A');
    await call('authEvent', null);
    await login('B');
    await page.evaluate(() => (window as any).test.finishRedirect({ user: { uid: 'A' } }));
    expect(await state()).toMatchObject({ uid: 'B', isAuthLoading: false });
  });
  test('rearms the loading safety timeout on a later account change', async () => {
    await page.clock.install();
    await login('A');
    await call('authEvent', 'B');
    expect(await state()).toMatchObject({ uid: null, isAuthLoading: true });
    await page.clock.fastForward(15001);
    expect(await state()).toMatchObject({ uid: null, isAuthLoading: false, authError: true });
    await call('lookup', 'B', false);
    expect(await state()).toMatchObject({
      uid: 'B',
      showOnboarding: true,
      isAuthLoading: false,
      authError: false,
    });
    const writes = await page.evaluate(() => (window as any).test.writes);
    expect(writes.filter((w: any) => w.key === 'users/B')).toHaveLength(1);
    expect(writes.find((w: any) => w.key === 'users/B').data.email).toBe('B@example.test');
  });
  test('does not write a timed out A profile after switching to B', async () => {
    await page.clock.install();
    await call('authEvent', 'A');
    await page.clock.fastForward(15001);
    expect(await state()).toMatchObject({ uid: null, authError: true });
    await login('B');
    await call('lookup', 'A', false);
    expect(await state()).toMatchObject({ uid: 'B', authError: false, showOnboarding: false });
    const writes = await page.evaluate(() => (window as any).test.writes);
    expect(writes.map((w: any) => w.key)).toEqual(['users/B']);
  });
  test('ignores a timed out A lookup after A to B to A', async () => {
    await page.clock.install();
    await call('authEvent', 'A');
    await page.clock.fastForward(15001);
    await login('B');
    await call('authEvent', 'A');
    await call('lookup', 'A', false);
    expect(await state()).toMatchObject({ uid: null, isAuthLoading: true });
    expect((await page.evaluate(() => (window as any).test.writes)).map((w: any) => w.key)).toEqual(
      ['users/B'],
    );
    await call('lookup', 'A', false);
    expect(await state()).toMatchObject({ uid: 'A', showOnboarding: true, authError: false });
  });
  test('a late profile write failure never admits the new user', async () => {
    await page.clock.install();
    await page.evaluate(() => {
      (window as any).test.deferWrites = true;
    });
    await call('authEvent', 'A');
    await call('lookup', 'A', false);
    await page.clock.fastForward(15001);
    expect(await state()).toMatchObject({ uid: null, authError: true, isAuthLoading: false });
    await call('rejectWrite', 'A');
    expect(await state()).toMatchObject({ uid: null, authError: true, isAuthLoading: false });
  });
  test('clears A data and selections immediately on A to B before B renders', async () => {
    await populateA();
    await call('error', 'projects?user=A');
    await call('authEvent', 'B');
    expect(await state()).toMatchObject({
      userData: null,
      projects: [],
      brand: null,
      selectedIdea: null,
      selectedProject: null,
      isProjectsLoading: true,
      projectsLoadError: false,
    });
    await call('snapshot', 'users/A', { name: 'late A during lookup' });
    await call('snapshot', 'projects?user=A', [{ id: 'late A during lookup' }]);
    expect(await state()).toMatchObject({ userData: null, projects: [], isProjectsLoading: true });
    await call('lookup', 'B');
    const renders = await page.evaluate(() => (window as any).test.renders);
    for (const render of renders.filter((r: any) => r.uid === 'B')) {
      expect(render).toMatchObject({
        userData: null,
        projects: [],
        brand: null,
        selectedIdea: null,
        selectedProject: null,
        isProjectsLoading: true,
        projectsLoadError: false,
      });
    }
    await call('snapshot', 'projects?user=B', [{ id: 'B project' }]);
    await call('snapshot', 'users/B', { name: 'B' });
    await call('snapshot', 'projects/brand_B', { status: 'active', data: { name: 'B brand' } });
    expect(await state()).toMatchObject({
      userData: { name: 'B' },
      brand: { name: 'B brand' },
      projects: [{ id: 'B project' }],
      isProjectsLoading: false,
      projectsLoadError: false,
    });
  });
  test('ignores late snapshots and errors from A after switching to B', async () => {
    await populateA();
    await login('B');
    await call('snapshot', 'users/A', { name: 'late A' });
    await call('snapshot', 'projects/brand_A', { status: 'active', data: { name: 'late A' } });
    await call('snapshot', 'projects?user=A', [{ id: 'late A' }]);
    await call('error', 'projects?user=A');
    expect(await state()).toMatchObject({
      uid: 'B',
      userData: null,
      brand: null,
      projects: [],
      isProjectsLoading: true,
      projectsLoadError: false,
    });
  });
  test('ignores late auth lookup from A after B and preserves B onboarding', async () => {
    await call('authEvent', 'A');
    await call('authEvent', 'B');
    await call('lookup', 'B', false);
    expect(await state()).toMatchObject({ uid: 'B', showOnboarding: true, isAuthLoading: false });
    await call('lookup', 'A', false);
    expect(await state()).toMatchObject({ uid: 'B', showOnboarding: true, isAuthLoading: false });
  });
  test('clears data, errors, selection and navigation on signout and ignores late callbacks', async () => {
    await populateA();
    await call('tab');
    await call('error', 'projects?user=A');
    await call('authEvent', null);
    await call('snapshot', 'projects?user=A', [{ id: 'late A' }]);
    expect(await state()).toMatchObject({
      uid: null,
      userData: null,
      activeTab: 'home',
      showOnboarding: false,
      projects: [],
      brand: null,
      selectedIdea: null,
      selectedProject: null,
      isProjectsLoading: true,
      projectsLoadError: false,
      isAuthLoading: false,
    });
  });
  test('keeps same-account data on a repeated auth event', async () => {
    await populateA();
    await call('authEvent', 'A');
    expect(await state()).toMatchObject({
      uid: 'A',
      userData: { name: 'A' },
      selectedIdea: { id: 'idea-A' },
      projects: [{ id: 'A project' }],
      isProjectsLoading: false,
    });
  });
  test('handles current lookup failure but ignores an obsolete failure', async () => {
    await call('authEvent', 'A');
    await call('authEvent', 'B');
    expect(await state()).toMatchObject({ uid: null, isAuthLoading: true });
    await call('rejectLookup', 'A');
    expect(await state()).toMatchObject({ uid: null, isAuthLoading: true });
    await call('rejectLookup', 'B');
    expect(await state()).toMatchObject({
      uid: null,
      isAuthLoading: false,
      authError: true,
      projects: [],
      projectsLoadError: false,
      isProjectsLoading: true,
    });
  });
  test('prevents a pending lookup from resurrecting a signed-out account', async () => {
    await call('authEvent', 'A');
    await call('authEvent', null);
    await call('lookup', 'A', false);
    expect(await state()).toMatchObject({
      uid: null,
      isAuthLoading: false,
      showOnboarding: false,
      projects: [],
    });
  });
  test('does not carry onboarding from a new A account to existing B', async () => {
    await call('authEvent', 'A');
    await call('lookup', 'A', false);
    expect(await state()).toMatchObject({ uid: 'A', showOnboarding: true });
    await login('B');
    expect(await state()).toMatchObject({ uid: 'B', showOnboarding: false, isAuthLoading: false });
  });
  test('does not revive an earlier A subscription after switching A to B to A', async () => {
    await populateA();
    await login('B');
    await call('authEvent', 'A');
    await call('snapshot', 'projects?user=A', [{ id: 'obsolete A' }]);
    expect(await state()).toMatchObject({ uid: null, projects: [], isProjectsLoading: true });
    await call('lookup', 'A');
    await call('snapshot', 'projects?user=A', [{ id: 'obsolete A' }]);
    expect(await state()).toMatchObject({ uid: 'A', projects: [], isProjectsLoading: true });
  });
});

test('remount invalidates old callbacks and hides copied legacy A data from B', async () => {
  await populateA();
  const copied = await state();
  const oldGeneration = await call('generation');
  await call('unmount');
  await call('mount');
  await login('B');
  expect(await call('generation')).toBeGreaterThan(oldGeneration);
  await call('copyLegacy', {
    brand: copied.brand,
    projects: copied.projects,
    selectedIdea: copied.selectedIdea,
    selectedProject: copied.selectedProject,
  });
  await call('error', 'projects?user=A');
  await call('snapshot', 'projects/brand_A', { status: 'active', data: { name: 'late A' } });
  expect(await state()).toMatchObject({
    uid: 'B',
    brand: null,
    projects: [],
    selectedIdea: null,
    selectedProject: null,
    isProjectsLoading: true,
    projectsLoadError: false,
  });
});

test('initial observer timeout is an error and a late observer recovers', async () => {
  await page.clock.fastForward(15001);
  expect(await state()).toMatchObject({ uid: null, isAuthLoading: false, authError: true });
  await login('A');
  expect(await state()).toMatchObject({ uid: 'A', authError: false });
});

test('existing in-progress onboarding resumes, while legacy and completed users do not', async () => {
  await call('authEvent', 'A');
  await call('lookup', 'A', true, { onboardingAnswers: { summary: '__onboarding_in_progress__' } });
  expect(await state()).toMatchObject({ uid: 'A', showOnboarding: true });
  await call('authEvent', 'B');
  await call('lookup', 'B', true, {});
  expect(await state()).toMatchObject({ uid: 'B', showOnboarding: false });
  await call('authEvent', 'C');
  await call('lookup', 'C', true, { onboardingAnswers: { summary: 'finished' } });
  expect(await state()).toMatchObject({ uid: 'C', showOnboarding: false });
});

test('a transaction retried after another session completes cannot recreate the profile', async () => {
  await page.evaluate(() => {
    (window as any).test.retryTransaction = true;
  });
  await call('authEvent', 'A');
  await call('lookup', 'A', false);
  expect(await state()).toMatchObject({ uid: null, isAuthLoading: true });
  await call('lookup', 'A', true, { onboardingAnswers: { summary: 'complete' } });
  expect(await state()).toMatchObject({ uid: 'A', showOnboarding: false });
  expect(await page.evaluate(() => (window as any).test.writes)).toEqual([
    { key: 'users/A', data: { lastLogin: 1 } },
  ]);
});

test('stale transaction retry starts no read after batched A-B-A', async () => {
  await page.evaluate(() => {
    (window as any).test.retryTransaction = true;
    (window as any).test.holdRetry = true;
  });
  await call('authEvent', 'A');
  await call('lookup', 'A', false);
  await expect
    .poll(() => page.evaluate(() => typeof (window as any).test.releaseRetry))
    .toBe('function');
  await call('batchedSwitch');
  const before = await page.evaluate(() => (window as any).test.lookups.length);
  await page.evaluate(() => (window as any).test.releaseRetry());
  await page.waitForTimeout(100);
  expect(await page.evaluate(() => (window as any).test.lookups.length)).toBe(before);
  expect(await page.evaluate(() => (window as any).test.writes)).toEqual([]);
  await call('lookup', 'A', false);
  expect(await state()).toMatchObject({ uid: 'A', showOnboarding: true, authError: false });
});
