import { createFileRoute, useNavigate } from '@tanstack/react-router';
import Community from '@/components/Community';
import LayoutShell from '@/components/LayoutShell';
import { useAuth } from '@/contexts/AuthContext';

export const Route = createFileRoute('/_auth/community')({
  component: () => {
    const auth = useAuth();
    const navigate = useNavigate();

    return (
      <LayoutShell user={auth.user}>
        <Community
          user={auth.user}
          userData={auth.userData}
          setActiveTab={(tab) => navigate({ to: `/_auth/${tab}` as any })}
        />
      </LayoutShell>
    );
  },
});
