import { createFileRoute, useNavigate } from '@tanstack/react-router';
import Dashboard from '@/components/Dashboard';
import LayoutShell from '@/components/LayoutShell';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspaceStore } from '@/store/workspaceStore';

export const Route = createFileRoute('/_auth/dashboard')({
  component: () => {
    const auth = useAuth();
    const navigate = useNavigate();
    const { brand, projects, isProjectsLoading, projectsLoadError, setSelectedProject } =
      useWorkspaceStore();

    return (
      <LayoutShell user={auth.user}>
        <Dashboard
          user={auth.user}
          userData={auth.userData}
          brand={brand}
          setActiveTab={(tab) =>
            navigate({ to: (tab === 'home' ? '/dashboard' : `/${tab}`) as any })
          }
          projects={projects}
          isProjectsLoading={isProjectsLoading}
          projectsLoadError={projectsLoadError}
          onOpenProject={(project) => {
            setSelectedProject(project);
            navigate({ to: '/create' });
          }}
        />
      </LayoutShell>
    );
  },
});
