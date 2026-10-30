import { test, expect, type Page } from '@playwright/test';
import { build } from 'esbuild';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
// Render the actual components and provider; only external IO and unrelated
// router/onboarding UI are replaced so pending work can be resolved precisely.
const mocks: Record<string, string> = {
  firebase: `
    export const auth = {}, db = {}, OperationType = { GET: 'get', WRITE: 'write', UPDATE: 'update' };
    export const completeGoogleRedirect = async () => null;
    export const onAuthStateChanged = (_auth, cb) => { window.test.auth = cb; return () => {}; };
    export const handleFirestoreError = () => {};
    export const serverTimestamp = () => 1;
    export const logout = async () => {};
  `,
  firestore: `
    export const doc = (_db, col, id) => ({ key: col + '/' + id });
    export const collection = (_db, name) => ({ key: name });
    export const where = (_field, _op, uid) => uid;
    export const query = (ref, uid) => ({ key: ref.key + '?user=' + uid });
    export const getDoc = ref => {
      if (window.test.autoProfile) {
        const data = JSON.parse(localStorage.getItem(ref.key) || 'null');
        return Promise.resolve({ exists: () => data !== null, data: () => data });
      }
      return new Promise((resolve, reject) => window.test.lookups.push({ key: ref.key, resolve, reject }));
    };
    export const setDoc = (ref, data, options) => {
      if (!ref.key.startsWith('users/')) return new Promise(resolve => window.test.writes.push({ key: ref.key, resolve }));
      window.test.profiles.push({ key: ref.key, data, options });
      if (window.test.failCompletion && data.updatedAt && data.onboardingAnswers) return Promise.reject(new Error('completion failed'));
      if (window.test.autoProfile) {
        const previous = JSON.parse(localStorage.getItem(ref.key) || '{}');
        localStorage.setItem(ref.key, JSON.stringify({ ...previous, ...data }));
      }
      return Promise.resolve();
    };
    export const updateDoc = ref => new Promise(resolve => window.test.writes.push({ key: ref.key, resolve }));
    export const addDoc = async () => {};
    export const runTransaction = async (_db, fn) => {
      const writes = [];
      const result = await fn({ get: getDoc, set: (...args) => writes.push(args) });
      for (const args of writes) await setDoc(...args);
      return result;
    };
    export const serverTimestamp = () => 1;
    export const onSnapshot = (ref, next) => { window.test.listeners.push({ key: ref.key, next }); return () => {}; };
  `,
  gemini: `
    const wait = kind => new Promise(resolve => window.test.generations.push({ kind, resolve }));
    export const generateBrandKit = () => wait('kit');
    export const generateBrandLogo = () => wait('logo');
    export const generateStyleGuideSummary = () => wait('style');
    export const generateContentIdeas = () => wait('ideas');
  `,
  journey: `export const ensureFirstDollarJourney = uid => new Promise(resolve => window.test.journeys.push({ uid, resolve }));`,
  router: `export const router = { navigate: value => window.test.navigations.push(value), invalidate: () => {} };`,
  routerProvider: `import React from 'react'; export const RouterProvider = () => <div>Router ready</div>;`,
  onboarding: `import React from 'react'; export default function Onboarding({onComplete, user}) { const [error, setError] = React.useState(''); window.test.currentCompletion = onComplete; const complete = answers => onComplete(answers).catch(() => setError('Retry completion')); return <><button onClick={() => complete()}>Complete {user.uid}</button><button onClick={() => complete({ niche: 'niche', audience: 'audience', vibe: 'vibe', summary: 'tagline' })}>Complete with answers {user.uid}</button><span>{error}</span></>; }`,
  verification: `export default function VerificationBanner() { return null; }`,
};
const harness = `
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import AppRoot from './src/AppRoot';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { useWorkspaceStore, selectBrand, selectSelectedIdea } from './src/store/workspaceStore';
import Brand from './src/components/BrandingEngine';
import VideoIdeas from './src/components/VideoIdeas';
window.IS_REACT_ACT_ENVIRONMENT = true;
window.test = { lookups: [], listeners: [], generations: [], writes: [], profiles: [], journeys: [], navigations: [] };
function View({ mode }) {
  const auth = useAuth(); const store = useWorkspaceStore();
  const token = auth.workspaceToken?.uid === auth.user?.uid ? auth.workspaceToken : null;
  const brand = selectBrand(store, token);
  const setBrand = value => store.setBrand(token, value);
  window.test.current = { uid: auth.user?.uid || null, brand, selectedIdea: selectSelectedIdea(store, token), loading: auth.isAuthLoading };
  if (!auth.user || auth.isAuthLoading) return null;
  return mode === 'ideas'
    ? <VideoIdeas user={auth.user} key={token?.generation} brand={brand} setBrand={setBrand} setSelectedIdea={value => store.setSelectedIdea(token, value)} setActiveTab={tab => window.test.navigations.push(tab)} />
    : <Brand user={auth.user} key={token?.generation} brand={brand} setBrand={setBrand} />;
}
window.test.mount = async mode => { await act(async () => { createRoot(document.getElementById('root')).render(mode === 'onboarding' ? <AppRoot /> : <AuthProvider><View mode={mode} /></AuthProvider>); }); };
window.test.event = async uid => { await act(async () => { window.test.auth(uid ? { uid, email: uid + '@example.test' } : null); }); };
window.test.lookup = async (uid, exists = true, data = {}) => { await act(async () => { const x = window.test.lookups.find(x => x.key === 'users/' + uid && !x.done); x.done = true; x.resolve({ exists: () => exists, data: () => data }); }); };
window.test.rejectLookup = async uid => { await act(async () => { const x = window.test.lookups.find(x => x.key === 'users/' + uid && !x.done); x.done = true; x.reject(new Error('lookup failed')); }); };
window.test.brand = async (uid, data) => { await act(async () => { const x = window.test.listeners.find(x => x.key === 'projects/brand_' + uid); x.next({ exists: () => true, data: () => ({ status: 'active', data }) }); }); };
window.test.finishGeneration = async (kind, value) => { await act(async () => { const x = window.test.generations.find(x => x.kind === kind && !x.done); x.done = true; x.resolve(value); }); };
window.test.finishWrite = async () => { await act(async () => { const x = window.test.writes.find(x => !x.done); x.done = true; x.resolve(); }); };
window.test.finishJourney = async uid => { await act(async () => { const x = window.test.journeys.find(x => x.uid === uid && !x.done); x.done = true; x.resolve(); }); };
`;
let bundle: string;
let page: Page;
const brand = {
  name: 'A brand',
  archetype: 'Creator',
  personality: 'Calm',
  colors: {},
  typography: { heading: 'Arial' },
  content_hooks: [],
  catchphrases: [],
};
async function call(method: string, ...args: unknown[]) {
  return page.evaluate(async ({ method, args }) => (window as any).test[method](...args), {
    method,
    args,
  });
}
async function login(uid: string, exists = true) {
  await call('event', uid);
  await call('lookup', uid, exists);
}
test.beforeAll(async () => {
  test.setTimeout(300_000);
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
        name: 'io-boundaries',
        setup(build) {
          build.onResolve({ filter: /^react$/ }, () => ({ path: require.resolve('react') }));
          build.onResolve({ filter: /^(?:@\/firebase|\.\.\/firebase)$/ }, () => ({
            path: 'firebase',
            namespace: 'mock',
          }));
          build.onResolve({ filter: /^firebase\/firestore$/ }, () => ({
            path: 'firestore',
            namespace: 'mock',
          }));
          build.onResolve({ filter: /^\.\.\/services\/gemini$/ }, () => ({
            path: 'gemini',
            namespace: 'mock',
          }));
          build.onResolve({ filter: /^\.\/services\/firstDollarJourney$/ }, () => ({
            path: 'journey',
            namespace: 'mock',
          }));
          build.onResolve({ filter: /^\.\/router$/ }, () => ({
            path: 'router',
            namespace: 'mock',
          }));
          build.onResolve({ filter: /^@tanstack\/react-router$/ }, () => ({
            path: 'routerProvider',
            namespace: 'mock',
          }));
          build.onResolve({ filter: /^\.\/components\/Onboarding$/ }, () => ({
            path: 'onboarding',
            namespace: 'mock',
          }));
          build.onResolve({ filter: /^\.\/components\/VerificationBanner$/ }, () => ({
            path: 'verification',
            namespace: 'mock',
          }));
          build.onResolve({ filter: /^@\// }, (args) => ({
            path: path.join(root, 'src', args.path.slice(2) + '.ts'),
          }));
          build.onLoad({ filter: /.*/, namespace: 'mock' }, (args) => ({
            contents: mocks[args.path],
            loader: 'tsx',
          }));
        },
      },
    ],
  });
  bundle = result.outputFiles[0].text;
});
test.beforeEach(async ({ page: testPage }) => {
  page = testPage;
  await page.setContent('<div id="root"></div>');
  await page.addScriptTag({ content: bundle });
});

