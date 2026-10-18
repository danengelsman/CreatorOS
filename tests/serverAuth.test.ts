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
    auth: () => ({ verifyIdToken: adminState.verifyIdToken }),
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
});

describe('authenticateUser middleware (via GET /api/accounts)', () => {
  it('401s with "Unauthorized" when no Authorization header is sent', async () => {
    const res = await get('/api/accounts');

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'Unauthorized' });
    expect(adminState.verifyIdToken).not.toHaveBeenCalled();
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
