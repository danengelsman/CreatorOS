import type { StateCreator } from 'zustand';
import type { WorkspaceState } from '../workspaceStore';
import { guardedWrite, isWorkspaceTokenCurrent, type WorkspaceToken } from './sessionSlice';

const EMPTY_PROJECTS: any[] = [];

export const projectsSlice: StateCreator<WorkspaceState, [], [], Partial<WorkspaceState>> = (
  set,
) => {
  const write = guardedWrite(set);
  return {
    projects: EMPTY_PROJECTS,
    isProjectsLoading: true,
    projectsLoadError: false,
    setProjects: (token: WorkspaceToken | null, value: any[]) => write('projects', token, value),
    setProjectsStatus: (token: WorkspaceToken | null, loading: boolean, error: boolean) =>
      set((s) =>
        isWorkspaceTokenCurrent(s, token)
          ? { isProjectsLoading: loading, projectsLoadError: error }
          : s,
      ),
  };
};

export type ProjectSlice = Pick<
  WorkspaceState,
  'projects' | 'setProjects' | 'isProjectsLoading' | 'projectsLoadError' | 'setProjectsStatus'
>;
