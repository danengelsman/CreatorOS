import { createFileRoute, redirect } from '@tanstack/react-router';

// Old links retain their tool intent after the user chooses a project.
export const Route = createFileRoute('/_auth/retention')({
  beforeLoad: () => {
    throw redirect({ to: '/studio', search: { inspector: 'retention' } });
  },
});
