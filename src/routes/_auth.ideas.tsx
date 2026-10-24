import { createFileRoute, useNavigate } from '@tanstack/react-router';
import VideoIdeas from '@/components/VideoIdeas';
import LayoutShell from '@/components/LayoutShell';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspaceStore } from '@/store/workspaceStore';

export const Route = createFileRoute('/_auth/ideas')({
  component: () => {
    const auth = useAuth();
    const navigate = useNavigate();
    const { brand, setBrand, setSelectedIdea } = useWorkspaceStore();

    return (
      <LayoutShell user={auth.user}>
        <VideoIdeas
          user={auth.user}
          brand={brand}
          setBrand={setBrand}
          setActiveTab={(tab) =>
            navigate({ to: (tab === 'home' ? '/dashboard' : `/${tab}`) as any })
          }
          setSelectedIdea={setSelectedIdea}
        />
      </LayoutShell>
    );
  },
});
