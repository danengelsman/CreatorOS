import { describe, it, expect, beforeEach } from 'vitest';
import { useWorkspaceStore, type WorkspaceToken } from '../src/store/workspaceStore';

describe('useWorkspaceStore domain slices (D8-A)', () => {
  let token: WorkspaceToken;
  beforeEach(() => {
    token = useWorkspaceStore.getState().changeAccount('test')!;
    // Reset state before each test
    useWorkspaceStore.setState({
      brand: null,
      projects: [],
      isProjectsLoading: true,
      projectsLoadError: false,
      selectedIdea: null,
      selectedProject: null,
    });
  });

  it('manages brand slice state correctly', () => {
    expect(useWorkspaceStore.getState().brand).toBeNull();
    const testBrand = { name: 'Test Brand', archetype: 'The Creator' };
    useWorkspaceStore.getState().setBrand(token, testBrand);
    expect(useWorkspaceStore.getState().brand).toEqual(testBrand);
  });

  it('manages project slice state correctly', () => {
    expect(useWorkspaceStore.getState().projects).toEqual([]);
    expect(useWorkspaceStore.getState().isProjectsLoading).toBe(true);

    const testProjects = [{ id: 'p1', title: 'Video Project 1' }];
    useWorkspaceStore.getState().setProjects(token, testProjects);
    useWorkspaceStore.getState().setProjectsStatus(token, false, false);

    expect(useWorkspaceStore.getState().projects).toEqual(testProjects);
    expect(useWorkspaceStore.getState().isProjectsLoading).toBe(false);
    expect(useWorkspaceStore.getState().projectsLoadError).toBe(false);
  });

  it('manages selection slice state correctly', () => {
    expect(useWorkspaceStore.getState().selectedIdea).toBeNull();
    expect(useWorkspaceStore.getState().selectedProject).toBeNull();

    const idea = { id: 'i1', title: 'Idea 1' };
    const project = { id: 'p2', title: 'Project 2' };

    useWorkspaceStore.getState().setSelectedIdea(token, idea);
    useWorkspaceStore.getState().setSelectedProject(token, project);

    expect(useWorkspaceStore.getState().selectedIdea).toEqual(idea);
    expect(useWorkspaceStore.getState().selectedProject).toEqual(project);
  });
});
