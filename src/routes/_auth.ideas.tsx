import { createFileRoute, useNavigate } from '@tanstack/react-router';
import VideoIdeas from '@/components/VideoIdeas';
import LayoutShell from '@/components/LayoutShell';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspaceStore, selectBrand } from '@/store/workspaceStore';

export const Route = createFileRoute('/_auth/ideas')({
  component: () => {
    const auth = useAuth();
    const navigate = useNavigate();
    const state = useWorkspaceStore();
    const token = auth.workspaceToken?.uid === auth.user?.uid ? auth.workspaceToken : null;
    const brand = selectBrand(state, token);
    const setBrand = (value: any) => state.setBrand(token, value);
    const setSelectedIdea = (value: any) => state.setSelectedIdea(token, value);

    return (
      <LayoutShell user={auth.user}>
        <VideoIdeas
          key={token?.generation}
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
