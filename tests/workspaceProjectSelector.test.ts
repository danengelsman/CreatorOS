import { beforeEach, describe, expect, it } from 'vitest';
import { selectProjects, useWorkspaceStore } from '../src/store/workspaceStore';

const state = () => useWorkspaceStore.getState();

describe('project selector snapshot stability', () => {
  beforeEach(() => state().changeAccount(null));

  it('returns a stable empty snapshot for a current account before projects are populated', () => {
    const token = state().changeAccount('A')!;
    const snapshot = state();
    const result = selectProjects(snapshot, token);
    expect(result).toEqual([]);
    expect(selectProjects(snapshot, token)).toBe(result);
    state().setFocusMode(!state().focusMode);
    expect(selectProjects(state(), token)).toBe(result);
  });

  it('returns a stable empty snapshot for null and undefined tokens without exposing owned projects', () => {
    const token = state().changeAccount('A')!;
    state().setProjects(token, [{ id: 'private' }]);
    const snapshot = state();
    for (const missing of [null, undefined]) {
      const result = selectProjects(snapshot, missing);
      expect(result).toEqual([]);
      expect(selectProjects(snapshot, missing)).toBe(result);
      state().setFocusMode(!state().focusMode);
      expect(selectProjects(state(), missing)).toBe(result);
    }
  });

  it('returns stable empty snapshots for stale A and B tokens after A to B to A', () => {
    const a = state().changeAccount('A')!;
    const b = state().changeAccount('B')!;
    const a2 = state().changeAccount('A')!;
    const projects = [{ id: 'new-A' }];
    state().setProjects(a2, projects);
    const snapshot = state();
    for (const stale of [a, b]) {
      const result = selectProjects(snapshot, stale);
      expect(result).toEqual([]);
      expect(selectProjects(snapshot, stale)).toBe(result);
      state().setFocusMode(!state().focusMode);
      expect(selectProjects(state(), stale)).toBe(result);
    }
    expect(selectProjects(state(), a2)).toBe(projects);
  });

  it('returns each current owned projects array by reference, including an empty array', () => {
    const token = state().changeAccount('A')!;
    const empty: unknown[] = [];
    state().setProjects(token, empty);
    expect(selectProjects(state(), token)).toBe(empty);
    const projects = [{ id: 'one' }];
    state().setProjects(token, projects);
    expect(selectProjects(state(), token)).toBe(projects);
    expect(selectProjects(state(), token)).toBe(projects);
  });
});
