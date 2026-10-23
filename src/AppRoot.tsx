import React, { useState, useEffect } from 'react';
import { RouterProvider } from '@tanstack/react-router';
import { router } from './router';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoadingScreen from './components/LoadingScreen';
import Onboarding from './components/Onboarding';
import { ensureFirstDollarJourney } from './services/firstDollarJourney';
import { logout } from '@/firebase';

function RouterWrapper() {
  const auth = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(false);

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

  // If showOnboarding is true, render the onboarding flow
  if (showOnboarding) {
    const handleOnboardingComplete = async () => {
      if (!auth.user) return;
      await ensureFirstDollarJourney(auth.user.uid);
      setShowOnboarding(false);
    };

    return <Onboarding onComplete={handleOnboardingComplete} user={auth.user} />;
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
