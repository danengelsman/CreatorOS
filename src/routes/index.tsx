import React, { useEffect } from 'react';
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router';
import LandingPage from '@/components/LandingPage';
import { useAuth } from '@/contexts/AuthContext';

export const Route = createFileRoute('/')({
  beforeLoad: ({ context }: { context: any }) => {
    if (context?.auth?.isAuthenticated) {
      throw redirect({ to: '/dashboard' });
    }
  },
  component: IndexComponent,
});

function IndexComponent() {
  const auth = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (auth.user && !auth.isAuthLoading) {
      navigate({ to: '/dashboard' });
    }
  }, [auth.user, auth.isAuthLoading, navigate]);

  return <LandingPage navigate={(path: string) => navigate({ to: path as any })} />;
}
