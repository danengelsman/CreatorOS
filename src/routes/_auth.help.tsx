import { createFileRoute } from '@tanstack/react-router';
import HelpCenter from '@/components/HelpCenter';
import LayoutShell from '@/components/LayoutShell';
import { useAuth } from '@/contexts/AuthContext';

export const Route = createFileRoute('/_auth/help')({
  component: () => {
    const auth = useAuth();

    return (
      <LayoutShell user={auth.user}>
        <HelpCenter user={auth.user} />
      </LayoutShell>
    );
  },
});
