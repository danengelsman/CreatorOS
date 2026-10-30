import { createFileRoute, useNavigate } from '@tanstack/react-router';
import StudioHub from '@/components/studio/StudioHub';
import { useAuth } from '@/contexts/AuthContext';
import {
  useWorkspaceStore,
  selectBrand,
  selectProjects,
  selectProjectsLoading,
  selectProjectsError,
  selectSelectedIdea,
  selectSelectedIdeaReceipt,
  isWorkspaceTokenCurrent,
} from '@/store/workspaceStore';

export const Route = createFileRoute('/_auth/studio/')({
  component: StudioHome,
});

function StudioHome() {
  const { user, workspaceToken } = useAuth();
  const navigate = useNavigate();
  const { inspector } = Route.useSearch();
  const state = useWorkspaceStore();
  const token = workspaceToken?.uid === user?.uid ? workspaceToken : null;
  const brand = selectBrand(state, token);
  const projects = selectProjects(state, token);
  const isProjectsLoading = selectProjectsLoading(state, token);
  const projectsLoadError = selectProjectsError(state, token);
  const selectedIdea = selectSelectedIdea(state, token);
  const receipt = selectSelectedIdeaReceipt(state, token);
  return (
    <>
      {inspector && (
        <p role="status" className="px-4 text-sm text-[var(--label-secondary)]">
          Choose a project to open {inspector === 'retention' ? 'Hook & Retention' : inspector === 'repurpose' ? 'Repurpose' : 'Scene Planner'}.
        </p>
      )}
      <StudioHub
        key={token?.generation}
        user={user}
        isCurrentOwner={() => isWorkspaceTokenCurrent(useWorkspaceStore.getState(), token)}
        brand={brand}
        projects={projects}
        isProjectsLoading={isProjectsLoading}
        projectsLoadError={projectsLoadError}
        selectedIdea={selectedIdea}
        onClearSelectedIdea={() => state.clearSelectedIdea(token, selectedIdea, receipt)}
        onOpenProject={(projectId) => {
          if (isWorkspaceTokenCurrent(useWorkspaceStore.getState(), token)) {
            void navigate({ to: '/studio/$projectId', params: { projectId }, search: { inspector } });
          }
        }}
      />
    </>
  );
}
