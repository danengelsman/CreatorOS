
import { create } from 'zustand';

interface WorkspaceState {
  selectedIdea: any | null;
  setSelectedIdea: (idea: any) => void;
  selectedProject: any | null;
  setSelectedProject: (project: any) => void;
  projects: any[];
  setProjects: (projects: any[]) => void;
  isProjectsLoading: boolean;
  setIsProjectsLoading: (loading: boolean) => void;
  projectsLoadError: boolean;
  setIsProjectsLoadError: (error: boolean) => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  selectedIdea: null,
  setSelectedIdea: (idea) => set({ selectedIdea: idea }),
  selectedProject: null,
  setSelectedProject: (project) => set({ selectedProject: project }),
  projects: [],
  setProjects: (projects) => set({ projects }),
  isProjectsLoading: true,
  setIsProjectsLoading: (loading) => set({ isProjectsLoading: loading }),
  projectsLoadError: false,
  setIsProjectsLoadError: (error) => set({ projectsLoadError: error }),
}));