test('slow new account shows retry until late profile creation opens onboarding', async () => {
  await page.clock.install();
  await call('mount', 'onboarding');
  await call('event', 'A');
  await page.clock.fastForward(15001);
  await expect(page.getByRole('alert')).toContainText('Unable to load your account');
  await expect(page.getByRole('button', { name: 'Retry' })).toBeVisible();
  await expect(page.getByText('Router ready')).toHaveCount(0);
  await call('lookup', 'A', false);
  await expect(page.getByRole('button', { name: 'Complete A' })).toBeVisible();
  await expect(page.getByRole('alert')).toHaveCount(0);
  expect(await page.evaluate(() => (window as any).test.profiles)).toMatchObject([
    { key: 'users/A', data: { email: 'A@example.test' } },
  ]);
  expect(await page.evaluate(() => (window as any).test.journeys)).toEqual([]);
});

test('profile lookup failure remains actionable without redirect or workspace', async () => {
  await call('mount', 'onboarding');
  await login('A');
  await expect(page.getByText('Router ready')).toBeVisible();
  await call('event', 'B');
  await call('rejectLookup', 'B');
  await expect(page.getByRole('alert')).toContainText('Check your connection');
  await expect(page.getByRole('button', { name: 'Retry' })).toBeVisible();
  await expect(page.getByText('Router ready')).toHaveCount(0);
  expect(await page.evaluate(() => (window as any).test.navigations)).toEqual([]);
  await call('event', null);
  expect(await page.evaluate(() => (window as any).test.navigations)).toEqual([{ to: '/login' }]);
});

