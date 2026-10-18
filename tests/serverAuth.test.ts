// F4.4 — Server route auth middleware tests (server.ts authenticateUser /
// protectAIRoute), driven through the real Express app on an ephemeral port.
//
// firebase-admin is fully mocked (verifyIdToken is under test control) and the
// server Firestore module is stubbed, so NO request ever touches live Firebase
// or any external network — everything stays on 127.0.0.1.
//
// Route handlers that would call the real Gemini API are never reached: every
// scenario below short-circuits in the middleware (401/400/429) or uses the
// Firestore-backed /api/accounts route with a stubbed listIntegrations.
import { afterEach, beforeAll, afterAll, describe, expect, it, vi } from 'vitest';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';

// --- Hoisted mock state (vi.mock factories are hoisted above these imports) ---
const adminState = vi.hoisted(() => ({
  verifyIdToken: vi.fn(),
  verifySessionCookie: vi.fn(),
  createSessionCookie: vi.fn(),
  revokeRefreshTokens: vi.fn(),
}));

const fsState = vi.hoisted(() => ({
  // ai_quota doc the QuotaLedger reads through its FirestoreQuotaStore.
  quotaDoc: null as Record<string, unknown> | null,
  quotaFail: false,
  listIntegrations: vi.fn(),
}));

vi.mock('firebase-admin', () => ({
  default: {
    apps: [{ name: 'mock-admin-app' }],
    initializeApp: vi.fn(),
    credential: { cert: vi.fn(() => ({ mocked: 'credential' })) },
    auth: () => ({
      verifyIdToken: adminState.verifyIdToken,
      verifySessionCookie: adminState.verifySessionCookie,
      createSessionCookie: adminState.createSessionCookie,
      revokeRefreshTokens: adminState.revokeRefreshTokens,
    }),
    firestore: () => ({}),
  },
}));

vi.mock('../src/server/firestore.ts', () => {
  const fakeFirestore = {
    collection: () => ({
      doc: () => ({
        get: async () => {
          if (fsState.quotaFail) throw new Error('firestore unavailable');
          return fsState.quotaDoc
            ? { exists: true, data: () => fsState.quotaDoc }
            : { exists: false, data: () => null };
        },
      }),
    }),
    runTransaction: async (fn: (tx: unknown) => Promise<void>) =>
      fn({
        get: async () => ({ exists: false, data: () => null }),
        set: () => {},
        update: () => {},
      }),
  };
  return {
    serverFirestore: () => fakeFirestore,
    projectsFirestore: () => fakeFirestore,
    getIntegration: vi.fn(async () => null),
    listIntegrations: fsState.listIntegrations,
    upsertIntegration: vi.fn(async () => ({})),
    updateIntegrationFields: vi.fn(async () => ({})),
    firestorePing: vi.fn(async () => ({ ok: true })),
    INTEGRATIONS_COLLECTION: 'integrations',
  };
});

// --- Boot env BEFORE importing server.ts (fail-fast credential check) ---
// These are obviously-fake test dummies; the production check only verifies
// presence and shape, and no real secret ever appears in this file.
process.env.VERCEL = '1'; // module bottom-guard skips auto startServer/listen
process.env.GEMINI_API_KEY = 'test-only-gemini-key';
process.env.APP_URL = 'http://localhost:3000';
process.env.FIREBASE_SERVICE_ACCOUNT = Buffer.from(
  JSON.stringify({ project_id: 'test-project' }),
).toString('base64');
process.env.TOKEN_ENCRYPTION_KEY = 'a'.repeat(64); // 32-byte hex dummy
process.env.OAUTH_STATE_SECRET = 'test-only-oauth-secret';
process.env.DAILY_AI_BUDGET_TOKENS = '1000';

let server: Server;
let baseUrl: string;
let app: any;

// Tokens shaped "valid.<uid>" resolve; everything else is rejected — mimics
// Firebase ID token verification without Firebase.
adminState.verifyIdToken.mockImplementation(async (token: string) => {
  if (typeof token === 'string' && token.startsWith('valid.')) {
    return { uid: token.slice('valid.'.length), aud: 'test-project', sub: token };
  }
  throw new Error('Firebase ID token could not be decoded');
});

// Session cookies: "valid.session-cookie" resolves (mimics a non-revoked
// Firebase session cookie); anything else — including revoked-looking values —
// is rejected, mirroring verifySessionCookie(..., { checkRevoked: true }).
adminState.verifySessionCookie.mockImplementation(async (cookie: string) => {
  if (cookie === 'valid.session-cookie') {
    return { uid: 'cookie-user', aud: 'test-project', sub: cookie };
  }
  throw new Error('Session cookie has been revoked');
});

