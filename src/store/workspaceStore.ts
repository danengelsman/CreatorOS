import { create } from 'zustand';

import { brandSlice } from './slices/brandSlice';
import { focusSlice } from './slices/focusSlice';
import {
  isWorkspaceTokenCurrent,
  owned,
  type Owned,
  type Field,
  type WorkspaceToken,
} from './slices/sessionSlice';
import { projectsSlice } from './slices/projectsSlice';
import { sessionSlice } from './slices/sessionSlice';

export interface WorkspaceState {
  uid: string | null;
  generation: number;
  brand: any | null;
  projects: any[];
  selectedIdea: any | null;
  selectedProject: any | null;
  isProjectsLoading: boolean;
  projectsLoadError: boolean;
  activeSignal: string | null;
  focusMode: boolean;
  oneLever: string | null;
  momentumBar: number;
  owners: Record<Field, Owned>;
  changeAccount: (uid: string | null) => WorkspaceToken | null;
  invalidateAccount: (token: WorkspaceToken | null) => void;
  setBrand: (token: WorkspaceToken | null, value: any) => void;
  setProjects: (token: WorkspaceToken | null, value: any[]) => void;
  setSelectedIdea: (token: WorkspaceToken | null, value: any) => void;
  setSelectedProject: (token: WorkspaceToken | null, value: any) => void;
  clearSelectedIdea: (token: WorkspaceToken | null, expected: any, receipt: Owned) => void;
  setProjectsStatus: (token: WorkspaceToken | null, loading: boolean, error: boolean) => void;
  setActiveSignal: (signal: string | null) => void;
  setFocusMode: (focusMode: boolean) => void;
  setOneLever: (oneLever: string | null) => void;
  setMomentumBar: (value: number) => void;
}

/**
 * Single store composed from slices via the Zustand StateCreator pattern.
 *
 * Slice order matters only for same-key overrides; here slices own disjoint
 * state keys, so each slice's setters update only its own fields.
 */
export const useWorkspaceStore = create<WorkspaceState>()(
  (...a) =>
    ({
      ...sessionSlice(...a),
      ...brandSlice(...a),
      ...projectsSlice(...a),
      ...focusSlice(...a),
    }) as WorkspaceState,
);

export type { WorkspaceToken };
export { isWorkspaceTokenCurrent };

// Keep the fallback stable for Zustand's useSyncExternalStore snapshot checks.
const EMPTY_PROJECTS: any[] = [];

/** Account-scoped selectors — same ownership-guard contract as before the slice split. */
export const selectBrand = (s: WorkspaceState, token: WorkspaceToken | null | undefined) =>
  owned(s, token, 'brand') ? s.brand : null;
export const selectProjects = (s: WorkspaceState, token: WorkspaceToken | null | undefined) =>
  owned(s, token, 'projects') ? s.projects : EMPTY_PROJECTS;
export const selectSelectedIdea = (s: WorkspaceState, token: WorkspaceToken | null | undefined) =>
  owned(s, token, 'selectedIdea') ? s.selectedIdea : null;
/** The receipt identifies this particular handoff, even if the same idea is reselected. */
export const selectSelectedIdeaReceipt = (
  s: WorkspaceState,
  token: WorkspaceToken | null | undefined,
) => (owned(s, token, 'selectedIdea') ? s.owners.selectedIdea : null);
export const selectSelectedProject = (
  s: WorkspaceState,
  token: WorkspaceToken | null | undefined,
) => (owned(s, token, 'selectedProject') ? s.selectedProject : null);
export const selectProjectsLoading = (
  s: WorkspaceState,
  token: WorkspaceToken | null | undefined,
) => !isWorkspaceTokenCurrent(s, token) || s.isProjectsLoading;
export const selectProjectsError = (s: WorkspaceState, token: WorkspaceToken | null | undefined) =>
  isWorkspaceTokenCurrent(s, token) && s.projectsLoadError;
