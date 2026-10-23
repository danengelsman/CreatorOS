import { createFileRoute, useNavigate } from '@tanstack/react-router';
import Roadmap from '@/components/Roadmap';
import LayoutShell from '@/components/LayoutShell';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspaceStore } from '@/store/workspaceStore';

export const Route = createFileRoute('/_auth/roadmap')({
  component: () => {
    const auth = useAuth();
    const navigate = useNavigate();
    const { brand, projects } = useWorkspaceStore();

    return (
      <LayoutShell user={auth.user}>
        <Roadmap
          user={auth.user}
          brand={brand}
          projects={projects}
          setActiveTab={(tab) =>
            navigate({ to: (tab === 'home' ? '/dashboard' : `/${tab}`) as any })
          }
        />
      </LayoutShell>
    );
  },
});
