import { afterEach, describe, expect, it, vi } from 'vitest';
import { deleteApp, initializeApp } from 'firebase/app';

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

// Real Firebase Auth state machine, with only its HTTP transport faked. No network.
describe('Firebase SDK sign-out scope', () => {
  afterEach(() => vi.unstubAllGlobals());
  it('can clear B if A signOut is already waiting in auth middleware', async () => {
    const requests: string[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: string, init: RequestInit) => {
        const url = String(input);
        requests.push(url);
        const body = JSON.parse(String(init.body));
        if (url.includes('accounts:signInWithPassword')) {
          const uid = body.email.startsWith('a') ? 'A' : 'B';
          return new Response(
            JSON.stringify({
              localId: uid,
              idToken: `${uid}-token`,
              refreshToken: `${uid}-refresh`,
              expiresIn: '3600',
            }),
            { status: 200 },
          );
        }
        if (url.includes('accounts:lookup')) {
          const uid = String(body.idToken).startsWith('A') ? 'A' : 'B';
          return new Response(
            JSON.stringify({
              users: [
                { localId: uid, email: `${uid.toLowerCase()}@example.test`, passwordHash: 'hash' },
              ],
            }),
            { status: 200 },
          );
        }
        throw new Error(`Unexpected network request: ${url}`);
      }),
    );
    // Firebase's Node build captures fetch at module initialization.
    const {
      beforeAuthStateChanged,
      inMemoryPersistence,
      initializeAuth,
      signInWithEmailAndPassword,
      signOut,
    } = await import('firebase/auth');
    const app = initializeApp({ apiKey: 'test', projectId: 'demo-test' }, 'signout-race');
    const auth = initializeAuth(app, { persistence: inMemoryPersistence });
    const entered = deferred();
    const release = deferred();
    try {
      await signInWithEmailAndPassword(auth, 'a@example.test', 'not-a-real-password');
      const unsubscribe = beforeAuthStateChanged(auth, async (next) => {
        if (next === null) {
          entered.resolve();
          await release.promise;
        }
      });
      const pending = signOut(auth);
      await entered.promise;
      await signInWithEmailAndPassword(auth, 'b@example.test', 'not-a-real-password');
      expect(auth.currentUser?.uid).toBe('B');
      release.resolve();
      await pending;
      expect(auth.currentUser).toBeNull();
      expect(requests).toHaveLength(4);
      unsubscribe();
    } finally {
      release.resolve();
      await deleteApp(app);
    }
  });
});
