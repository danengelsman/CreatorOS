import { createFileRoute, redirect } from '@tanstack/react-router';

// Preserve old bookmarks while opening the assistant in the Studio context.
export const Route = createFileRoute('/_auth/prompts')({
  beforeLoad: () => {
    throw redirect({ to: '/studio', search: { assistant: 'copilot' } });
  },
});
