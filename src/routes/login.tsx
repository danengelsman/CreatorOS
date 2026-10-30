import React, { useEffect } from 'react';
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router';
import Login from '@/components/Login';
import { useAuth } from '@/contexts/AuthContext';
import { pendingAuthReturn } from '@/lib/authReturn';

export const Route = createFileRoute('/login')({
  beforeLoad: ({ context }: { context: any }) => {
    if (context?.auth?.isAuthenticated) {
      throw redirect({ href: pendingAuthReturn() || '/dashboard' });
    }
  },
  component: LoginComponent,
});

function LoginComponent() {
  const auth = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (auth.user && !auth.isAuthLoading) {
      navigate({ href: pendingAuthReturn() || '/dashboard' });
    }
  }, [auth.user, auth.isAuthLoading, navigate]);

  return (
    <Login
      navigate={(path: string) => {
        const target = path === '/_auth/dashboard' || path === '/dashboard'
          ? pendingAuthReturn() || '/dashboard'
          : path;
        void navigate({ href: target });
      }}
    />
  );
}
