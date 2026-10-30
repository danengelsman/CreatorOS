import { createFileRoute, redirect } from '@tanstack/react-router';

// Old links retain their tool intent after the user chooses a project.
export const Route = createFileRoute('/_auth/repurpose')({
  beforeLoad: () => {
    throw redirect({ to: '/studio', search: { inspector: 'repurpose' } });
  },
});
