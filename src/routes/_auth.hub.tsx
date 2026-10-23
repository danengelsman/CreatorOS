import { createFileRoute, useNavigate } from '@tanstack/react-router';
import CreatorHub from '@/components/CreatorHub';
import LayoutShell from '@/components/LayoutShell';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspaceStore } from '@/store/workspaceStore';

export const Route = createFileRoute('/_auth/hub')({
  component: () => {
    const auth = useAuth();
    const navigate = useNavigate();
    const { projects } = useWorkspaceStore();

    return (
      <LayoutShell user={auth.user}>
        <CreatorHub
          projects={projects}
          setActiveTab={(tab) =>
            navigate({ to: (tab === 'home' ? '/dashboard' : `/${tab}`) as any })
          }
        />
      </LayoutShell>
    );
  },
});
