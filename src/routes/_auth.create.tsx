
import { createFileRoute } from '@tanstack/react-router';
import ContentStudio from '@/components/ContentStudio';
import LayoutShell from '@/components/LayoutShell';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspaceStore } from '@/store/workspaceStore';

export const Route = createFileRoute('/_auth/create')({
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
        <ContentStudio 
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
