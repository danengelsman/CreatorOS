import React from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import Login from '@/components/Login';

export const Route = createFileRoute('/reset-password')({
  component: ResetPasswordComponent,
});

function ResetPasswordComponent() {
  const navigate = useNavigate();

  return (
    <Login
      initialView="new-password"
      navigate={(path: string) =>
        navigate({ to: (path === '/_auth/dashboard' ? '/dashboard' : path) as any })
      }
    />
  );
}
