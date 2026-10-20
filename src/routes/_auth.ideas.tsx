
import { createFileRoute } from '@tanstack/react-router';
import VideoIdeas from '@/components/VideoIdeas';
import LayoutShell from '@/components/LayoutShell';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspaceStore } from '@/store/workspaceStore';

export const Route = createFileRoute('/_auth/ideas')({
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
        <VideoIdeas 
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
