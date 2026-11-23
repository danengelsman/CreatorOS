import { createFileRoute, useNavigate } from '@tanstack/react-router';
import Dashboard from '@/components/Dashboard';
import LayoutShell from '@/components/LayoutShell';
import { useAuth } from '@/contexts/AuthContext';
import {
  useWorkspaceStore,
  selectBrand,
  selectProjects,
  selectProjectsLoading,
  selectProjectsError,
} from '@/store/workspaceStore';

export const Route = createFileRoute('/_auth/dashboard')({
  component: () => {
    const auth = useAuth();
    const navigate = useNavigate();
    const state = useWorkspaceStore();
    const token = auth.workspaceToken?.uid === auth.user?.uid ? auth.workspaceToken : null;
    const brand = selectBrand(state, token);
    const projects = selectProjects(state, token);
    const isProjectsLoading = selectProjectsLoading(state, token);
    const projectsLoadError = selectProjectsError(state, token);

    return (
      <LayoutShell user={auth.user}>
        <Dashboard
          user={auth.user}
          brand={brand}
          setActiveTab={(tab) =>
            navigate({
              to: (tab === 'home' ? '/dashboard' : tab === 'create' ? '/studio' : `/${tab}`) as any,
            })
          }
          projects={projects}
          isProjectsLoading={isProjectsLoading}
          projectsLoadError={projectsLoadError}
        />
      </LayoutShell>
    );
  },
});
