import { StateCreator } from 'zustand';

export interface ProjectSlice {
  projects: any[];
  setProjects: (projects: any[]) => void;
  isProjectsLoading: boolean;
  setIsProjectsLoading: (loading: boolean) => void;
  projectsLoadError: boolean;
  setIsProjectsLoadError: (error: boolean) => void;
}

export const createProjectSlice: StateCreator<ProjectSlice, [], [], ProjectSlice> = (set) => ({
  projects: [],
  setProjects: (projects) => set({ projects }),
  isProjectsLoading: true,
  setIsProjectsLoading: (loading) => set({ isProjectsLoading: loading }),
  projectsLoadError: false,
  setIsProjectsLoadError: (error) => set({ projectsLoadError: error }),
});
