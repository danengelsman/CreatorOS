import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/_auth')({
  beforeLoad: ({ context }: { context: any }) => {
    if (!context?.auth?.isAuthenticated) {
      throw redirect({
        to: '/login',
      });
    }
  },
});