for (const kind of ['kit', 'logo', 'style', 'ideas'] as const) {
  test(`${kind} completion cannot overwrite B after A changes account`, async () => {
    await call('mount', kind === 'ideas' ? 'ideas' : 'brand');
    await login('A');
    if (kind !== 'kit') await call('brand', 'A', brand);
    if (kind === 'kit') {
      await page
        .getByPlaceholder(
          'Describe your channel. Who is it for? What kind of videos do you want to make? What should the vibe be?',
        )
        .fill('My channel');
      await page.getByRole('button', { name: 'Create My Channel Style' }).click();
    } else {
      await page
        .getByRole('button', {
          name:
            kind === 'logo'
              ? 'Generate Logo'
              : kind === 'style'
                ? 'Generate Style Guide'
                : 'Generate Ideas',
          exact: true,
        })
        .click();
    }
    const value = kind === 'kit' ? brand : kind === 'ideas' ? [{ title: 'A idea' }] : 'A generated';
    await call('finishGeneration', kind, value);
    expect(await page.evaluate(() => (window as any).test.writes.length)).toBe(1);
    await login('B');
    const b = { ...brand, name: 'B brand' };
    await call('brand', 'B', b);
    await call('finishWrite');
    expect(await page.evaluate(() => (window as any).test.current)).toMatchObject({
      uid: 'B',
      brand: b,
    });
  });
}
test('selecting a real idea creates an account-bound handoff', async () => {
  await call('mount', 'ideas');
  await login('A');
  const idea = { title: 'Handoff idea', hook: 'Hook', description: 'Description' };
  await call('brand', 'A', { ...brand, content_ideas: [idea] });
  await page.getByText('Handoff idea').click();
  expect(await page.evaluate(() => (window as any).test.current.selectedIdea)).toEqual(idea);
  expect(await page.evaluate(() => (window as any).test.navigations)).toEqual(['create']);
  await login('B');
  expect(await page.evaluate(() => (window as any).test.current.selectedIdea)).toBeNull();
});

