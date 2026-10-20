
import { createFileRoute } from '@tanstack/react-router';
import ContentRepurposer from '@/components/ContentRepurposer';
import LayoutShell from '@/components/LayoutShell';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspaceStore } from '@/store/workspaceStore';

export const Route = createFileRoute('/_auth/repurpose')({
  component: () => {
    const auth = useAuth();
    const { 
      projects, 
      isProjectsLoading, 
      projectsLoadError, 
      selectedIdea, 
      selectedProject 
    } = useWorkspaceStore();

    return (
      <LayoutShell user={auth.user}>
        <ContentRepurposer 
          user={auth.user} 
          userData={auth.userData}
          projects={projects} 
          isProjectsLoading={isProjectsLoading}
          projectsLoadError={projectsLoadError}
          selectedIdea={selectedIdea}
          selectedProject={selectedProject}
        />
      </LayoutShell>
    );
  },
});
