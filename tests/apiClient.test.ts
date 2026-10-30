// F4.4 — Unified API client contract tests (src/lib/apiClient.ts).
// global fetch is mocked; Firebase auth is mocked at the module boundary.
// No real Firebase, no network.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { onAuthStateChanged } from '../src/firebase';
import { useWorkspaceStore, isWorkspaceTokenCurrent } from '../src/store/ownedWorkspaceStore';
import {
  AUTH_EXPIRED_EVENT,
  AuthExpiredError,
  RateLimitError,
  apiFetch,
} from '../src/lib/apiClient';

type MockUser = { uid?: string; getIdToken: (force?: boolean) => Promise<string | null> };

// Mutable auth state read by the mocked firebase module at call time.
// vi.hoisted so the hoisted vi.mock factory can safely close over it.
const mockState = vi.hoisted(() => ({
  currentUser: null as MockUser | null,
}));

vi.mock('../src/firebase', () => ({
  auth: {
    get currentUser() {
      return mockState.currentUser;
    },
  },
  onAuthStateChanged: vi.fn((_auth: unknown, cb: (user: unknown) => void) => {
    // Firebase fires the callback asynchronously; firing it synchronously here
    // would re-enter apiClient's requireIdToken before `unsubscribe` exists.
    queueMicrotask(() => cb(mockState.currentUser));
    return () => {};
  }),
}));

const fetchMock = vi.fn<typeof fetch>();
let dispatchEventMock: ReturnType<typeof vi.fn>;

function jsonResponse(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}

function authUser(
  tokenNormal: string | null,
  tokenRefreshed: string | null = tokenNormal,
): MockUser {
  return {
    getIdToken: vi.fn(async (force?: boolean) => (force ? tokenRefreshed : tokenNormal)),
  };
}

beforeEach(() => {
  dispatchEventMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
  vi.stubGlobal('window', {
    location: { origin: 'http://localhost:5173' },
    dispatchEvent: dispatchEventMock,
  });
  mockState.currentUser = authUser('token-1', 'token-2');
  fetchMock.mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('apiFetch — request shaping', () => {
  it('attaches the Bearer token and a JSON content-type to /api requests', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ ok: true }));

    await apiFetch('/api/projects', { method: 'POST', body: '{}' });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/projects');
    const headers = init?.headers as Headers;
    expect(headers.get('Authorization')).toBe('Bearer token-1');
    expect(headers.get('Content-Type')).toBe('application/json');
  });

  it('does not overwrite an explicit Content-Type', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ ok: true }));

    await apiFetch('/api/gemini/analyze-video', {
      method: 'POST',
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    const headers = fetchMock.mock.calls[0][1]?.headers as Headers;
    expect(headers.get('Content-Type')).toBe('multipart/form-data');
  });

  it('passes absolute same-origin /api URLs through the auth path', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ ok: true }));

    await apiFetch(new URL('http://localhost:5173/api/accounts'));

    const headers = fetchMock.mock.calls[0][1]?.headers as Headers;
    expect(headers.get('Authorization')).toBe('Bearer token-1');
  });
});

describe('apiFetch — non-API passthrough', () => {
  it.each(['https://external.example.com/data', 'blob:http://localhost:5173/some-uuid'])(
    'sends %s untouched (no Authorization header)',
    async (url) => {
      fetchMock.mockResolvedValueOnce(new Response('external'));

      await apiFetch(url, { method: 'GET' });

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [calledUrl, init] = fetchMock.mock.calls[0];
      expect(calledUrl).toBe(url);
      expect(init?.headers).toBeUndefined();
    },
  );
});

