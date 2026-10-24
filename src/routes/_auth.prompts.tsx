import { createFileRoute } from '@tanstack/react-router';
import PerfectPromptCopilot from '@/components/PerfectPromptCopilot';
import LayoutShell from '@/components/LayoutShell';
import { useAuth } from '@/contexts/AuthContext';

export const Route = createFileRoute('/_auth/prompts')({
  component: () => {
    const auth = useAuth();

    return (
      <LayoutShell user={auth.user}>
        <PerfectPromptCopilot user={auth.user} />
      </LayoutShell>
    );
  },
});
