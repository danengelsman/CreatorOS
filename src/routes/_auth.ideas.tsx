import { createFileRoute, redirect } from '@tanstack/react-router';

// Ideas now live inside the Studio New Project flow instead of a standalone page.
export const Route = createFileRoute('/_auth/ideas')({
  beforeLoad: () => {
    throw redirect({ to: '/studio' });
  },
});
