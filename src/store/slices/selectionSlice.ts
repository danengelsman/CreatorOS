import { StateCreator } from 'zustand';

export interface SelectionSlice {
  selectedIdea: any | null;
  setSelectedIdea: (idea: any) => void;
  selectedProject: any | null;
  setSelectedProject: (project: any) => void;
}

export const createSelectionSlice: StateCreator<SelectionSlice, [], [], SelectionSlice> = (
  set,
) => ({
  selectedIdea: null,
  setSelectedIdea: (idea) => set({ selectedIdea: idea }),
  selectedProject: null,
  setSelectedProject: (project) => set({ selectedProject: project }),
});
