
import { createFileRoute } from '@tanstack/react-router';
import Dashboard from '@/components/Dashboard';
import LayoutShell from '@/components/LayoutShell';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspaceStore } from '@/store/workspaceStore';

export const Route = createFileRoute('/_auth/dashboard')({
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
        <Dashboard 
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
