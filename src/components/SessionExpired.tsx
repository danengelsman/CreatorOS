import React, { useEffect, useState } from 'react';
import {
  EmailAuthProvider,
  GoogleAuthProvider,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
} from 'firebase/auth';
import { auth } from '../firebase';
import { AUTH_EXPIRED_EVENT } from '../lib/apiClient';
import {
  isWorkspaceTokenCurrent,
  useWorkspaceStore,
  type WorkspaceToken,
} from '../store/ownedWorkspaceStore';

/** Recovery belongs to the account which made the failed request, never the next account. */
export default function SessionExpired() {
  const [expired, setExpired] = useState<WorkspaceToken | null>(null);
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const uid = useWorkspaceStore((s) => s.uid);
  const generation = useWorkspaceStore((s) => s.generation);
  const current =
    !!expired &&
    expired.uid === uid &&
    expired.generation === generation &&
    auth.currentUser?.uid === uid;

  useEffect(() => {
    const onExpired = (event: Event) => {
      const token = (event as CustomEvent<WorkspaceToken>).detail;
      if (
        !token ||
        !isWorkspaceTokenCurrent(useWorkspaceStore.getState(), token) ||
        auth.currentUser?.uid !== token.uid
      )
        return;
      setPassword('');
      setError('');
      setExpired(token);
    };
    window.addEventListener(AUTH_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, onExpired);
  }, []);

  useEffect(() => {
    setPassword('');
    setError('');
    setBusy(false);
  }, [uid, generation]);

  if (!current || !expired) return null;
  const reauthenticate = async (provider: 'password' | 'google') => {
    const user = auth.currentUser;
    const token = expired;
    const isCurrent = () =>
      auth.currentUser === user && isWorkspaceTokenCurrent(useWorkspaceStore.getState(), token);
    if (!user || !isCurrent() || busy) return;
    setBusy(true);
    setError('');
    try {
      if (provider === 'password') {
        if (!user.email || !password) {
          setError('Enter your password to continue.');
          return;
        }
        await reauthenticateWithCredential(
          user,
          EmailAuthProvider.credential(user.email, password),
        );
      } else {
        await reauthenticateWithPopup(user, new GoogleAuthProvider());
      }
      if (isCurrent()) {
        setPassword('');
        setExpired(null);
      }
    } catch {
      if (isCurrent())
        setError('Sign-in could not be completed. Check your credentials and try again.');
    } finally {
      if (isCurrent()) setBusy(false);
    }
  };
  const user = auth.currentUser;
  const providers = user?.providerData.map((p) => p.providerId) ?? [];
  return (
    <aside
      role="alert"
      aria-label="Session expired"
      className="fixed inset-x-4 bottom-4 z-[9999] mx-auto max-w-lg rounded-xl border border-amber-400 bg-white p-5 text-slate-900 shadow-xl"
    >
      <h2 className="text-lg font-semibold">Your session expired</h2>
      <p className="mt-1 text-sm">
        Sign in again as {user?.email || 'this account'} to continue. Your current work will stay
        open.
      </p>
      {providers.includes('password') && (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void reauthenticate('password');
          }}
          className="mt-3 flex flex-wrap gap-2"
        >
          <label className="w-full text-sm" htmlFor="session-password">
            Password
          </label>
          <input
            id="session-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="min-w-0 flex-1 rounded border border-slate-400 px-3 py-2"
          />
          <button
            disabled={busy}
            type="submit"
            className="rounded bg-slate-900 px-4 py-2 text-white focus-visible:outline focus-visible:outline-2"
          >
            Sign in again
          </button>
        </form>
      )}
      {providers.includes('google.com') && (
        <button
          disabled={busy}
          type="button"
          onClick={() => void reauthenticate('google')}
          className="mt-3 rounded border border-slate-500 px-4 py-2 focus-visible:outline focus-visible:outline-2"
        >
          Sign in again with Google
        </button>
      )}
      {!providers.includes('password') && !providers.includes('google.com') && (
        <p className="mt-3 text-sm">Use your account's sign-in method to sign in again.</p>
      )}
      {error && (
        <p role="status" className="mt-2 text-sm text-red-700">
          {error}
        </p>
      )}
      {busy && (
        <p role="status" className="mt-2 text-sm">
          Signing in… Do not switch accounts until this finishes. Firebase may affect a later
          session if an operation is already in progress.
        </p>
      )}
    </aside>
  );
}
