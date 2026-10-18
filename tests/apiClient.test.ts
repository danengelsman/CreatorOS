// F4.4 — Unified API client contract tests (src/lib/apiClient.ts).
// global fetch is mocked; Firebase auth is mocked at the module boundary.
// No real Firebase, no network.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AUTH_EXPIRED_EVENT,
  AuthExpiredError,
  RateLimitError,
  apiFetch,
} from '../src/lib/apiClient';

type MockUser = { getIdToken: (force?: boolean) => Promise<string | null> };

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
