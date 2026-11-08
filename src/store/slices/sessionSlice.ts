import type { StateCreator } from 'zustand';
import type { WorkspaceState } from '../workspaceStore';

/** A capability captured before starting account-scoped work. Never recreate it on completion. */
export type WorkspaceToken = Readonly<{ uid: string; generation: number }>;
export type Owned = { token: WorkspaceToken; value: any } | null;
export type Field = 'brand' | 'projects' | 'selectedIdea' | 'selectedProject';
const EMPTY_PROJECTS: any[] = [];

/** Resolves the slice's `set` param without importing zustand internals. */
type SetStateOf<S> = Parameters<StateCreator<S>>[0];

const empty = () => ({
  brand: null,
  projects: EMPTY_PROJECTS,
  selectedIdea: null,
  selectedProject: null,
  isProjectsLoading: true,
  projectsLoadError: false,
  owners: { brand: null, projects: null, selectedIdea: null, selectedProject: null },
});

export const isWorkspaceTokenCurrent = (
  s: WorkspaceState,
  token: WorkspaceToken | null | undefined,
) => !!token && s.uid === token.uid && s.generation === token.generation;

/**
 * Token-guarded state write: the same ownership contract as the monolithic
 * store. A setter is a no-op unless the caller holds the current token.
 */
export const guardedWrite =
  (set: SetStateOf<WorkspaceState>) =>
  (field: Field, token: WorkspaceToken | null, value: any) =>
    set((s) => {
      if (!isWorkspaceTokenCurrent(s, token)) return s;
      return { [field]: value, owners: { ...s.owners, [field]: { token: token!, value } } };
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

export { owned };

/** Account lifecycle + ownership receipts + active selections (session-scoped state). */
export const sessionSlice: StateCreator<WorkspaceState, [], [], Partial<WorkspaceState>> = (set) => {
  const write = guardedWrite(set);
  return {
    uid: null,
    generation: 0,
    ...empty(),

    changeAccount: (uid: string | null) => {
      let token: WorkspaceToken | null = null;
      set((s) => {
        const generation = s.generation + 1;
        token = uid ? Object.freeze({ uid, generation }) : null;
        return { ...empty(), uid, generation };
      });
      return token;
    },

    invalidateAccount: (token: WorkspaceToken | null) =>
      set((s) => {
        if (token && !isWorkspaceTokenCurrent(s, token)) return s;
        if (!token && s.uid !== null) return s;
        return { ...empty(), uid: null, generation: s.generation + 1 };
      }),

    setSelectedIdea: (token: WorkspaceToken | null, value: any) =>
      write('selectedIdea', token, value),
    setSelectedProject: (token: WorkspaceToken | null, value: any) =>
      write('selectedProject', token, value),
    clearSelectedIdea: (
      token: WorkspaceToken | null,
      expected: any,
      receipt: Owned,
    ) =>
      set((s) => {
        if (
          !receipt ||
          s.owners.selectedIdea !== receipt ||
          !isWorkspaceTokenCurrent(s, token) ||
          s.selectedIdea !== expected
        )
          return s;
        return {
          selectedIdea: null,
          owners: { ...s.owners, selectedIdea: { token: token!, value: null } },
        };
      }),
  };
};
