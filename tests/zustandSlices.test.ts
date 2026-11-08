import { describe, it, expect } from 'vitest';
import {
  useWorkspaceStore,
  type WorkspaceToken,
  selectBrand,
  selectProjects,
  selectSelectedIdea,
  selectSelectedIdeaReceipt,
  selectSelectedProject,
  selectProjectsLoading,
  selectProjectsError,
  isWorkspaceTokenCurrent,
} from '../src/store/workspaceStore';

const store = useWorkspaceStore;
const state = () => store.getState();

/** New account generation + clean owned state; focus UI state is also reset. */
const resetStore = (uid = 'test-user'): WorkspaceToken => {
  const token = state().changeAccount(uid)!;
  store.setState({
    brand: null,
    projects: [],
    selectedIdea: null,
    selectedProject: null,
    isProjectsLoading: true,
    projectsLoadError: false,
    owners: { brand: null, projects: null, selectedIdea: null, selectedProject: null },
    activeSignal: null,
    focusMode: false,
    oneLever: null,
    momentumBar: 0,
  });
  return token!;
};

describe('zustand slices (D8-A)', () => {
  describe('slice isolation', () => {
    it('focus slice state is independent of account-scoped slices', () => {
      const token = resetStore();
      state().setFocusMode(true);
      state().setActiveSignal('sig-abc');
      state().setOneLever('post-3x-weekly');
      state().setMomentumBar(73);

      expect(state().focusMode).toBe(true);
      expect(state().activeSignal).toBe('sig-abc');
      expect(state().oneLever).toBe('post-3x-weekly');
      expect(state().momentumBar).toBe(73);

      // Owned-slice writes must not disturb focus UI state.
      state().setBrand(token, { name: 'B' });
      state().setProjects(token, [{ id: 'p1' }]);
      expect(state().focusMode).toBe(true);
      expect(state().activeSignal).toBe('sig-abc');
      expect(state().oneLever).toBe('post-3x-weekly');
      expect(state().momentumBar).toBe(73);
    });

    it('changeAccount resets owned slices but leaves focus UI state intact', () => {
      const token = resetStore();
      state().setBrand(token, { name: 'B' });
      state().setProjects(token, [{ id: 'p1' }]);
      state().setSelectedIdea(token, { id: 'i1' });
      state().setFocusMode(true);

      const next = state().changeAccount('other-user')!;
      expect(next).not.toBe(token);

      const after = state();
      expect(after.uid).toBe('other-user');
      expect(after.brand).toBeNull();
      expect(after.projects).toEqual([]);
      expect(after.selectedIdea).toBeNull();
      expect(after.selectedProject).toBeNull();
      expect(after.isProjectsLoading).toBe(true);
      // Focus mode is per-UI-session state, not account-owned data.
      expect(after.focusMode).toBe(true);
    });

    it('session/brand/projects slices do not leak into each other', () => {
      const token = resetStore();
      state().setSelectedIdea(token, { id: 'i1' });
      state().setSelectedProject(token, { id: 'p1' });

      state().setBrand(token, { name: 'B' });
      expect(state().brand).toEqual({ name: 'B' });
      expect(state().selectedIdea).toEqual({ id: 'i1' });

      state().setProjects(token, [{ id: 'p2' }]);
      expect(state().projects).toEqual([{ id: 'p2' }]);
      expect(state().selectedProject).toEqual({ id: 'p1' });
    });
  });

  describe('token-based ownership guards', () => {
    it('selectors return guarded values for mismatched or stale tokens', () => {
      const token = resetStore();
      const brand = { name: 'Test Brand', archetype: 'The Creator' };
      const projects = [{ id: 'p1', title: 'Video Project 1' }];
      state().setBrand(token, brand);
      state().setProjects(token, projects);
      state().setProjectsStatus(token, false, false);

      const current = state();
      expect(selectBrand(current, token)).toEqual(brand);
      expect(selectProjects(current, token)).toEqual(projects);
      expect(selectProjectsLoading(current, token)).toBe(false);
      expect(selectProjectsError(current, token)).toBe(false);

      // Null token is never current.
      expect(selectBrand(current, null)).toBeNull();
      expect(selectProjects(current, null)).toEqual([]);
      expect(selectSelectedIdea(current, null)).toBeNull();
      expect(selectSelectedProject(current, null)).toBeNull();
      expect(selectProjectsLoading(current, null)).toBe(true);
      expect(selectProjectsError(current, null)).toBe(false);

      // Stale token after an account change is guarded out.
      // `current` is a pre-change snapshot that still owns the old data, so
      // assertions must read the live state.
      state().changeAccount('other-user');
      const after = state();
      expect(selectBrand(after, token)).toBeNull();
      expect(selectProjects(after, token)).toEqual([]);
      expect(selectProjectsLoading(after, token)).toBe(true);
      expect(isWorkspaceTokenCurrent(after, token)).toBe(false);
    });

    it('setters are no-ops for non-current tokens', () => {
      const token = resetStore();
      const other = state().changeAccount('other-user')!;
      // `other` is now current; `token` is stale.
      expect(isWorkspaceTokenCurrent(state(), other)).toBe(true);
      expect(isWorkspaceTokenCurrent(state(), token)).toBe(false);

      state().setProjects(token, [{ id: 'p1' }]); // no-op: stale token
      expect(selectProjects(state(), token)).toEqual([]);
      expect(selectProjects(state(), other)).toEqual([]);

      state().setProjects(other, [{ id: 'p2' }]); // applies
      expect(selectProjects(state(), other)).toEqual([{ id: 'p2' }]);

      state().setBrand(token, { name: 'ignored' }); // no-op: stale token
      expect(selectBrand(state(), token)).toBeNull();
    });

    it('clearSelectedIdea requires current token, matching expected value and receipt', () => {
      const token = resetStore();
      const idea = { id: 'i1', title: 'Idea 1' };
      state().setSelectedIdea(token, idea);
      const receipt = selectSelectedIdeaReceipt(state(), token)!;
      expect(state().selectedIdea).toEqual(idea);

      // Wrong expected value -> no-op.
      state().clearSelectedIdea(token, { id: 'nope' } as any, receipt);
      expect(state().selectedIdea).toEqual(idea);

      // Wrong receipt -> no-op.
      state().clearSelectedIdea(token, idea, { token, value: null } as any);
      expect(state().selectedIdea).toEqual(idea);

      // Stale token -> no-op: idea preserved (fabricate a stale token for the
      // same account/previous generation; changeAccount would reset the idea
      // we're trying to preserve).
      const staleToken = { uid: token.uid, generation: token.generation - 1 } as WorkspaceToken;
      state().clearSelectedIdea(staleToken, idea, receipt);
      expect(state().selectedIdea).toEqual(idea);

      // Correct token, expected and receipt -> cleared, receipt rotated.
      state().clearSelectedIdea(token, idea, receipt);
      expect(state().selectedIdea).toBeNull();
      expect(selectSelectedIdeaReceipt(state(), token)).toEqual({
        token,
        value: null,
      });
    });
  });

  describe('focusSlice setters/getters (Zen Master One Lever UI)', () => {
    it('defaults', () => {
      resetStore();
      const s = state();
      expect(s.activeSignal).toBeNull();
      expect(s.focusMode).toBe(false);
      expect(s.oneLever).toBeNull();
      expect(s.momentumBar).toBe(0);
    });

    it('setters clamp momentumBar to 0-100', () => {
      resetStore();
      state().setFocusMode(true);
      expect(state().focusMode).toBe(true);
      state().setFocusMode(false);
      expect(state().focusMode).toBe(false);

      state().setActiveSignal('sig-1');
      expect(state().activeSignal).toBe('sig-1');
      state().setActiveSignal(null);
      expect(state().activeSignal).toBeNull();

      state().setOneLever('publish-3-videos-weekly');
      expect(state().oneLever).toBe('publish-3-videos-weekly');
      state().setOneLever(null);
      expect(state().oneLever).toBeNull();

      state().setMomentumBar(42);
      expect(state().momentumBar).toBe(42);
      state().setMomentumBar(-10);
      expect(state().momentumBar).toBe(0);
      state().setMomentumBar(200);
      expect(state().momentumBar).toBe(100);
      state().setMomentumBar(50);
      expect(state().momentumBar).toBe(50);
    });

    it('focus state survives account-scoped writes', () => {
      const token = resetStore();
      state().setFocusMode(true);
      state().setActiveSignal('sig-abc');
      state().setOneLever('one-lever');
      state().setMomentumBar(90);

      state().setBrand(token, { name: 'B' });
      state().setProjects(token, [{ id: 'p1' }]);
      state().setSelectedIdea(token, { id: 'i1' });
      state().setProjectsStatus(token, false, false);

      const s = state();
      expect(s.focusMode).toBe(true);
      expect(s.activeSignal).toBe('sig-abc');
      expect(s.oneLever).toBe('one-lever');
      expect(s.momentumBar).toBe(90);
    });
  });
});
