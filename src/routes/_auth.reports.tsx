import { createFileRoute } from '@tanstack/react-router';
import Reports from '@/components/Reports';
import LayoutShell from '@/components/LayoutShell';
import { useAuth } from '@/contexts/AuthContext';

export const Route = createFileRoute('/_auth/reports')({
  component: () => {
    const auth = useAuth();

    return (
      <LayoutShell user={auth.user}>
        <Reports user={auth.user} />
      </LayoutShell>
    );
  },
});
