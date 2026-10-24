import { createFileRoute, useNavigate } from '@tanstack/react-router';
import HelpCenter from '@/components/HelpCenter';
import LayoutShell from '@/components/LayoutShell';
import { useAuth } from '@/contexts/AuthContext';

export const Route = createFileRoute('/_auth/help')({
  component: () => {
    const auth = useAuth();
    const navigate = useNavigate();

    return (
      <LayoutShell user={auth.user}>
        <HelpCenter user={auth.user} navigate={(path: string) => navigate({ to: path as any })} />
      </LayoutShell>
    );
  },
});
