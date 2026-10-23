import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router';
import Login from '@/components/Login';

export const Route = createFileRoute('/login')({
  beforeLoad: ({ context }: { context: any }) => {
    if (context?.auth?.isAuthenticated) {
      throw redirect({ to: '/dashboard' });
    }
  },
  component: () => {
    const navigate = useNavigate();
    return (
      <Login
        navigate={(path: string) =>
          navigate({ to: (path === '/_auth/dashboard' ? '/dashboard' : path) as any })
        }
      />
    );
  },
});