describe('apiFetch — 401 force-refresh-retry-once', () => {
  it.each(['init', 'request'] as const)('promptly aborts an unresolved initial token with the %s signal', async (source) => {
    const controller = new AbortController();
    let rejectToken!: (error: Error) => void;
    mockState.currentUser = { getIdToken: () => new Promise<string>((_resolve, reject) => { rejectToken = reject; }) };
    const input = source === 'request' ? new Request('http://localhost:5173/api/projects', { signal: controller.signal }) : '/api/projects';
    const result = apiFetch(input, source === 'init' ? { signal: controller.signal } : {}).catch((error) => error);
    controller.abort();
    expect((await result).name).toBe('AbortError');
    rejectToken(new Error('late token failure'));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(fetchMock).not.toHaveBeenCalled();
    expect(dispatchEventMock).not.toHaveBeenCalled();
  }, 500);

  it.each(['init', 'request'] as const)('promptly aborts an unresolved refresh with the %s signal', async (source) => {
    const controller = new AbortController();
    let rejectRefresh!: (error: Error) => void;
    let refreshStarted!: () => void;
    const started = new Promise<void>((resolve) => { refreshStarted = resolve; });
    mockState.currentUser = { getIdToken: (force) => force
      ? (refreshStarted(), new Promise<string>((_resolve, reject) => { rejectRefresh = reject; }))
      : Promise.resolve('token-1') };
    fetchMock.mockResolvedValue(jsonResponse({}, 401));
    const input = source === 'request' ? new Request('http://localhost:5173/api/projects', { signal: controller.signal }) : '/api/projects';
    const result = apiFetch(input, source === 'init' ? { signal: controller.signal } : {}).catch((error) => error);
    await started;
    controller.abort();
    expect((await result).name).toBe('AbortError');
    rejectRefresh(new Error('late refresh failure'));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(dispatchEventMock).not.toHaveBeenCalled();
  }, 500);

  it('does not acquire a token for a pre-aborted signal', async () => {
    const controller = new AbortController();
    const token = vi.fn(() => Promise.resolve('token-1'));
    mockState.currentUser = { getIdToken: token };
    controller.abort();
    await expect(apiFetch('/api/projects', { signal: controller.signal })).rejects.toMatchObject({ name: 'AbortError' });
    expect(token).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it('does not send after aborting while the initial token is pending', async () => {
    const controller = new AbortController();
    let resolveToken!: (token: string) => void;
    mockState.currentUser = { getIdToken: () => new Promise<string>((resolve) => { resolveToken = resolve; }) };
    const pending = apiFetch('/api/projects', { signal: controller.signal }).catch((error) => error);
    controller.abort();
    resolveToken('token-1');
    expect((await pending).name).toBe('AbortError');
    expect(fetchMock).not.toHaveBeenCalled();
    expect(dispatchEventMock).not.toHaveBeenCalled();
  });

  it('does not expire the session when the retry returns after abort', async () => {
    const controller = new AbortController();
    let resolveRetry!: (response: Response) => void;
    let retryStarted!: () => void;
    const started = new Promise<void>((resolve) => { retryStarted = resolve; });
    fetchMock.mockResolvedValueOnce(jsonResponse({}, 401));
    fetchMock.mockImplementationOnce(() => (retryStarted(), new Promise<Response>((resolve) => { resolveRetry = resolve; })));
    const pending = apiFetch('/api/projects', { signal: controller.signal }).catch((error) => error);
    await started;
    controller.abort();
    resolveRetry(jsonResponse({}, 401));
    expect((await pending).name).toBe('AbortError');
    expect(dispatchEventMock).not.toHaveBeenCalled();
  });

  it.each(['init', 'request'] as const)('ignores rejected refresh after %s signal aborts', async (source) => {
    const controller = new AbortController();
    let rejectRefresh!: (error: Error) => void;
    let refreshStarted!: () => void;
    const started = new Promise<void>((resolve) => { refreshStarted = resolve; });
    mockState.currentUser = { getIdToken: (force) => force
      ? (refreshStarted(), new Promise<string>((_resolve, reject) => { rejectRefresh = reject; }))
      : Promise.resolve('token-1') };
    fetchMock.mockResolvedValue(jsonResponse({}, 401));
    const input = source === 'request' ? new Request('http://localhost:5173/api/projects', { signal: controller.signal }) : '/api/projects';
    const pending = apiFetch(input, source === 'init' ? { signal: controller.signal } : {});
    const result = pending.catch((error) => error);
    await started;
    controller.abort();
    rejectRefresh(new Error('refresh failed'));
    expect((await result).name).toBe('AbortError');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(dispatchEventMock).not.toHaveBeenCalled();
  });

  it('replays a consumed Request body after refresh', async () => {
    const bodies: string[] = [];
    fetchMock.mockImplementation(async (input, init) => {
      bodies.push(await new Request(input, init).text());
      return jsonResponse({}, bodies.length === 1 ? 401 : 200);
    });
    const request = new Request('http://localhost:5173/api/projects', { method: 'POST', body: '{"hello":"world"}' });
    await expect(apiFetch(request)).resolves.toMatchObject({ ok: true });
    expect(bodies).toEqual(['{"hello":"world"}', '{"hello":"world"}']);
  });

  it('does not replay a successful refresh after cancellation', async () => {
    const controller = new AbortController();
    let resolveRefresh!: (token: string) => void;
    let refreshStarted!: () => void;
    const started = new Promise<void>((resolve) => { refreshStarted = resolve; });
    mockState.currentUser = { getIdToken: (force) => force
      ? (refreshStarted(), new Promise<string>((resolve) => { resolveRefresh = resolve; }))
      : Promise.resolve('token-1') };
    fetchMock.mockResolvedValue(jsonResponse({}, 401));
    const pending = apiFetch('/api/projects', { signal: controller.signal }).catch((error) => error);
    await started;
    controller.abort();
    resolveRefresh('token-2');
    expect((await pending).name).toBe('AbortError');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(dispatchEventMock).not.toHaveBeenCalled();
  });

  it('uses the init signal instead of the Request signal when overridden', async () => {
    const requestController = new AbortController();
    const initController = new AbortController();
    const request = new Request('http://localhost:5173/api/projects', { signal: requestController.signal });
    requestController.abort();
    fetchMock.mockResolvedValue(jsonResponse({}, 200));
    await expect(apiFetch(request, { signal: initController.signal })).resolves.toMatchObject({ ok: true });
  });

  it('retries once with the refreshed token and succeeds', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({}, 401))
      .mockResolvedValueOnce(jsonResponse({ ok: true }));

    const res = await apiFetch('/api/projects');

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const secondHeaders = fetchMock.mock.calls[1][1]?.headers as Headers;
    expect(secondHeaders.get('Authorization')).toBe('Bearer token-2');
    expect(res.ok).toBe(true);
  });

  it('throws AuthExpiredError and dispatches the event on a second 401', async () => {
    fetchMock.mockResolvedValue(jsonResponse({}, 401));

    await expect(apiFetch('/api/projects')).rejects.toBeInstanceOf(AuthExpiredError);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(dispatchEventMock).toHaveBeenCalledTimes(1);
    expect(dispatchEventMock.mock.calls[0][0].type).toBe(AUTH_EXPIRED_EVENT);
  });

  it('throws AuthExpiredError when the forced refresh yields no token', async () => {
    mockState.currentUser = authUser('token-1', null);
    fetchMock.mockResolvedValue(jsonResponse({}, 401));

    await expect(apiFetch('/api/projects')).rejects.toBeInstanceOf(AuthExpiredError);
    // No refreshed token -> no pointless second attempt.
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(dispatchEventMock).toHaveBeenCalledTimes(1);
  });
});

