import { createFileRoute, redirect } from '@tanstack/react-router';

// Existing bookmarks and creation entry points now land in the project pipeline.
export const Route = createFileRoute('/_auth/create')({
  beforeLoad: () => {
    throw redirect({ to: '/studio' });
  },
});
