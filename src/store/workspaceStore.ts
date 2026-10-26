import { create } from 'zustand';
import { BrandSlice, createBrandSlice } from './slices/brandSlice';
import { ProjectSlice, createProjectSlice } from './slices/projectSlice';
import { SelectionSlice, createSelectionSlice } from './slices/selectionSlice';

export type WorkspaceState = BrandSlice & ProjectSlice & SelectionSlice;

export const useWorkspaceStore = create<WorkspaceState>()((...a) => ({
  ...createBrandSlice(...a),
  ...createProjectSlice(...a),
  ...createSelectionSlice(...a),
}));

export * from './slices/brandSlice';
export * from './slices/projectSlice';
export * from './slices/selectionSlice';
