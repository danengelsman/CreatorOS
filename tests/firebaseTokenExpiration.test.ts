// Offline regression probe: install the transport stub before importing Firebase Auth,
// whose Node build captures fetch during module initialization.
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
  vi.doUnmock('../src/firebase');
});

describe('installed Firebase token refresh', () => {
  it('shows whether an expired refresh signs out before apiFetch receives the error', async () => {
    const jwt = (payload: object) =>
      `header.${Buffer.from(JSON.stringify(payload)).toString('base64url')}.signature`;
    const token = jwt({
      sub: 'owner-A',
      user_id: 'owner-A',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    });
    const calls: string[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        calls.push(url);
        if (url.includes('accounts:signInWithCustomToken'))
          return new Response(
            JSON.stringify({
              localId: 'owner-A',
              idToken: token,
              refreshToken: 'refresh',
              expiresIn: '3600',
            }),
            { status: 200 },
          );
        if (url.includes('accounts:lookup'))
          return new Response(
            JSON.stringify({
              users: [{ localId: 'owner-A', email: 'owner@example.test', providerUserInfo: [] }],
            }),
            { status: 200 },
          );
        if (url.includes('/token?'))
          return new Response(JSON.stringify({ error: { code: 400, message: 'TOKEN_EXPIRED' } }), {
            status: 400,
          });
        if (url.endsWith('/api/test') || url === '/api/test')
          return new Response('{}', { status: 401 });
        throw new Error(`Unexpected offline request: ${url}`);
      }),
    );
    vi.stubGlobal('window', {
      location: { origin: 'https://test.invalid' },
      dispatchEvent: vi.fn(),
    });
    const { initializeApp, deleteApp } = await import('firebase/app');
    const sdk = await import('firebase/auth');
    const app = initializeApp(
      { apiKey: 'test-api-key', authDomain: 'test.invalid', projectId: 'demo-offline' },
      `expiration-${Date.now()}`,
    );
    const auth = sdk.initializeAuth(app, { persistence: sdk.inMemoryPersistence });
    await sdk.signInWithCustomToken(auth, 'test-custom-token');
    const { useWorkspaceStore } = await import('../src/store/ownedWorkspaceStore');
    useWorkspaceStore.getState().changeAccount('owner-A');
    vi.doMock('../src/firebase', () => ({ auth, onAuthStateChanged: sdk.onAuthStateChanged }));
    const { apiFetch } = await import('../src/lib/apiClient');
    let caught: unknown;
    try {
      await apiFetch('/api/test');
    } catch (error) {
      caught = error;
    }
    expect(auth.currentUser).toBeNull();
    expect(calls.some((url) => url.includes('/token?'))).toBe(true);
    // Documents the unfixed regression, not a successful recovery: the SDK has
    // already changed currentUser before the API owner guard sees the error.
    expect(caught).toMatchObject({ name: 'AbortError' });
    expect(window.dispatchEvent).not.toHaveBeenCalled();
    await deleteApp(app);
  });
});
