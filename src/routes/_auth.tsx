import { createFileRoute, redirect } from '@tanstack/react-router';
import { clearAuthReturnIfReached, rememberAuthReturn } from '@/lib/authReturn';

export const Route = createFileRoute('/_auth')({
  beforeLoad: ({ context, location }: { context: any; location: { href: string } }) => {
    if (!context?.auth?.isAuthenticated) {
      rememberAuthReturn(location.href);
      throw redirect({
        to: '/login',
      });
    }
    clearAuthReturnIfReached(location.href);
  },
});
