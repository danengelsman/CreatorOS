import type { WorkspaceState } from '../ownedWorkspaceStore';

export type ProjectSlice = Pick<
  WorkspaceState,
  'projects' | 'setProjects' | 'isProjectsLoading' | 'projectsLoadError' | 'setProjectsStatus'
>;
