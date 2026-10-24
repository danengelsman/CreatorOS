import React, { useEffect } from 'react';
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router';
import Login from '@/components/Login';
import { useAuth } from '@/contexts/AuthContext';

export const Route = createFileRoute('/login')({
  beforeLoad: ({ context }: { context: any }) => {
    if (context?.auth?.isAuthenticated) {
      throw redirect({ to: '/dashboard' });
    }
  },
  component: LoginComponent,
});

function LoginComponent() {
  const auth = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (auth.user && !auth.isAuthLoading) {
      navigate({ to: '/dashboard' });
    }
  }, [auth.user, auth.isAuthLoading, navigate]);

  return (
    <Login
      navigate={(path: string) =>
        navigate({ to: (path === '/_auth/dashboard' ? '/dashboard' : path) as any })
      }
    />
  );
}