test('stale generation is discarded before issuing a Firestore write', async () => {
  await call('mount', 'ideas');
  await login('A');
  await call('brand', 'A', brand);
  await page.getByRole('button', { name: 'Generate Ideas', exact: true }).click();
  await login('B');
  await call('finishGeneration', 'ideas', [{ title: 'A idea' }]);
  expect(await page.evaluate(() => (window as any).test.writes.length)).toBe(0);
});

test('an old A operation stays stale after switching A to B to A', async () => {
  await call('mount', 'ideas');
  await login('A');
  await call('brand', 'A', brand);
  await page.getByRole('button', { name: 'Generate Ideas', exact: true }).click();
  await call('finishGeneration', 'ideas', [{ title: 'old A idea' }]);
  await login('B');
  await login('A');
  await call('finishWrite');
  expect(await page.evaluate(() => (window as any).test.current)).toMatchObject({
    uid: 'A',
    brand: null,
  });
});

test('current account generation still updates the brand', async () => {
  await call('mount', 'ideas');
  await login('A');
  await call('brand', 'A', brand);
  await page.getByRole('button', { name: 'Generate Ideas', exact: true }).click();
  await call('finishGeneration', 'ideas', [{ title: 'A idea' }]);
  await call('finishWrite');
  expect(await page.evaluate(() => (window as any).test.current.brand.content_ideas)).toEqual([
    { title: 'A idea' },
  ]);
});
test('late onboarding completion for A does not dismiss B onboarding', async () => {
  await call('mount', 'onboarding');
  await login('A', false);
  await page.getByRole('button', { name: 'Complete A' }).click();
  await login('B', false);
  await expect(page.getByRole('button', { name: 'Complete B' })).toBeVisible();
  await call('finishJourney', 'A');
  await expect(page.getByRole('button', { name: 'Complete B' })).toBeVisible();
  await page.getByRole('button', { name: 'Complete B' }).click();
  await call('finishJourney', 'B');
  await call('lookup', 'B', true, { onboardingAnswers: { summary: '__onboarding_in_progress__' } });
  await expect(page.getByText('Router ready')).toBeVisible();
});

test('reload resumes incomplete onboarding, retries a failed completion, then stays complete', async () => {
  await page.route('https://creator.test/**', (route) =>
    route.fulfill({ contentType: 'text/html', body: '<div id="root"></div>' }),
  );
  await page.goto('https://creator.test/dashboard?from=link');
  const mount = async () => {
    await page.addScriptTag({ content: bundle });
    await page.evaluate(() => {
      (window as any).test.autoProfile = true;
    });
    await call('mount', 'onboarding');
    await call('event', 'A');
  };
  await mount();
  await expect(page.getByRole('button', { name: 'Complete A' })).toBeVisible();
  expect(
    await page.evaluate(() => JSON.parse(localStorage.getItem('users/A')!).onboardingAnswers),
  ).toEqual({ summary: '__onboarding_in_progress__' });
  await page.reload();
  await mount();
  await expect(page.getByRole('button', { name: 'Complete A' })).toBeVisible();
  await page.evaluate(() => {
    (window as any).test.failCompletion = true;
  });
  await page.getByRole('button', { name: 'Complete A' }).click();
  await call('finishJourney', 'A');
  await expect(page.getByText('Retry completion')).toBeVisible();
  expect(
    await page.evaluate(() => JSON.parse(localStorage.getItem('users/A')!).onboardingAnswers),
  ).toEqual({ summary: '__onboarding_in_progress__' });
  await page.evaluate(() => {
    (window as any).test.failCompletion = false;
  });
  await page.getByRole('button', { name: 'Complete A' }).click();
  await call('finishJourney', 'A');
  await expect(page.getByText('Router ready')).toBeVisible();
  expect(
    await page.evaluate(() => JSON.parse(localStorage.getItem('users/A')!).onboardingAnswers),
  ).toEqual({});
  await page.reload();
  await mount();
  await expect(page.getByText('Router ready')).toBeVisible();
  expect(page.url()).toBe('https://creator.test/dashboard?from=link');
});

