import { afterEach, beforeEach, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({ effects: [] as Array<() => void | (() => void)>, currentUser: null as any, analytics: vi.fn() }));
vi.mock('react', async (original) => {
  const real = await original<typeof import('react')>();
  return { ...real, useState: (initial: any) => [initial, vi.fn()], useRef: (initial: any) => ({ current: initial }), useEffect: (effect: any) => h.effects.push(effect) };
});
vi.mock('../src/firebase', () => ({
  auth: { get currentUser() { return h.currentUser; } }, onAuthStateChanged: vi.fn(), authorizedFetch: h.analytics,
  apiFetch: (...args: Parameters<typeof import('../src/lib/apiClient').apiFetch>) => realApiFetch(...args),
}));
import { apiFetch as realApiFetch } from '../src/lib/apiClient';
import ContentIdeaGenerator from '../src/components/ContentIdeaGenerator';

const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => { resolve = r; });
  return { promise, resolve };
};
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));
const response = (status: number) => new Response(JSON.stringify({ text: '{"ideas":[]}' }), { status });
let fetchMock: ReturnType<typeof vi.fn>;
let dispatch: ReturnType<typeof vi.fn>;
beforeEach(() => {
  h.effects = []; h.analytics.mockReset().mockResolvedValue({ success: true, summary: {} });
  fetchMock = vi.fn(); dispatch = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
  vi.stubGlobal('window', { location: { origin: 'http://localhost' }, dispatchEvent: dispatch });
});
afterEach(() => vi.unstubAllGlobals());
function mount() {
  ContentIdeaGenerator({ brand: { name: 'Private A' }, onSelectIdea: vi.fn() });
  return h.effects.map((effect) => effect());
}
it('does not dispatch an old prompt if the account changes while acquiring a token', async () => {
  const token = deferred<string>();
  h.currentUser = { uid: 'A', getIdToken: vi.fn(() => token.promise) };
  mount(); await tick();
  h.currentUser = { uid: 'B', getIdToken: vi.fn(async () => 'token-B') };
  token.resolve('token-A'); await tick();
  expect(fetchMock).not.toHaveBeenCalled();
});
it('never replays an old prompt with a new account after a 401', async () => {
  const first = deferred<Response>();
  h.currentUser = { uid: 'A', getIdToken: vi.fn(async () => 'token-A') };
  fetchMock.mockReturnValueOnce(first.promise);
  mount(); await tick();
  expect(fetchMock).toHaveBeenCalledTimes(1);
  h.currentUser = { uid: 'B', getIdToken: vi.fn(async () => 'token-B') };
  first.resolve(response(401)); await tick();
  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(h.currentUser.getIdToken).not.toHaveBeenCalled();
  expect(dispatch).not.toHaveBeenCalled();
});
it('does not replay after switching accounts during force refresh', async () => {
  const refresh = deferred<string>();
  const getIdToken = vi.fn((force?: boolean) => force ? refresh.promise : Promise.resolve('token-A'));
  h.currentUser = { uid: 'A', getIdToken };
  fetchMock.mockResolvedValueOnce(response(401));
  mount(); await tick();
  expect(getIdToken).toHaveBeenCalledWith(true);
  h.currentUser = { uid: 'B', getIdToken: vi.fn(async () => 'token-B') };
  refresh.resolve('token-A-new'); await tick();
  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(dispatch).not.toHaveBeenCalled();
});
it('does not expire a different account when the retry returns 401 after a switch', async () => {
  const retry = deferred<Response>();
  h.currentUser = { uid: 'A', getIdToken: vi.fn(async () => 'token-A') };
  fetchMock.mockResolvedValueOnce(response(401)).mockReturnValueOnce(retry.promise);
  mount(); await tick();
  expect(fetchMock).toHaveBeenCalledTimes(2);
  h.currentUser = { uid: 'B', getIdToken: vi.fn(async () => 'token-B') };
  retry.resolve(response(401)); await tick();
  expect(dispatch).not.toHaveBeenCalled();
});
it('does not dispatch if the generator unmounts while acquiring a token', async () => {
  const token = deferred<string>();
  h.currentUser = { uid: 'A', getIdToken: vi.fn(() => token.promise) };
  const cleanups = mount(); await tick();
  cleanups.forEach((cleanup) => cleanup?.());
  token.resolve('token-A'); await tick();
  expect(fetchMock).not.toHaveBeenCalled();
});
it('retries for the same owner when the request remains live', async () => {
  h.currentUser = { uid: 'A', getIdToken: vi.fn(async (force?: boolean) => force ? 'token-A-new' : 'token-A') };
  fetchMock.mockResolvedValueOnce(response(401)).mockResolvedValueOnce(response(200));
  mount(); await tick();
  expect(fetchMock).toHaveBeenCalledTimes(2);
  expect((fetchMock.mock.calls[1][1].headers as Headers).get('Authorization')).toBe('Bearer token-A-new');
});
