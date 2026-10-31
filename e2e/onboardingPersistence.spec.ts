import { test, expect, type Page } from '@playwright/test';
import { build } from 'esbuild';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const mocks: Record<string, string> = {
  icons: `export const PaperPlaneRight = () => null, CaretRight = PaperPlaneRight, Sparkle = PaperPlaneRight, CheckCircle = PaperPlaneRight, CircleNotch = PaperPlaneRight, Robot = PaperPlaneRight, Fire = PaperPlaneRight, Diamond = PaperPlaneRight, MagicWand = PaperPlaneRight, ArrowClockwise = PaperPlaneRight, Users = PaperPlaneRight, Smiley = PaperPlaneRight;`,
  firebase: `
    export let auth = {}; export const useSDKAuth = value => { auth = value; }; export const db = {}, OperationType = { GET: 'get', WRITE: 'write' };
    export const completeGoogleRedirect = async () => null;
    export const onAuthStateChanged = (_auth, cb) => { window.test.auth = cb; return window.test.sdk ? window.test.sdk.onAuthStateChanged(auth, cb) : () => {}; };
    export const handleFirestoreError = (error, operation, path) => { window.test.errors.push({ message: error.message, operation, path }); throw error; };
    export const serverTimestamp = () => 1;
    export const logout = async () => {};
    export const apiFetch = async (url, options, owner) => {
      if (window.test.sdk) return window.test.realApiFetch(url, options, owner);
      if (!owner?.uid || !owner.isCurrent()) throw new DOMException('Account changed', 'AbortError');
      const result = await authorizedFetch(url, options);
      return { json: async () => result };
    };
    export const authorizedFetch = async (url, options) => {
      window.test.requests.push({url, options});
      if (url.endsWith('/chat')) {
        if (window.test.expiredChat) throw new window.test.AuthExpiredError();
        if (window.test.failChat) throw new Error('offline');
        if (window.test.partialChat) return { message: 'Tell me more' };
        if (window.test.missingSummary) return { message: 'Interview complete', isComplete: true };
        return { message: 'Interview complete', isComplete: true, summary: window.test.summary || { niche: 'Gardening', audience: 'Beginners', vibe: 'Calm' } };
      }
      if (url.endsWith('/generate-brand')) return { name: 'Garden', tagline: 'Grow together' };
      return { museMessage: 'Try this', sparks: [{ title: 'Garden Sparks', type: 'trending', badge: 'Trending', pitch: 'Grow plants', dreamViewer: 'Beginners', vibe: 'Calm' }] };
    };
  `,
  firestore: `
    export const doc = (_db, col, id) => ({ key: col + '/' + id });
    export const collection = (_db, name) => ({ key: name });
    export const where = (_field, _op, uid) => uid;
    export const query = (ref, uid) => ({ key: ref.key + '?user=' + uid });
    const read = async (ref, kind) => {
      window.test.reads.push(kind + ':' + ref.key);
      if (window.test.failRead === kind + ':' + ref.key) throw new Error('read failed');
      const data = JSON.parse(localStorage.getItem(ref.key) || 'null');
      if (window.test.holdRead === kind + ':' + ref.key) {
        window.test.holdRead = null;
        await new Promise(resolve => window.test.releaseRead = resolve);
        window.test.reads.push('released:' + kind + ':' + ref.key);
      }
      return { exists: () => data !== null, data: () => data };
    };
    export const getDoc = ref => read(ref, 'restore');
    export const setDoc = async (ref, data, options) => { const previous = JSON.parse(localStorage.getItem(ref.key) || '{}'); localStorage.setItem(ref.key, JSON.stringify(options?.merge || options?.mergeFields ? {...previous, ...data} : data)); };
    export const runTransaction = (_db, fn) => {
      const run = async () => {
        const tracked = !!window.test.holdRetry || !!window.test.holdRead;
        try {
        const writes = [];
        const transaction = { get: ref => read(ref, 'tx'), set: (...args) => writes.push(args) };
        let result = await fn(transaction);
        if (window.test.holdRetry) {
          window.test.holdRetry = false;
          writes.length = 0;
          await new Promise(resolve => window.test.releaseRetry = resolve);
          result = await fn(transaction);
        }
        if (window.test.failCompletion && writes.some(args => args[1].updatedAt && args[1].onboardingAnswers)) throw new Error('completion failed');
        window.test.writes.push(...writes.map(args => args[0].key));
        for (const args of writes) await setDoc(...args);
        return result;
        } finally { if (tracked) window.test.finished = (window.test.finished || 0) + 1; }
      };
      return window.test.unlocked ? run() : navigator.locks.request('firestore', run);
    };
    export const serverTimestamp = () => 1;
    export const onSnapshot = () => () => {};
  `,
  journey: `export const ensureFirstDollarJourney = async () => { if (window.test.holdJourney) await new Promise(resolve => window.test.releaseJourney = resolve); if (window.test.failJourney) throw new Error('journey failed'); };`,
  router: `export const router = { navigate: target => { window.test.navigation = target.to; }, invalidate: () => {} };`,
  routerProvider: `import React from 'react'; export const RouterProvider = () => <div>Router ready</div>;`,
  verification: `export default function VerificationBanner() { return null; }`,
};
const harness = `
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import AppRoot from './src/AppRoot';
import { apiFetch as realApiFetch, AuthExpiredError } from './src/lib/apiClient';
import { useSDKAuth } from '@/firebase';
import { pendingAuthReturn } from './src/lib/authReturn';
import { cacheNicheToBrandProfile } from './src/components/Onboarding';
window.test = { requests: [], reads: [], writes: [], errors: [], cacheNicheToBrandProfile, realApiFetch, AuthExpiredError, pendingAuthReturn };
window.test.startSDK = async () => {
  // Install the transport before dynamic imports: no Firebase request leaves Chromium.
  const jwt = uid => 'header.' + btoa(JSON.stringify({sub: uid, user_id: uid, iat: Math.floor(Date.now()/1000), exp: Math.floor(Date.now()/1000)+3600})) + '.signature';
  window.fetch = async (input, options) => {
    const url = String(input); window.test.transport.push(url);
    const json = (body, status = 200) => new Response(JSON.stringify(body), {status, headers: {'Content-Type':'application/json'}});
    if (url.includes('accounts:signInWithCustomToken')) { const uid = JSON.parse(options.body).token; window.test.sdkUid = uid; return json({localId: uid, idToken: jwt(uid), refreshToken:'offline-refresh', expiresIn:'3600'}); }
    if (url.includes('accounts:lookup')) return json({users:[{localId:window.test.sdkUid, email:window.test.sdkUid+'@example.test', providerUserInfo:[]}]});
    if (url.includes('/token?')) return json({error:{code:400,message:'TOKEN_EXPIRED'}}, 400);
    if (url.endsWith('/api/onboarding/chat') || url === '/api/onboarding/chat') return json({}, 401);
    throw new Error('Blocked offline transport');
  };
  window.test.transport = [];
  const {initializeApp} = await import('firebase/app');
  const sdk = await import('firebase/auth');
  const app = initializeApp({apiKey:'offline-test-key',authDomain:'creator.test',projectId:'demo-local-recovery'}, 'browser-recovery');
  const auth = sdk.initializeAuth(app,{persistence:sdk.inMemoryPersistence});
  window.test.sdk = sdk; window.test.sdkAuth = auth; useSDKAuth(auth);
  window.test.signInSDK = uid => sdk.signInWithCustomToken(auth,uid);
  await window.test.signInSDK('A');
};
window.test.mount = async () => { await act(async () => createRoot(document.getElementById('root')).render(<AppRoot />)); if (!window.test.sdk) await act(async () => window.test.auth({ uid: 'A', email: 'a@example.test' })); };
`;
let bundle: string;
test.beforeAll(async () => {
  test.setTimeout(120_000);
  const root = process.cwd();
  const result = await build({
    stdin: { contents: harness, resolveDir: root, loader: 'tsx' },
    bundle: true,
    write: false,
    platform: 'browser',
    format: 'iife',
    preserveSymlinks: true,
    plugins: [
      {
        name: 'mock-io',
        setup(build) {
          build.onResolve({ filter: /^@phosphor-icons\/react$/ }, () => ({ path: 'icons', namespace: 'mock' }));
          build.onResolve({ filter: /^react$/ }, () => ({ path: require.resolve('react') }));
          build.onResolve({ filter: /^(?:@\/firebase|\.\.\/firebase)$/ }, () => ({
            path: 'firebase',
            namespace: 'mock',
          }));
          build.onResolve({ filter: /^firebase\/firestore$/ }, () => ({
            path: 'firestore',
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
          build.onResolve({ filter: /^\.\/components\/(?:VerificationBanner|SessionExpired)$/ }, () => ({
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
async function mount(page: Page, holdRestore = false, realSDK = false) {
  await page.route('**/*', (route) => route.abort());
  await page.route('https://creator.test/**', (route) =>
    route.fulfill({ contentType: 'text/html', body: '<div id="root"></div>' }),
  );
  await page.goto('https://creator.test/');
  await page.addScriptTag({ content: bundle });
  if (holdRestore) {
    await page.evaluate(() => {
      localStorage.setItem(
        'projects/brand_A',
        JSON.stringify({ status: 'draft', draft: { niche: 'Old draft' } }),
      );
      (window as any).test.holdRead = 'restore:projects/brand_A';
      (window as any).test.unlocked = true;
    });
  }
  if (realSDK) {
    await page.evaluate(() => history.replaceState(null, '', '/studio?project=local#draft'));
    await page.evaluate(() => (window as any).test.startSDK());
  }
  await page.evaluate(() => (window as any).test.mount());
}
async function interview(page: Page) {
  await page.getByRole('button', { name: "Let's Begin!" }).click();
  const input = page.getByPlaceholder('Type your response here...');
  await input.fill('Gardening');
  await input.press('Enter');
  await expect(page.getByRole('heading', { name: 'Your Profile is Ready!' })).toBeVisible();
}
async function answers(page: Page) {
  return page.evaluate(() => JSON.parse(localStorage.getItem('users/A')!).onboardingAnswers);
}

test('first chat failure preserves only the real answer', async ({ page }) => {
  await mount(page);
  await page.evaluate(() => {
    (window as any).test.failChat = true;
  });
  await page.getByRole('button', { name: "Let's Begin!" }).click();
  const input = page.getByPlaceholder('Type your response here...');
  await input.fill('Gardening');
  await input.press('Enter');
  await expect(page.getByText(/Who is your dream/i)).toBeVisible();
  await page.getByRole('button', { name: 'Go to Today', exact: true }).click();
  expect(await answers(page)).toEqual({ niche: 'Gardening', audience: '', vibe: '', summary: '' });
});

test('missing AI summary is honestly incomplete', async ({ page }) => {
  await mount(page);
  await page.evaluate(() => {
    (window as any).test.missingSummary = true;
  });
  await page.getByRole('button', { name: "Let's Begin!" }).click();
  const input = page.getByPlaceholder('Type your response here...');
  await input.fill('Gardening');
  await input.press('Enter');
  await expect(page.getByRole('heading', { name: 'Your Profile is Incomplete' })).toBeVisible();
  await page.getByRole('button', { name: 'Continue to Today' }).click();
  await expect(page.getByText('Router ready')).toBeVisible();
  expect(await answers(page)).toEqual({ niche: 'Gardening', audience: '', vibe: '', summary: '' });
});

test('oversized replies stay editable with clear feedback', async ({ page }) => {
  await mount(page);
  await page.getByRole('button', { name: "Let's Begin!" }).click();
  const input = page.getByPlaceholder('Type your response here...');
  await input.fill('x'.repeat(1001));
  await input.press('Enter');
  await expect(page.getByText(/1000 characters/i)).toBeVisible();
  await expect(input).toHaveValue('x'.repeat(1001));
  await input.fill('Garden');
  await input.press('Enter');
  await expect(page.getByRole('heading', { name: 'Your Profile is Ready!' })).toBeVisible();
});

test('stale brand completion cannot replace another tab profile', async ({ page, context }) => {
  await mount(page);
  const other = await context.newPage();
  await mount(other);
  await other.evaluate(() => {
    (window as any).test.summary = { niche: 'Cooking', audience: 'Cooks', vibe: 'Bold' };
  });
  await interview(page);
  await interview(other);
  await page.getByRole('button', { name: 'Continue to Today' }).click();
  await expect(page.getByText('Router ready')).toBeVisible();
  await other.getByRole('button', { name: 'Build my channel style first' }).click();
  await expect(other.getByRole('alert')).toContainText(/another tab/i);
  expect(await answers(other)).toEqual({
    niche: 'Gardening',
    audience: 'Beginners',
    vibe: 'Calm',
    summary: '',
  });
  expect(await other.evaluate(() => localStorage.getItem('projects/brand_A'))).toBeNull();
});

test('failed brand completion can continue with the exact generated kit', async ({ page }) => {
  await mount(page);
  await interview(page);
  await page.evaluate(() => {
    (window as any).test.failCompletion = true;
  });
  await page.getByRole('button', { name: 'Build my channel style first' }).click();
  await expect(page.getByRole('alert')).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('projects/brand_A'))).toBeNull();
  expect(await answers(page)).toEqual({ summary: '__onboarding_in_progress__' });
  await page.evaluate(() => {
    (window as any).test.failCompletion = false;
  });
  await page.getByRole('button', { name: 'Continue to Today' }).click();
  await expect(page.getByText('Router ready')).toBeVisible();
  expect(await answers(page)).toEqual({
    niche: 'Gardening',
    audience: 'Beginners',
    vibe: 'Calm',
    summary: 'Grow together',
  });
  expect(
    await page.evaluate(() => JSON.parse(localStorage.getItem('projects/brand_A')!).data.tagline),
  ).toBe('Grow together');
});

test('account switch during journey prevents stale completion writes', async ({ page }) => {
  await mount(page);
  await interview(page);
  await page.evaluate(() => {
    (window as any).test.holdJourney = true;
  });
  await page.getByRole('button', { name: 'Build my channel style first' }).click();
  await expect
    .poll(() => page.evaluate(() => typeof (window as any).test.releaseJourney))
    .toBe('function');
  await page.evaluate(async () => {
    await (window as any).test.auth({ uid: 'B', email: 'b@example.test' });
  });
  await page.evaluate(() => (window as any).test.releaseJourney());
  await expect(page.getByRole('heading', { name: "Let's Build Your Channel Style" })).toBeVisible();
  expect(await answers(page)).toEqual({ summary: '__onboarding_in_progress__' });
  expect(await page.evaluate(() => localStorage.getItem('projects/brand_A'))).toBeNull();
});

test('journey failure preserves the generated kit for Continue', async ({ page }) => {
  await mount(page);
  await interview(page);
  await page.evaluate(() => {
    (window as any).test.failJourney = true;
  });
  await page.getByRole('button', { name: 'Build my channel style first' }).click();
  await expect(page.getByRole('alert')).toContainText('journey failed');
  expect(await page.evaluate(() => localStorage.getItem('projects/brand_A'))).toBeNull();
  await page.evaluate(() => {
    (window as any).test.failJourney = false;
  });
  await page.getByRole('button', { name: 'Continue to Today' }).click();
  await expect(page.getByText('Router ready')).toBeVisible();
  expect((await answers(page)).summary).toBe('Grow together');
  expect(
    await page.evaluate(() => JSON.parse(localStorage.getItem('projects/brand_A')!).data.tagline),
  ).toBe('Grow together');
});

test('a conflicting interview requires acknowledgment before using the other tab profile', async ({
  page,
  context,
}) => {
  await mount(page);
  const other = await context.newPage();
  await mount(other);
  await other.evaluate(() => {
    (window as any).test.summary = { niche: 'Cooking', audience: 'Cooks', vibe: 'Bold' };
  });
  await interview(page);
  await interview(other);
  await page.getByRole('button', { name: 'Continue to Today' }).click();
  await expect(page.getByText('Router ready')).toBeVisible();
  await other.getByRole('button', { name: 'Continue to Today' }).click();
  await expect(other.getByRole('alert')).toContainText('another tab');
  await other.getByRole('button', { name: 'Continue to Today' }).click();
  await expect(other.getByText('Router ready')).toBeVisible();
  expect(await answers(other)).toEqual({
    niche: 'Gardening',
    audience: 'Beginners',
    vibe: 'Calm',
    summary: '',
  });
});

test('a completed kit and its answers survive a stale conflicting tab', async ({
  page,
  context,
}) => {
  await mount(page);
  const other = await context.newPage();
  await mount(other);
  await other.evaluate(() => {
    (window as any).test.summary = { niche: 'Cooking', audience: 'Cooks', vibe: 'Bold' };
  });
  await interview(page);
  await interview(other);
  await page.getByRole('button', { name: 'Build my channel style first' }).click();
  await expect(page.getByText('Router ready')).toBeVisible();
  await other.getByRole('button', { name: 'Build my channel style first' }).click();
  await expect(other.getByRole('alert')).toContainText('another tab');
  await other.getByRole('button', { name: 'Continue to Today' }).click();
  await expect(other.getByText('Router ready')).toBeVisible();
  expect(await answers(other)).toEqual({
    niche: 'Gardening',
    audience: 'Beginners',
    vibe: 'Calm',
    summary: 'Grow together',
  });
  expect(
    await other.evaluate(() => JSON.parse(localStorage.getItem('projects/brand_A')!).data.tagline),
  ).toBe('Grow together');
});

test('real interview Continue saves the displayed answers and survives reload', async ({
  page,
}) => {
  await mount(page);
  await interview(page);
  await page.getByRole('button', { name: 'Continue to Today' }).click();
  await expect(page.getByText('Router ready')).toBeVisible();
  expect(await answers(page)).toEqual({
    niche: 'Gardening',
    audience: 'Beginners',
    vibe: 'Calm',
    summary: '',
  });
  await mount(page);
  await expect(page.getByText('Router ready')).toBeVisible();
});

test('stale tab skip cannot erase answers completed in another tab', async ({ page, context }) => {
  await mount(page);
  const other = await context.newPage();
  await mount(other);
  await interview(page);
  await page.getByRole('button', { name: 'Continue to Today' }).click();
  await expect(page.getByText('Router ready')).toBeVisible();
  await other.getByRole('button', { name: 'Go to Today without a brand kit' }).click();
  await expect(other.getByText('Router ready')).toBeVisible();
  expect(await answers(other)).toEqual({
    niche: 'Gardening',
    audience: 'Beginners',
    vibe: 'Calm',
    summary: '',
  });
});

test('concurrent skip and interview retain answers when skip finishes first', async ({
  page,
  context,
}) => {
  await mount(page);
  const other = await context.newPage();
  await mount(other);
  await interview(page);
  await page.evaluate(() => {
    (window as any).test.holdJourney = true;
  });
  await page.getByRole('button', { name: 'Continue to Today' }).click();
  await other.getByRole('button', { name: 'Go to Today without a brand kit' }).click();
  await expect(other.getByText('Router ready')).toBeVisible();
  await page.evaluate(() => (window as any).test.releaseJourney());
  await expect(page.getByText('Router ready')).toBeVisible();
  expect(await answers(page)).toEqual({
    niche: 'Gardening',
    audience: 'Beginners',
    vibe: 'Calm',
    summary: '',
  });
});

test('leaving mid-interview preserves the replies already supplied', async ({ page }) => {
  await mount(page);
  await page.evaluate(() => {
    (window as any).test.partialChat = true;
  });
  await page.getByRole('button', { name: "Let's Begin!" }).click();
  const input = page.getByPlaceholder('Type your response here...');
  await input.fill('Gardening');
  await input.press('Enter');
  await expect(page.getByText('Tell me more')).toBeVisible();
  await page.getByRole('button', { name: 'Go to Today', exact: true }).click();
  await expect(page.getByText('Router ready')).toBeVisible();
  expect(await answers(page)).toEqual({ niche: 'Gardening', audience: '', vibe: '', summary: '' });
});

test('failed completion remains open and can retry without losing the interview', async ({
  page,
}) => {
  await mount(page);
  await interview(page);
  await page.evaluate(() => {
    (window as any).test.failCompletion = true;
  });
  await page.getByRole('button', { name: 'Continue to Today' }).click();
  await expect(page.getByRole('alert')).toContainText('completion failed');
  expect(await answers(page)).toEqual({ summary: '__onboarding_in_progress__' });
  await page.evaluate(() => {
    (window as any).test.failCompletion = false;
  });
  await page.getByRole('button', { name: 'Continue to Today' }).click();
  await expect(page.getByText('Router ready')).toBeVisible();
  expect(await answers(page)).toEqual({
    niche: 'Gardening',
    audience: 'Beginners',
    vibe: 'Calm',
    summary: '',
  });
});

test('offline final chat keeps user replies rather than assistant prompts', async ({ page }) => {
  await mount(page);
  await page.evaluate(() => {
    (window as any).test.partialChat = true;
  });
  await page.getByRole('button', { name: "Let's Begin!" }).click();
  const input = page.getByPlaceholder('Type your response here...');
  await input.fill('Gardening');
  await input.press('Enter');
  await expect(page.getByText('Tell me more')).toHaveCount(1);
  await input.fill('Beginners');
  await input.press('Enter');
  await expect(page.getByText('Tell me more')).toHaveCount(2);
  await page.evaluate(() => {
    (window as any).test.failChat = true;
  });
  await input.fill('Calm');
  await input.press('Enter');
  await expect(page.getByRole('heading', { name: 'Your Profile is Ready!' })).toBeVisible();
  await page.getByRole('button', { name: 'Continue to Today' }).click();
  await expect(page.getByText('Router ready')).toBeVisible();
  expect(await answers(page)).toEqual({
    niche: 'Gardening',
    audience: 'Beginners',
    vibe: 'Calm',
    summary: '',
  });
});

async function switchAwayAndBack(page: Page, expectDraft = false, recoveredSuccess = false) {
  await page.evaluate(async () => (window as any).test.auth({ uid: 'B', email: 'b@example.test' }));
  await expect(page.getByRole('heading', { name: "Let's Build Your Channel Style" })).toBeVisible();
  await page.evaluate(async () => (window as any).test.auth({ uid: 'A', email: 'a@example.test' }));
  if (expectDraft) await expect(page.getByText(/New draft/).first()).toBeVisible();
  else if (recoveredSuccess) await expect(page.getByRole('heading', {name: 'Your Profile is Ready!'})).toBeVisible();
  else
    await expect(
      page.getByRole('heading', { name: "Let's Build Your Channel Style" }),
    ).toBeVisible();
  await page.evaluate(() => {
    (window as any).test.reads = [];
    (window as any).test.writes = [];
  });
}

for (const scenario of ['skip profile', 'kit profile', 'kit brand', 'retry'] as const) {
  test(`stale ${scenario} completion stops reads after A-B-A`, async ({ page }) => {
    await mount(page);
    if (scenario.startsWith('kit')) await interview(page);
    await page.evaluate((which) => {
      const t = (window as any).test;
      t.unlocked = true;
      if (which === 'retry') t.holdRetry = true;
      else t.holdRead = which === 'kit brand' ? 'tx:projects/brand_A' : 'tx:users/A';
    }, scenario);
    await page
      .getByRole('button', {
        name: scenario.startsWith('kit')
          ? 'Build my channel style first'
          : 'Go to Today without a brand kit',
      })
      .click();
    const release = scenario === 'retry' ? 'releaseRetry' : 'releaseRead';
    await expect
      .poll(() => page.evaluate((name) => typeof (window as any).test[name], release))
      .toBe('function');
    await switchAwayAndBack(page, false, scenario.startsWith('kit'));
    await page.evaluate((name) => (window as any).test[name](), release);
    await expect.poll(() => page.evaluate(() => (window as any).test.finished)).toBeGreaterThan(0);
    const result = await page.evaluate(() => ({
      reads: (window as any).test.reads,
      writes: (window as any).test.writes,
    }));
    expect(result.reads.filter((value: string) => value.startsWith('tx:'))).toEqual([]);
    expect(result.writes).toEqual([]);
    await expect(
      page.getByRole('heading', { name: scenario.startsWith('kit') ? 'Your Profile is Ready!' : "Let's Build Your Channel Style" }),
    ).toBeVisible();
  });
}

for (const key of ['users/A', 'projects/brand_A', 'retry']) {
  test(`stale niche cache stops after delayed ${key} read`, async ({ page }) => {
    await mount(page);
    await page.getByRole('button', { name: "Let's Begin!" }).click();
    await page.getByText('Blank page? Tap for trending niche sparks').click();
    await expect(page.getByText('Garden Sparks').first()).toBeVisible();
    await page.evaluate((key) => {
      const t = (window as any).test;
      t.unlocked = true;
      if (key === 'retry') t.holdRetry = true;
      else t.holdRead = 'tx:' + key;
    }, key);
    await page.getByText('Garden Sparks').first().click();
    const release = key === 'retry' ? 'releaseRetry' : 'releaseRead';
    await expect
      .poll(() => page.evaluate((name) => typeof (window as any).test[name], release))
      .toBe('function');
    await switchAwayAndBack(page, false, true);
    await page.evaluate((name) => (window as any).test[name](), release);
    await expect.poll(() => page.evaluate(() => (window as any).test.finished)).toBeGreaterThan(0);
    const result = await page.evaluate(() => ({
      reads: (window as any).test.reads,
      writes: (window as any).test.writes,
    }));
    expect(result.reads.filter((value: string) => value.startsWith('tx:'))).toEqual([]);
    expect(result.writes).toEqual([]);
  });
}

test('stale restored draft cannot affect a later A session', async ({ page }) => {
  await mount(page, true);
  await expect
    .poll(() => page.evaluate(() => typeof (window as any).test.releaseRead))
    .toBe('function');
  await page.evaluate(() =>
    localStorage.setItem(
      'projects/brand_A',
      JSON.stringify({ status: 'draft', draft: { niche: 'New draft' } }),
    ),
  );
  await switchAwayAndBack(page, true);
  await expect(page.getByText(/New draft/).first()).toBeVisible();
  await page.evaluate(() => (window as any).test.releaseRead());
  await expect
    .poll(() =>
      page.evaluate(() => (window as any).test.reads.includes('released:restore:projects/brand_A')),
    )
    .toBe(true);
  await expect(page.getByText(/Old draft/)).toHaveCount(0);
});

test('untouched onboarding restores a delayed draft', async ({ page }) => {
  await mount(page, true);
  await expect.poll(() => page.evaluate(() => typeof (window as any).test.releaseRead)).toBe('function');
  await page.evaluate(() => (window as any).test.releaseRead());
  await expect(page.getByText(/Old draft/).first()).toBeVisible();
});

test('delayed draft cannot replace typed or sent interview answers', async ({ page }) => {
  await mount(page, true);
  await page.evaluate(() => { (window as any).test.partialChat = true; });
  await page.getByRole('button', { name: "Let's Begin!" }).click();
  const input = page.getByPlaceholder('Type your response here...');
  await input.fill('My real niche');
  await input.press('Enter');
  await expect(page.getByText('Tell me more')).toBeVisible();
  await input.fill('My unsent audience');
  await page.evaluate(() => (window as any).test.releaseRead());
  await expect.poll(() => page.evaluate(() => (window as any).test.reads.includes('released:restore:projects/brand_A'))).toBe(true);
  await expect(page.getByText('My real niche')).toBeVisible();
  await expect(input).toHaveValue('My unsent audience');
  await expect(page.getByText(/Old draft/)).toHaveCount(0);
  await page.getByRole('button', { name: 'Go to Today', exact: true }).click();
  expect(await answers(page)).toEqual({ niche: 'My real niche', audience: '', vibe: '', summary: '' });
});

test('delayed draft cannot regress completed interview', async ({ page }) => {
  await mount(page, true);
  await interview(page);
  await page.evaluate(() => (window as any).test.releaseRead());
  await expect.poll(() => page.evaluate(() => (window as any).test.reads.includes('released:restore:projects/brand_A'))).toBe(true);
  await expect(page.getByRole('heading', { name: 'Your Profile is Ready!' })).toBeVisible();
  await page.getByRole('button', { name: 'Continue to Today' }).click();
  expect(await answers(page)).toEqual({ niche: 'Gardening', audience: 'Beginners', vibe: 'Calm', summary: '' });
});

for (const mode of ['skip', 'kit'] as const) {
  test(`${mode} preserves unknown fields without extra transaction writes`, async ({ page }) => {
    await mount(page);
    await page.evaluate(() => {
      const profile = JSON.parse(localStorage.getItem('users/A')!);
      profile.onboardingAnswers = { future: { kept: true } };
      profile.futureProfile = 'keep';
      localStorage.setItem('users/A', JSON.stringify(profile));
      localStorage.setItem(
        'projects/brand_A',
        JSON.stringify({ userId: 'A', status: 'draft', futureBrand: 'keep' }),
      );
      (window as any).test.writes = [];
    });
    if (mode === 'kit') await interview(page);
    await page
      .getByRole('button', {
        name: mode === 'kit' ? 'Build my channel style first' : 'Go to Today without a brand kit',
      })
      .click();
    await expect(page.getByText('Router ready')).toBeVisible();
    const state = await page.evaluate(() => ({
      profile: JSON.parse(localStorage.getItem('users/A')!),
      brand: JSON.parse(localStorage.getItem('projects/brand_A')!),
      writes: (window as any).test.writes,
    }));
    expect(state.profile.futureProfile).toBe('keep');
    expect(state.profile.onboardingAnswers.future).toEqual({ kept: true });
    expect(state.brand.futureBrand).toBe('keep');
    expect(state.writes).toEqual(mode === 'kit' ? ['projects/brand_A', 'users/A'] : ['users/A']);
  });
}

test('niche cache retains unknown fields and reports real read errors', async ({ page }) => {
  await mount(page);
  const result = await page.evaluate(async () => {
    const t = (window as any).test;
    localStorage.setItem(
      'projects/brand_A',
      JSON.stringify({ userId: 'A', status: 'draft', future: 'keep' }),
    );
    t.writes = [];
    await t.cacheNicheToBrandProfile({ uid: 'A' }, { title: 'Garden' }, () => true);
    const brand = JSON.parse(localStorage.getItem('projects/brand_A')!);
    const writes = [...t.writes];
    t.failRead = 'tx:users/A';
    let rejected = '';
    try {
      await t.cacheNicheToBrandProfile({ uid: 'A' }, { title: 'Other' }, () => true);
    } catch (error) {
      rejected = (error as Error).message;
    }
    return { brand, writes, rejected, errors: t.errors };
  });
  expect(result.brand.future).toBe('keep');
  expect(result.brand.draft.niche).toBe('Garden');
  expect(result.writes).toEqual(['projects/brand_A']);
  expect(result.rejected).toBe('read failed');
  expect(result.errors).toEqual([
    { message: 'read failed', operation: 'write', path: 'projects/brand_A' },
  ]);
});

test('building the brand saves the interview and generated tagline', async ({ page }) => {
  await mount(page);
  await interview(page);
  await page.getByRole('button', { name: 'Build my channel style first' }).click();
  await expect(page.getByText('Router ready')).toBeVisible();
  expect(await answers(page)).toEqual({
    niche: 'Gardening',
    audience: 'Beginners',
    vibe: 'Calm',
    summary: 'Grow together',
  });
});

test('real SDK refresh expiration returns to login and recovers only the same UID interview', async ({ page }) => {
  await mount(page, false, true);
  await page.getByRole('button', { name: "Let's Begin!" }).click();
  const input = page.getByPlaceholder('Type your response here...');
  await input.fill('My private gardening answer');
  await input.press('Enter');
  await expect.poll(() => page.evaluate(() => (window as any).test.navigation)).toBe('/login');
  expect(await page.evaluate(() => (window as any).test.sdkAuth.currentUser)).toBeNull();
  expect(await page.evaluate(() => (window as any).test.pendingAuthReturn())).toBe('/studio?project=local#draft');
  expect(await page.evaluate(() => (window as any).test.transport.some((url: string) => url.includes('/token?')))).toBe(true);
  await page.evaluate(() => (window as any).test.signInSDK('B'));
  await expect(page.getByRole('heading', { name: "Let's Build Your Channel Style" })).toBeVisible();
  await expect(page.getByText('My private gardening answer', {exact: true})).toHaveCount(0);
  await page.evaluate(() => (window as any).test.signInSDK('A'));
  await expect(input).toHaveValue('My private gardening answer');
  await expect(page.getByText('My private gardening answer', {exact: true})).toHaveCount(0);
  await expect(page.getByText('Interview complete')).toHaveCount(0);
});

test('spark authentication error remains visible after its pending dismiss timer', async ({ page }) => {
  await mount(page);
  await page.getByRole('button', { name: "Let's Begin!" }).click();
  await page.getByText('Blank page? Tap for trending niche sparks').click();
  await page.evaluate(() => { (window as any).test.expiredChat = true; });
  await page.getByText('Garden Sparks').first().click();
  await expect(page.getByText('Sign in again, then select your idea to retry.')).toBeVisible();
  await page.waitForTimeout(1200);
  await expect(page.getByText('Garden Sparks').first()).toBeVisible();
});

test('same UID reload preserves a generated kit for exact completion retry', async ({ page }) => {
  await mount(page);
  await interview(page);
  await page.evaluate(() => { (window as any).test.failCompletion = true; });
  await page.getByRole('button', { name: 'Build my channel style first' }).click();
  await expect(page.getByRole('alert')).toContainText('completion failed');
  await mount(page);
  await expect(page.getByRole('heading', { name: 'Your Profile is Ready!' })).toBeVisible();
  await page.getByRole('button', { name: 'Continue to Today' }).click();
  await expect(page.getByText('Router ready')).toBeVisible();
  expect(await answers(page)).toEqual({ niche: 'Gardening', audience: 'Beginners', vibe: 'Calm', summary: 'Grow together' });
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('projects/brand_A')!).data)).toEqual({ name: 'Garden', tagline: 'Grow together' });
  expect(await page.evaluate(() => (window as any).test.requests.filter((request: any) => request.url.endsWith('/generate-brand')))).toHaveLength(0);
});

test('batched A-B-A keys the actual onboarding generation while preserving the owner draft', async ({ page }) => {
  await mount(page);
  await page.getByRole('button', { name: "Let's Begin!" }).click();
  const input = page.getByPlaceholder('Type your response here...');
  await input.fill('Unsent owner draft');
  const marker = await input.evaluate(element => { (element as any).generationMarker = 'old'; return true; });
  expect(marker).toBe(true);
  await page.evaluate(async () => {
    const t = (window as any).test;
    t.auth({uid:'B',email:'b@example.test'});
    await t.auth({uid:'A',email:'a@example.test'});
  });
  await expect(input).toHaveValue('Unsent owner draft');
  expect(await input.evaluate(element => (element as any).generationMarker)).toBeUndefined();
});