describe('onboarding API owner generations', () => {
  const paths = [
    ['sparks', '/api/onboarding/niche-sparks'],
    ['selected spark chat', '/api/onboarding/chat'],
    ['typed chat', '/api/onboarding/chat'],
    ['brand generation', '/api/onboarding/generate-brand'],
  ];
  it.each(paths)('%s never dispatches after A-B-A during token acquisition', async (_label, url) => {
    const token = useWorkspaceStore.getState().changeAccount('A');
    let release!: (value: string) => void;
    const delayed = new Promise<string>((resolve) => { release = resolve; });
    mockState.currentUser = { uid: 'A', getIdToken: () => delayed };
    const pending = apiFetch(url, {}, { uid: 'A', isCurrent: () => isWorkspaceTokenCurrent(useWorkspaceStore.getState(), token) }).catch((error) => error);
    useWorkspaceStore.getState().changeAccount('B');
    useWorkspaceStore.getState().changeAccount('A');
    release('old-token');
    expect((await pending).name).toBe('AbortError');
    expect(fetchMock).not.toHaveBeenCalled();
    expect(dispatchEventMock).not.toHaveBeenCalled();
  });
  it.each(paths)('%s never retries or expires a new A session after a delayed 401 refresh', async (_label, url) => {
    const token = useWorkspaceStore.getState().changeAccount('A');
    let release!: (value: string) => void;
    let signalStarted!: () => void;
    const started = new Promise<void>((resolve) => { signalStarted = resolve; });
    const delayed = new Promise<string>((resolve) => { release = resolve; });
    mockState.currentUser = { uid: 'A', getIdToken: (force) => force ? (signalStarted(), delayed) : Promise.resolve('old-token') };
    fetchMock.mockResolvedValue(jsonResponse({}, 401));
    const pending = apiFetch(url, {}, { uid: 'A', isCurrent: () => isWorkspaceTokenCurrent(useWorkspaceStore.getState(), token) }).catch((error) => error);
    await started;
    useWorkspaceStore.getState().changeAccount('B');
    useWorkspaceStore.getState().changeAccount('A');
    release('old-refresh');
    expect((await pending).name).toBe('AbortError');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(dispatchEventMock).not.toHaveBeenCalled();
  });
});

