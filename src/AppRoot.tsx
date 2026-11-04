import React, { useEffect } from 'react';
import { RouterProvider } from '@tanstack/react-router';
import { router } from './router';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoadingScreen from './components/LoadingScreen';
import Onboarding from './components/Onboarding';
import VerificationBanner from './components/VerificationBanner';
import SessionExpired from './components/SessionExpired';
import { ensureFirstDollarJourney } from './services/firstDollarJourney';
import { db, serverTimestamp } from '@/firebase';
import { doc, runTransaction } from 'firebase/firestore';
import { isWorkspaceTokenCurrent, useWorkspaceStore } from '@/store/workspaceStore';
import {
  ONBOARDING_IN_PROGRESS,
  OnboardingConflictError,
  type OnboardingAnswers,
  type OnboardingBrandKit,
} from '@/lib/onboardingState';

function RouterWrapper() {
  const auth = useAuth();
  const showOnboarding = auth.showOnboarding;
  // Capture the generation from this render, not the mutable current account.
  const token = auth.workspaceToken;
  const uid = auth.user?.uid;
  const isCurrent = () =>
    !!uid && token?.uid === uid && isWorkspaceTokenCurrent(useWorkspaceStore.getState(), token);

  // Signed-out transition: pre-router, App.tsx swapped the tree inline to the
  // login view when onAuthStateChanged fired with null. The router's _auth
  // guard only runs on navigation, so a mid-session sign-out (e.g. "Sign out
  // of all devices" from Profile) must navigate explicitly to leave guarded
  // routes. Only reacts to user→null transitions, never the initial null.
  const hadUser = React.useRef(false);
  useEffect(() => {
    if (auth.user) {
      hadUser.current = true;
      return;
    }
    if (hadUser.current && !auth.isAuthLoading && !auth.authError) {
      hadUser.current = false;
      router.navigate({ to: '/login' });
    }
  }, [auth.user, auth.isAuthLoading, auth.authError]);

  // Invalidate router context so route guards re-evaluate whenever auth finishes loading or updates
  useEffect(() => {
    if (!auth.isAuthLoading && !auth.authError) {
      router.invalidate();
    }
  }, [auth.user, auth.isAuthLoading, auth.authError]);

  // Do not turn an unscoped API event into Firebase signOut or navigation.
  // Either can affect a different account after the initiating request ends.

  // Check the render's generation before dispatch and on every transaction retry.
  useEffect(() => {
    if (!uid || auth.isAuthLoading || auth.authError || showOnboarding || !isCurrent()) return;
    let active = true;
    ensureFirstDollarJourney(uid, () => active && isCurrent()).catch((err) => {
      if (active && isCurrent()) console.error('Failed to ensure first dollar journey:', err);
    });
    return () => {
      active = false;
    };
  }, [uid, token, auth.isAuthLoading, auth.authError, showOnboarding]);

  if (auth.isAuthLoading) {
    return <LoadingScreen />;
  }

  if (auth.authError) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <div role="alert" className="max-w-md text-center">
          <h1 className="text-xl font-semibold">Unable to load your account</h1>
          <p className="mt-2">
            Check your connection and try again. If the account loads, this screen will close
            automatically.
          </p>
          <button
            className="mt-4 rounded bg-black px-4 py-2 text-white"
            onClick={() => window.location.reload()}
          >
            Retry
          </button>
        </div>
      </main>
    );
  }

  // If showOnboarding is true, render the onboarding flow. The verification
  // nudge rides along here because the router (and LayoutShell) is not mounted
  // during onboarding — matches the pre-router App.tsx behavior where the
  // banner was visible behind the onboarding modal.
  if (showOnboarding && auth.user) {
    const handleOnboardingComplete = async (
      answers?: OnboardingAnswers,
      kit?: OnboardingBrandKit,
    ) => {
      if (!isCurrent()) return;
      if (
        answers &&
        Object.values(answers).some((value) => typeof value !== 'string' || value.length > 1000)
      ) {
        throw new Error('Profile fields must be at most 1000 characters.');
      }
      await ensureFirstDollarJourney(auth.user.uid, isCurrent);
      if (!isCurrent()) return;
      const userRef = doc(db, 'users', auth.user.uid);
      const brandRef = doc(db, 'projects', `brand_${auth.user.uid}`);
      await runTransaction(db, async (transaction) => {
        const assertCurrent = () => {
          if (!isCurrent()) throw new Error('Account changed');
        };
        // Firestore can invoke this callback again after an account change.
        assertCurrent();
        const snapshot = await transaction.get(userRef);
        assertCurrent();
        const brandSnapshot = kit ? await transaction.get(brandRef) : null;
        assertCurrent();
        if (!snapshot.exists()) throw new Error('Account profile no longer exists');
        const previous = snapshot.data().onboardingAnswers;
        const inProgress =
          previous?.summary === ONBOARDING_IN_PROGRESS && Object.keys(previous).length === 1;
        const existing = inProgress ? {} : (previous ?? {});
        const keys = ['niche', 'audience', 'vibe', 'summary'] as const;
        const hasExistingAnswers = keys.some((key) => !!existing[key]);
        const conflict =
          hasExistingAnswers &&
          !!answers &&
          (['niche', 'audience', 'vibe'] as const).some(
            (key) => (existing[key] || '') !== answers[key],
          );
        if (conflict || (kit && existing.summary && existing.summary !== answers?.summary)) {
          throw new OnboardingConflictError(
            'Your profile was completed in another tab. Continue to Today to use that profile.',
          );
        }
        // Only an empty skip can be followed by an independent interview. Never
        // fill gaps in an existing interview from a different tab.
        const merged = inProgress
          ? answers
            ? { ...answers }
            : {}
          : !hasExistingAnswers
            ? { ...existing, ...answers }
            : { ...existing };
        if (kit && !conflict && answers && !merged.summary) merged.summary = answers.summary;
        if (kit) {
          const brand = brandSnapshot?.exists() ? brandSnapshot.data() : null;
          if (brand && (brand.userId !== auth.user.uid || brand.status === 'completed')) {
            throw new OnboardingConflictError(
              'A brand kit was already completed in another tab. Continue to Today to use it.',
            );
          }
          transaction.set(
            brandRef,
            {
              userId: auth.user.uid,
              name: kit.name || 'Untitled Brand',
              type: 'brand_kit',
              status: 'completed',
              data: kit,
              ...(!brand ? { createdAt: serverTimestamp() } : {}),
              updatedAt: serverTimestamp(),
            },
            {
              mergeFields: [
                'userId',
                'name',
                'type',
                'status',
                'data',
                ...(!brand ? ['createdAt'] : []),
                'updatedAt',
              ],
            },
          );
        }
        transaction.set(
          userRef,
          { onboardingAnswers: inProgress && !answers ? {} : merged, updatedAt: serverTimestamp() },
          { mergeFields: ['onboardingAnswers', 'updatedAt'] },
        );
      });
      if (isCurrent()) auth.setShowOnboarding(false);
    };

    return (
      <>
        <Onboarding
          key={token?.generation}
          onComplete={handleOnboardingComplete}
          isCurrent={isCurrent}
          user={auth.user}
        />
        <VerificationBanner user={auth.user} />
      </>
    );
  }

  // Otherwise, render the router
  return (
    <RouterProvider
      router={router}
      context={{ auth: { user: auth.user, isAuthenticated: !!auth.user } }}
    />
  );
}

export default function AppRoot() {
  return (
    <AuthProvider>
      <SessionExpired />
      <RouterWrapper />
    </AuthProvider>
  );
}
