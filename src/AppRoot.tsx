
import React from 'react';
import { RouterProvider } from '@tanstack/react-router';
import { router } from './router';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoadingScreen from './components/LoadingScreen';

function RouterWrapper() {
  const auth = useAuth();
  
  if (auth.isAuthLoading) {
    return <LoadingScreen />;
  }

  return <RouterProvider router={router} context={{ auth: { user: auth.user, isAuthenticated: !!auth.user } }} />;
}

export default function AppRoot() {
  return (
    <AuthProvider>
      <RouterWrapper />
    </AuthProvider>
  );
}
