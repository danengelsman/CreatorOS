import React, { useState, useEffect } from 'react';
import { RouterProvider } from '@tanstack/react-router';
import { router } from './router';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoadingScreen from './components/LoadingScreen';
import Onboarding from './components/Onboarding';
import VerificationBanner from './components/VerificationBanner';
import { ensureFirstDollarJourney } from './services/firstDollarJourney';
import { logout } from '@/firebase';

function RouterWrapper() {
  const auth = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(false);

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
    if (hadUser.current && !auth.isAuthLoading) {
      hadUser.current = false;
      router.navigate({ to: '/login' });
    }
  }, [auth.user, auth.isAuthLoading]);

  // Invalidate router context so route guards re-evaluate whenever auth finishes loading or updates
  useEffect(() => {
    if (!auth.isAuthLoading) {
      router.invalidate();
    }
  }, [auth.user, auth.isAuthLoading]);

  // Handle auth expired event
  useEffect(() => {
    const handleAuthExpired = () => {
      console.warn('Session expired — signing out.');
      logout()
        .catch((err) => console.error('Forced sign-out failed:', err))
        .finally(() => {
          // Navigate to login page
          window.location.href = '/login';
        });
    };
    window.addEventListener('creatoros:auth-expired', handleAuthExpired);
    return () => window.removeEventListener('creatoros:auth-expired', handleAuthExpired);
  }, []);

  // Sync showOnboarding from auth context
  useEffect(() => {
    setShowOnboarding(auth.showOnboarding);
  }, [auth.showOnboarding]);

  // Ensure first dollar journey when user is authenticated and not showing onboarding
  useEffect(() => {
    if (auth.user && !auth.isAuthLoading && !showOnboarding) {
      // Call ensureFirstDollarJourney to make sure the journey exists
      ensureFirstDollarJourney(auth.user.uid).catch((err) => {
        console.error('Failed to ensure first dollar journey:', err);
      });
    }
  }, [auth.user, showOnboarding]);

  if (auth.isAuthLoading) {
    return <LoadingScreen />;
  }

  // If showOnboarding is true, render the onboarding flow. The verification
  // nudge rides along here because the router (and LayoutShell) is not mounted
  // during onboarding — matches the pre-router App.tsx behavior where the
  // banner was visible behind the onboarding modal.
  if (showOnboarding) {
    const handleOnboardingComplete = async () => {
      if (!auth.user) return;
      await ensureFirstDollarJourney(auth.user.uid);
      auth.setShowOnboarding(false);
      setShowOnboarding(false);
    };

    return (
      <>
        <Onboarding onComplete={handleOnboardingComplete} user={auth.user} />
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
      <RouterWrapper />
    </AuthProvider>
  );
}
