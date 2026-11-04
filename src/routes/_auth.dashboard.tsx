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
  isWorkspaceTokenCurrent,
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
          userData={auth.userData}
          brand={brand}
          setActiveTab={(tab) =>
            navigate({
              to: (tab === 'home' ? '/dashboard' : tab === 'create' ? '/studio' : `/${tab}`) as any,
            })
          }
          projects={projects}
          isProjectsLoading={isProjectsLoading}
          projectsLoadError={projectsLoadError}
          onOpenProject={(project) => {
            if (
              isWorkspaceTokenCurrent(useWorkspaceStore.getState(), token) &&
              project.userId === token?.uid &&
              project.type === 'content'
            ) {
              void navigate({ to: '/studio/$projectId', params: { projectId: project.id } });
            }
          }}
        />
      </LayoutShell>
    );
  },
});
