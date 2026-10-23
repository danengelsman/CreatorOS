import { createFileRoute, useNavigate } from '@tanstack/react-router';
import ContentStudio from '@/components/ContentStudio';
import LayoutShell from '@/components/LayoutShell';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspaceStore } from '@/store/workspaceStore';

export const Route = createFileRoute('/_auth/create')({
  component: () => {
    const auth = useAuth();
    const navigate = useNavigate();
    const { brand, selectedIdea, setSelectedIdea, selectedProject } = useWorkspaceStore();

    return (
      <LayoutShell user={auth.user}>
        <ContentStudio
          user={auth.user}
          brand={brand}
          setActiveTab={(tab) => navigate({ to: `/_auth/${tab}` as any })}
          selectedIdea={selectedIdea}
          setSelectedIdea={setSelectedIdea}
          selectedProject={selectedProject}
        />
      </LayoutShell>
    );
  },
});