describe('apiFetch — 429 rate limiting', () => {
  it('throws RateLimitError with the body retryAfter hint', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ error: 'Slow down', retryAfter: 30 }, 429));

    const err = await apiFetch('/api/gemini/generate').catch((e) => e);

    expect(err).toBeInstanceOf(RateLimitError);
    expect(err.retryAfterSeconds).toBe(30);
    expect(err.message).toBe('Slow down');
  });

  it('falls back to the Retry-After header', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({}, 429, { 'Retry-After': '45' }));

    const err = await apiFetch('/api/gemini/generate').catch((e) => e);

    expect(err).toBeInstanceOf(RateLimitError);
    expect(err.retryAfterSeconds).toBe(45);
  });

  it('defaults to 60 seconds when no hint is provided', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({}, 429));

    const err = await apiFetch('/api/gemini/generate').catch((e) => e);

    expect(err).toBeInstanceOf(RateLimitError);
    expect(err.retryAfterSeconds).toBe(60);
  });
});

describe('apiFetch — other errors and auth state', () => {
  it('cancels the auth restoration listener and timeout on abort', async () => {
    mockState.currentUser = null;
    const unsubscribe = vi.fn();
    const clearTimer = vi.spyOn(globalThis, 'clearTimeout');
    let callback!: (user: unknown) => void;
    let listening!: () => void;
    const started = new Promise<void>((resolve) => { listening = resolve; });
    vi.mocked(onAuthStateChanged).mockImplementationOnce(((_auth: unknown, cb: (user: unknown) => void) => {
      callback = cb;
      listening();
      return unsubscribe;
    }) as typeof onAuthStateChanged);
    const controller = new AbortController();
    const result = apiFetch('/api/projects', { signal: controller.signal }).catch((error) => error);
    await started;
    controller.abort();
    expect((await result).name).toBe('AbortError');
    expect(unsubscribe).toHaveBeenCalledTimes(1);
    expect(clearTimer).toHaveBeenCalled();
    callback(null);
    expect(unsubscribe).toHaveBeenCalledTimes(1);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(dispatchEventMock).not.toHaveBeenCalled();
  });

  it('throws a plain error with the server message on other non-OK responses', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ error: 'boom' }, 500));

    const err = await apiFetch('/api/projects').catch((e) => e);

    expect(err).toBeInstanceOf(Error);
    expect(err).not.toBeInstanceOf(AuthExpiredError);
    expect(err).not.toBeInstanceOf(RateLimitError);
    expect(err.message).toBe('boom');
  });

  it('throws "User not authenticated" without calling fetch when signed out', async () => {
    mockState.currentUser = null;

    await expect(apiFetch('/api/projects')).rejects.toThrow('User not authenticated');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