// Minting echoes the request so tests can assert what was minted.
adminState.createSessionCookie.mockImplementation(
  async (idToken: string, options: { expiresIn: number }) =>
    `minted.${idToken}.${options.expiresIn}`,
);
adminState.revokeRefreshTokens.mockImplementation(async () => undefined);

async function get(path: string, token?: string): Promise<Response> {
  return fetch(`${baseUrl}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}

async function postJson(path: string, body: unknown, token?: string): Promise<Response> {
  return fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
}

beforeAll(async () => {
  const serverModule = await import('../server.ts');
  app = await serverModule.getApp();
  await new Promise<void>((resolve) => {
    server = app.listen(0, '127.0.0.1', resolve);
  });
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
}, 60_000);

afterAll(async () => {
  if (server) {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    (server as any).closeAllConnections?.();
  }
}, 30_000);

afterEach(() => {
  fsState.quotaDoc = null;
  fsState.quotaFail = false;
  fsState.listIntegrations.mockReset();
  adminState.createSessionCookie.mockClear();
  adminState.revokeRefreshTokens.mockClear();
  adminState.verifySessionCookie.mockClear();
  adminState.revokeRefreshTokens.mockImplementation(async () => undefined);
});

describe('authenticateUser middleware (via GET /api/accounts)', () => {
  it('401s with "Unauthorized" when no Authorization header is sent', async () => {
    const res = await get('/api/accounts');

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'Unauthorized' });
    expect(adminState.verifyIdToken).not.toHaveBeenCalled();
  });

  // F4.7 — every /api response carries a server-generated X-Request-Id so a
  // client-reported error can be matched to exactly one server log line.
  it('stamps a unique X-Request-Id on each /api response', async () => {
    const [a, b] = [await get('/api/accounts'), await get('/api/accounts')];
    const uuidShape = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    expect(a.headers.get('x-request-id')).toMatch(uuidShape);
    expect(b.headers.get('x-request-id')).toMatch(uuidShape);
    expect(a.headers.get('x-request-id')).not.toBe(b.headers.get('x-request-id'));
  });

  it('401s with "Invalid token" when token verification fails', async () => {
    const res = await get('/api/accounts', 'bogus-token');

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'Invalid token' });
    expect(adminState.verifyIdToken).toHaveBeenCalledWith('bogus-token');
  });

  it('passes a valid token through and serves the route with req.user', async () => {
    fsState.listIntegrations.mockResolvedValue([
      {
        platform: 'youtube',
        access_token: null,
        refresh_token: null,
        expiry_date: null,
        profile_data: JSON.stringify({ title: 'Test Channel' }),
        updated_at: new Date().toISOString(),
      },
    ]);

    const res = await get('/api/accounts', 'valid.user-acc');

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([{ platform: 'youtube', profile: { title: 'Test Channel' } }]);
    expect(fsState.listIntegrations).toHaveBeenCalledWith('user-acc');
  });
});

describe('protectAIRoute middleware (AI routes)', () => {
  it('401s with "Authentication required" when the header is missing', async () => {
    const res = await postJson('/api/gemini/generate', { model: 'gemini-3.8-flash' });

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'Authentication required' });
  });

  it('401s with "Invalid authentication token" when verification fails', async () => {
    const res = await postJson('/api/gemini/generate', {}, 'not-a-real-token');

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'Invalid authentication token' });
  });

  it('400s an unsupported Gemini model before the handler runs', async () => {
    const res = await postJson(
      '/api/gemini/generate',
      { model: 'gemini-99-ultra', contents: 'hi' },
      'valid.user-model',
    );

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'Unsupported Gemini model.' });
    expect(res.headers.get('x-ratelimit-limit')).toBe('30');
  });

  it('400s a non-Google video-download URI (SSRF guard)', async () => {
    const res = await postJson(
      '/api/gemini/video-download',
      { uri: 'https://evil.example.com/video.mp4' },
      'valid.user-dl',
    );

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'Invalid video resource URI.' });
  });

  it('429s when the daily quota ledger reports the user over budget', async () => {
    fsState.quotaDoc = {
      uid: 'user-quota',
      day: new Date().toISOString().slice(0, 10),
      usedToday: 9999,
      routes: {},
      updated_at: new Date().toISOString(),
    };

    const res = await postJson(
      '/api/gemini/generate',
      { model: 'gemini-3.8-flash', contents: 'hi' },
      'valid.user-quota',
    );

    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.error).toContain('Daily AI quota exhausted');
    expect(body.retryAfterSeconds).toBeGreaterThan(0);
    expect(res.headers.get('x-quota-limit')).toBe('1000');
    expect(res.headers.get('x-quota-used')).toBe('9999');
    expect(res.headers.get('retry-after')).toBe(String(body.retryAfterSeconds));
  });

  it('429s fail-closed with a reason when the quota store is unavailable', async () => {
    fsState.quotaFail = true;

    const res = await postJson(
      '/api/gemini/generate',
      { model: 'gemini-3.8-flash', contents: 'hi' },
      'valid.user-failclosed',
    );

    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.reason).toBe('quota_store_unavailable');
    expect(res.headers.get('x-quota-used')).toBe('unknown');
  });
});

// ---------------------------------------------------------------------------
// Phase A — session-cookie hardening: POST /api/auth/session (exchange),
// authenticateUser accepting creatoros_session, POST /api/auth/revoke-all.
// Same pattern as above: real Express app, fully mocked firebase-admin.
// ---------------------------------------------------------------------------

async function getWithCookie(path: string, cookie: string): Promise<Response> {
  return fetch(`${baseUrl}${path}`, { headers: { Cookie: cookie } });
}

describe('POST /api/auth/session (session-cookie exchange)', () => {
  it('401s with "Unauthorized" when no Bearer token is sent', async () => {
    const res = await postJson('/api/auth/session', {});

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'Unauthorized' });
    expect(adminState.verifyIdToken).not.toHaveBeenCalled();
    expect(adminState.createSessionCookie).not.toHaveBeenCalled();
  });

  it('401s with "Invalid token" when verification fails and never mints', async () => {
    const res = await postJson('/api/auth/session', {}, 'bogus-token');

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'Invalid token' });
    expect(adminState.verifyIdToken).toHaveBeenCalledWith('bogus-token');
    expect(adminState.createSessionCookie).not.toHaveBeenCalled();
  });

  it('mints a 14-day HttpOnly Secure SameSite=Lax cookie from a valid ID token', async () => {
    const res = await postJson('/api/auth/session', {}, 'valid.session-user');

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, expiresIn: 14 * 24 * 60 * 60 });
    expect(adminState.createSessionCookie).toHaveBeenCalledWith('valid.session-user', {
      expiresIn: 14 * 24 * 60 * 60 * 1000,
    });
    const setCookie = res.headers.get('set-cookie') || '';
    expect(setCookie).toContain(
      `creatoros_session=minted.valid.session-user.${14 * 24 * 60 * 60 * 1000}`,
    );
    expect(setCookie).toContain('HttpOnly');
    expect(setCookie).toContain('Secure');
    expect(setCookie).toContain('SameSite=Lax');
    expect(setCookie).toContain(`Max-Age=${14 * 24 * 60 * 60}`);
    expect(setCookie).toContain('Path=/');
  });
});

describe('authenticateUser with the session cookie', () => {
  it('serves the route from a valid creatoros_session cookie (revocation-checked)', async () => {
    fsState.listIntegrations.mockResolvedValue([]);

    const res = await getWithCookie('/api/accounts', 'creatoros_session=valid.session-cookie');

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
    expect(adminState.verifySessionCookie).toHaveBeenCalledWith('valid.session-cookie', true);
    expect(adminState.verifyIdToken).not.toHaveBeenCalled();
    expect(fsState.listIntegrations).toHaveBeenCalledWith('cookie-user');
  });

  it('401s with "Invalid token" when the cookie fails verification (e.g. revoked)', async () => {
    const res = await getWithCookie('/api/accounts', 'creatoros_session=revoked-or-garbage');

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'Invalid token' });
    expect(adminState.revokeRefreshTokens).not.toHaveBeenCalled();
  });
});

describe('POST /api/auth/revoke-all', () => {
  it('401s unauthenticated and never revokes', async () => {
    const res = await postJson('/api/auth/revoke-all', {});

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'Unauthorized' });
    expect(adminState.revokeRefreshTokens).not.toHaveBeenCalled();
  });

  it('401s with "Invalid token" for a bad Bearer token and never revokes', async () => {
    const res = await postJson('/api/auth/revoke-all', {}, 'not-a-real-token');

    expect(res.status).toBe(401);
    expect(adminState.revokeRefreshTokens).not.toHaveBeenCalled();
  });

  it('revokes refresh tokens and clears the session cookie for an authenticated user', async () => {
    const res = await postJson('/api/auth/revoke-all', {}, 'valid.user-revoke');

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(adminState.revokeRefreshTokens).toHaveBeenCalledWith('user-revoke');
    const setCookie = res.headers.get('set-cookie') || '';
    expect(setCookie).toContain('creatoros_session=');
    expect(setCookie).toContain('Expires=Thu, 01 Jan 1970 00:00:00 GMT');
  });

  it('500s when revocation fails, without clearing the cookie silently', async () => {
    adminState.revokeRefreshTokens.mockImplementation(async () => {
      throw new Error('backend unavailable');
    });

    const res = await postJson('/api/auth/revoke-all', {}, 'valid.user-revoke-fail');

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'Could not revoke sessions. Please try again.' });
    expect(adminState.revokeRefreshTokens).toHaveBeenCalledWith('user-revoke-fail');
  });
});
