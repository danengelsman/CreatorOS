import { createFileRoute } from '@tanstack/react-router';
import ContentRepurposer from '@/components/ContentRepurposer';
import LayoutShell from '@/components/LayoutShell';
import { useAuth } from '@/contexts/AuthContext';

export const Route = createFileRoute('/_auth/repurpose')({
  component: () => {
    const auth = useAuth();

    return (
      <LayoutShell user={auth.user}>
        <ContentRepurposer />
      </LayoutShell>
    );
  },
});
