import { createFileRoute, redirect } from '@tanstack/react-router';

// The community now lives as the primary tab of the Creator Hub.
export const Route = createFileRoute('/_auth/community')({
  beforeLoad: () => {
    throw redirect({ to: '/hub' });
  },
});