test('initial observer timeout shows retry without navigating away from deep link', async () => {
  await page.clock.install();
  await page.route('https://creator.test/**', (route) =>
    route.fulfill({ contentType: 'text/html', body: '<div id="root"></div>' }),
  );
  await page.goto('https://creator.test/dashboard?from=link');
  await page.addScriptTag({ content: bundle });
  await call('mount', 'onboarding');
  await page.clock.fastForward(15001);
  await expect(page.getByRole('alert')).toContainText('Unable to load your account');
  await expect(page.getByRole('button', { name: 'Retry' })).toBeVisible();
  await expect(page.getByText('Router ready')).toHaveCount(0);
  expect(page.url()).toBe('https://creator.test/dashboard?from=link');
  expect(await page.evaluate(() => (window as any).test.navigations)).toEqual([]);
  await login('A');
  await expect(page.getByText('Router ready')).toBeVisible();
  expect(page.url()).toBe('https://creator.test/dashboard?from=link');
});

test('answers and completion are saved together and survive reload', async () => {
  await page.route('https://creator.test/**', (route) =>
    route.fulfill({ contentType: 'text/html', body: '<div id="root"></div>' }),
  );
  await page.goto('https://creator.test/dashboard');
  const mount = async () => {
    await page.addScriptTag({ content: bundle });
    await page.evaluate(() => {
      (window as any).test.autoProfile = true;
    });
    await call('mount', 'onboarding');
    await call('event', 'A');
  };
  await mount();
  await page.getByRole('button', { name: 'Complete with answers A' }).click();
  await call('finishJourney', 'A');
  await expect(page.getByText('Router ready')).toBeVisible();
  expect(
    await page.evaluate(() => JSON.parse(localStorage.getItem('users/A')!).onboardingAnswers),
  ).toEqual({ niche: 'niche', audience: 'audience', vibe: 'vibe', summary: 'tagline' });
  expect(
    await page.evaluate(() => (window as any).test.profiles.at(-1).options.mergeFields),
  ).toEqual(['onboardingAnswers', 'updatedAt']);
  await page.reload();
  await mount();
  await expect(page.getByText('Router ready')).toBeVisible();
});

test('timeout Retry reloads the same deep link', async () => {
  await page.clock.install();
  await page.route('https://creator.test/**', (route) =>
    route.fulfill({ contentType: 'text/html', body: '<div id="root"></div>' }),
  );
  await page.goto('https://creator.test/dashboard?from=link');
  await page.addScriptTag({ content: bundle });
  await call('mount', 'onboarding');
  await page.clock.fastForward(15001);
  await page.getByRole('button', { name: 'Retry' }).click();
  await page.waitForLoadState();
  expect(page.url()).toBe('https://creator.test/dashboard?from=link');
  await page.addScriptTag({ content: bundle });
  await call('mount', 'onboarding');
  await login('A');
  await expect(page.getByText('Router ready')).toBeVisible();
});

test('an old onboarding callback cannot complete a later A session', async () => {
  await call('mount', 'onboarding');
  await login('A', false);
  await page.evaluate(() => {
    (window as any).test.oldCompletion = (window as any).test.currentCompletion;
  });
  await login('B');
  await login('A', false);
  await page.evaluate(() => (window as any).test.oldCompletion());
  expect(
    await page.evaluate(() => (window as any).test.journeys.filter((j: any) => j.uid === 'A')),
  ).toEqual([]);
  await expect(page.getByRole('button', { name: 'Complete A' })).toBeVisible();
});
