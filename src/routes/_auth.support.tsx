import { createFileRoute } from '@tanstack/react-router';
import SupportHub from '@/components/SupportHub';
import LayoutShell from '@/components/LayoutShell';
import { useAuth } from '@/contexts/AuthContext';

export const Route = createFileRoute('/_auth/support')({
  component: () => {
    const auth = useAuth();

    return (
      <LayoutShell user={auth.user}>
        <SupportHub user={auth.user} />
      </LayoutShell>
    );
  },
});
