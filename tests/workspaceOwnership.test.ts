import { beforeEach, describe, expect, it } from 'vitest';
import {
  useWorkspaceStore,
  selectBrand,
  selectProjects,
  selectSelectedIdea,
  selectSelectedIdeaReceipt,
  selectSelectedProject,
} from '../src/store/workspaceStore';
const store = () => useWorkspaceStore.getState();
describe('owner and generation bound workspace', () => {
  beforeEach(() => store().changeAccount(null));
  it('rejects copied or untagged account values on initial B', () => {
    const a = store().changeAccount('A')!;
    store().setBrand(a, { name: 'A', content_ideas: [{ title: 'secret' }] });
    store().setProjects(a, [{ id: 'A-project' }]);
    const copied = {
      brand: store().brand,
      projects: store().projects,
      selectedIdea: { title: 'A idea' },
      selectedProject: { id: 'A' },
    };
    const b = store().changeAccount('B')!;
    useWorkspaceStore.setState(copied);
    expect(selectBrand(store(), b)).toBeNull();
    expect(selectProjects(store(), b)).toEqual([]);
    expect(selectSelectedIdea(store(), b)).toBeNull();
    expect(selectSelectedProject(store(), b)).toBeNull();
  });
  it('rejects late writes after A to B to A and teardown', () => {
    const a = store().changeAccount('A')!;
    store().setBrand(a, { name: 'old' });
    const b = store().changeAccount('B')!;
    const a2 = store().changeAccount('A')!;
    expect(a2.generation).toBeGreaterThan(a.generation);
    store().setBrand(a, { name: 'late' });
    store().setProjects(b, [{ id: 'late' }]);
    expect(selectBrand(store(), a2)).toBeNull();
    expect(selectProjects(store(), a2)).toEqual([]);
    store().invalidateAccount(a2);
    const a3 = store().changeAccount('A')!;
    store().setSelectedIdea(a2, { title: 'late' });
    expect(selectSelectedIdea(store(), a3)).toBeNull();
    expect(a3.generation).toBeGreaterThan(a2.generation);
  });
  it('only clears the handoff that was actually consumed', () => {
    const a = store().changeAccount('A')!;
    const first = { title: 'one' },
      second = { title: 'two' };
    store().setSelectedIdea(a, first);
    const oldReceipt = selectSelectedIdeaReceipt(store(), a);
    store().setSelectedIdea(a, second);
    store().clearSelectedIdea(a, first, oldReceipt);
    expect(selectSelectedIdea(store(), a)).toBe(second);
    const receipt = selectSelectedIdeaReceipt(store(), a);
    store().setSelectedIdea(a, second); // Same object, a different handoff.
    store().clearSelectedIdea(a, second, receipt);
    expect(selectSelectedIdea(store(), a)).toBe(second);
    store().clearSelectedIdea(a, second, selectSelectedIdeaReceipt(store(), a));
    expect(selectSelectedIdea(store(), a)).toBeNull();
  });
  it('ignores stale project loading and error callbacks', () => {
    const a = store().changeAccount('A')!;
    const b = store().changeAccount('B')!;
    store().setProjectsStatus(a, false, true);
    expect(store().isProjectsLoading).toBe(true);
    expect(store().projectsLoadError).toBe(false);
    store().setProjectsStatus(b, false, true);
    expect(store().projectsLoadError).toBe(true);
  });
});
