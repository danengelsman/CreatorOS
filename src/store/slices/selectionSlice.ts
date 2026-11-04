import type { WorkspaceState } from '../ownedWorkspaceStore';

export type SelectionSlice = Pick<
  WorkspaceState,
  | 'selectedIdea'
  | 'setSelectedIdea'
  | 'clearSelectedIdea'
  | 'selectedProject'
  | 'setSelectedProject'
>;
