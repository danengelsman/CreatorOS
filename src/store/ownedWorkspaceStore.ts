import { create } from 'zustand';

/** A capability captured before starting account-scoped work. Never recreate it on completion. */
export type WorkspaceToken = Readonly<{ uid: string; generation: number }>;
type Owned = { token: WorkspaceToken; value: any } | null;
type Field = 'brand' | 'projects' | 'selectedIdea' | 'selectedProject';
const EMPTY_PROJECTS: any[] = [];

export interface WorkspaceState {
  uid: string | null;
  generation: number;
  brand: any | null;
  projects: any[];
  selectedIdea: any | null;
  selectedProject: any | null;
  isProjectsLoading: boolean;
  projectsLoadError: boolean;
  owners: Record<Field, Owned>;
  changeAccount: (uid: string | null) => WorkspaceToken | null;
  invalidateAccount: (token: WorkspaceToken | null) => void;
  setBrand: (token: WorkspaceToken | null, value: any) => void;
  setProjects: (token: WorkspaceToken | null, value: any[]) => void;
  setSelectedIdea: (token: WorkspaceToken | null, value: any) => void;
  setSelectedProject: (token: WorkspaceToken | null, value: any) => void;
  clearSelectedIdea: (token: WorkspaceToken | null, expected: any, receipt: Owned) => void;
  setProjectsStatus: (token: WorkspaceToken | null, loading: boolean, error: boolean) => void;
}

export const isWorkspaceTokenCurrent = (
  s: WorkspaceState,
  token: WorkspaceToken | null | undefined,
) => !!token && s.uid === token.uid && s.generation === token.generation;

const empty = () => ({
  brand: null,
  projects: EMPTY_PROJECTS,
  selectedIdea: null,
  selectedProject: null,
  isProjectsLoading: true,
  projectsLoadError: false,
  owners: { brand: null, projects: null, selectedIdea: null, selectedProject: null },
});

export const useWorkspaceStore = create<WorkspaceState>()((set) => {
  const write = (field: Field, token: WorkspaceToken | null, value: any) =>
    set((s) => {
      if (!isWorkspaceTokenCurrent(s, token)) return s;
      return { [field]: value, owners: { ...s.owners, [field]: { token: token!, value } } };
    });
  return {
    uid: null,
    generation: 0,
    ...empty(),
    changeAccount: (uid) => {
      let token: WorkspaceToken | null = null;
      set((s) => {
        const generation = s.generation + 1;
        token = uid ? Object.freeze({ uid, generation }) : null;
        return { ...empty(), uid, generation };
      });
      return token;
    },
    invalidateAccount: (token) =>
      set((s) => {
        if (token && !isWorkspaceTokenCurrent(s, token)) return s;
        if (!token && s.uid !== null) return s;
        return { ...empty(), uid: null, generation: s.generation + 1 };
      }),
    setBrand: (token, value) => write('brand', token, value),
    setProjects: (token, value) => write('projects', token, value),
    setSelectedIdea: (token, value) => write('selectedIdea', token, value),
    setSelectedProject: (token, value) => write('selectedProject', token, value),
    clearSelectedIdea: (token, expected, receipt) =>
      set((s) => {
        if (
          !receipt ||
          s.owners.selectedIdea !== receipt ||
          !isWorkspaceTokenCurrent(s, token) ||
          selectSelectedIdea(s, token) !== expected
        )
          return s;
        return {
          selectedIdea: null,
          owners: { ...s.owners, selectedIdea: { token: token!, value: null } },
        };
      }),
    setProjectsStatus: (token, loading, error) =>
      set((s) =>
        isWorkspaceTokenCurrent(s, token)
          ? { isProjectsLoading: loading, projectsLoadError: error }
          : s,
      ),
  };
});

function owned(s: WorkspaceState, token: WorkspaceToken | null | undefined, field: Field) {
  const owner = s.owners?.[field];
  return (
    isWorkspaceTokenCurrent(s, token) &&
    owner &&
    owner.value === s[field] &&
    owner.token.uid === token!.uid &&
    owner.token.generation === token!.generation
  );
}
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
