import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({
  slots: [] as any[],
  index: 0,
  writes: [] as any[],
  docs: new Map<string, any>(),
  failAfterWrite: false,
  failBeforeWrite: false,
  nextId: 0,
}));
vi.mock('react', async (importOriginal) => {
  const real = await importOriginal<typeof import('react')>();
  const useState = (initial: any) => {
    const i = h.index++;
    if (!(i in h.slots)) h.slots[i] = typeof initial === 'function' ? initial() : initial;
    return [
      h.slots[i],
      (next: any) => {
        h.slots[i] = typeof next === 'function' ? next(h.slots[i]) : next;
      },
    ];
  };
  const useRef = (initial: any) => {
    const i = h.index++;
    return (h.slots[i] ??= { current: initial });
  };
  return { ...real, useState, useRef, useEffect: () => {} };
});
vi.mock('../src/firebase', () => ({ db: {} }));
vi.mock('../src/components/ContentIdeaGenerator', () => ({ default: () => null }));
vi.mock('../src/components/ViralTemplatesLibrary', () => ({ default: () => null }));
vi.mock('firebase/firestore', () => ({
  collection: () => ({}),
  doc: (...args: any[]) => ({ id: args.length === 3 ? args[2] : `project-${++h.nextId}` }),
  serverTimestamp: () => 'timestamp',
  runTransaction: async (_db: any, callback: any) => {
    if (h.failBeforeWrite) {
      h.failBeforeWrite = false;
      throw new Error('offline');
    }
    await callback({
      get: async (ref: any) => ({
        exists: () => h.docs.has(ref.id),
        data: () => h.docs.get(ref.id),
      }),
      set: (ref: any, value: any) => {
        h.writes.push({ id: ref.id, value });
        h.docs.set(ref.id, value);
      },
    });
    if (h.failAfterWrite) {
      h.failAfterWrite = false;
      throw new Error('ambiguous failure');
    }
  },
}));
import StudioHub, { StudioHubContent } from '../src/components/studio/StudioHub';

function find(node: any, predicate: (node: any) => boolean): any {
  if (!node || typeof node !== 'object') return undefined;
  if (predicate(node)) return node;
  for (const child of React.Children.toArray(node.props?.children)) {
    const result = find(child, predicate);
    if (result) return result;
  }
}
const text = (n: any): string =>
  typeof n === 'string'
    ? n
    : React.isValidElement(n)
      ? React.Children.toArray((n.props as any).children)
          .map(text)
          .join('')
      : '';
function button(tree: any, label: string) {
  const result = find(tree, (n) => n.type === 'button' && text(n).trim() === label);
  expect(result, `button ${label}`).toBeTruthy();
  return result;
}

beforeEach(() => {
  const data = new Map<string, string>();
  vi.stubGlobal('sessionStorage', {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => data.set(key, value),
    removeItem: (key: string) => data.delete(key),
  });
  h.slots = [];
  h.index = 0;
  h.writes = [];
  h.docs.clear();
  h.failAfterWrite = false;
  h.failBeforeWrite = false;
  h.nextId = 0;
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
describe('StudioHub retry interaction', () => {
  it('retains the handoff on a definite failure and retries the same project', async () => {
    const idea = { title: 'Original', description: 'Keep this' };
    const clear = vi.fn();
    const open = vi.fn();
    const props = {
      user: { uid: 'owner' },
      brand: null,
      projects: [],
      isProjectsLoading: false,
      projectsLoadError: false,
      selectedIdea: idea,
      selectedIdeaReceipt: { token: { uid: 'owner', generation: 1 }, value: idea },
      onClearSelectedIdea: clear,
      onOpenProject: open,
    };
    const render = () => {
      h.index = 0;
      return StudioHubContent(props);
    };
    h.failBeforeWrite = true;
    button(render(), 'Create from selected idea').props.onClick();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(h.writes).toHaveLength(0);
    expect(clear).not.toHaveBeenCalled();
    button(render(), 'Retry saving selected project').props.onClick();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(h.nextId).toBe(1);
    expect(h.writes).toHaveLength(1);
    expect(clear).toHaveBeenCalledTimes(1);
    expect(open).toHaveBeenCalledWith('project-1');
  });
  it('refuses retry under another account and retains the original seed for the original account', async () => {
    const idea = { title: 'Private idea' };
    const clear = vi.fn();
    const open = vi.fn();
    const props = {
      user: { uid: 'owner' },
      brand: null,
      projects: [],
      isProjectsLoading: false,
      projectsLoadError: false,
      selectedIdea: idea,
      selectedIdeaReceipt: { token: { uid: 'owner', generation: 1 }, value: idea },
      onClearSelectedIdea: clear,
      onOpenProject: open,
    };
    const render = () => {
      h.index = 0;
      return StudioHubContent(props);
    };
    h.failAfterWrite = true;
    button(render(), 'Create from selected idea').props.onClick();
    await new Promise((resolve) => setTimeout(resolve, 0));
    props.user.uid = 'other';
    button(render(), 'Retry saving selected project').props.onClick();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(h.writes).toHaveLength(1);
    expect(h.nextId).toBe(1);
    expect(open).not.toHaveBeenCalled();
    expect(clear).not.toHaveBeenCalled();
    props.user.uid = 'owner';
    button(render(), 'Retry saving selected project').props.onClick();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(open).toHaveBeenCalledWith('project-1');
    expect(clear).toHaveBeenCalledTimes(1);
  });
  it('preserves an ambiguous selected idea failure across close, retries the same ID without overwriting, and clears the handoff only after success', async () => {
    const idea = { title: 'Original', description: 'Keep this' };
    const clear = vi.fn();
    const open = vi.fn();
    const props = {
      user: { uid: 'owner' },
      brand: null,
      projects: [],
      isProjectsLoading: false,
      projectsLoadError: false,
      selectedIdea: idea,
      selectedIdeaReceipt: { token: { uid: 'owner', generation: 1 }, value: idea },
      onClearSelectedIdea: clear,
      onOpenProject: open,
    };
    const render = () => {
      h.index = 0;
      return StudioHubContent(props);
    };
    button(render(), 'New project').props.onClick();
    h.failAfterWrite = true;
    await button(render(), 'Create from selected idea').props.onClick();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(clear).not.toHaveBeenCalled();
    expect(h.writes).toHaveLength(1);
    h.docs.set('project-1', { ...h.docs.get('project-1'), name: 'Edited after save' });
    button(render(), 'Close').props.onClick();
    button(render(), 'New project').props.onClick();
    await button(render(), 'Retry saving selected project').props.onClick();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(h.nextId).toBe(1);
    expect(h.writes).toHaveLength(1);
    expect(h.docs.get('project-1').name).toBe('Edited after save');
    expect(open).toHaveBeenCalledWith('project-1');
    expect(clear).toHaveBeenCalledTimes(1);
  });
});

it('ambiguous create after remount reconciles instead of duplicating', async () => {
  const idea = { title: 'Original', description: 'Keep this' };
  const props = {
    user: { uid: 'owner' },
    brand: null,
    projects: [],
    isProjectsLoading: false,
    projectsLoadError: false,
    selectedIdea: idea,
    onClearSelectedIdea: vi.fn(),
    onOpenProject: vi.fn(),
  };
  const render = () => {
    h.index = 0;
    return StudioHubContent(props);
  };
  h.failAfterWrite = true;
  button(render(), 'Create from selected idea').props.onClick();
  await new Promise((resolve) => setTimeout(resolve, 0));
  expect(h.writes).toHaveLength(1);
  expect(props.onClearSelectedIdea).not.toHaveBeenCalled();
  h.slots = []; // remount recovers the pending ID and draft
  button(render(), 'Retry saving selected project').props.onClick();
  await new Promise((resolve) => setTimeout(resolve, 0));
  expect(h.writes).toHaveLength(1);
});

it('remounts and quarantines stale inputs across account switches', () => {
  const idea = { title: 'Private idea' };
  const brand = { name: 'Private brand' };
  const open = vi.fn();
  const clear = vi.fn();
  const props = {
    user: { uid: 'owner' },
    brand,
    projects: [{ userId: 'owner', name: 'Private project' }],
    isProjectsLoading: false,
    projectsLoadError: false,
    selectedIdea: idea,
    selectedIdeaReceipt: { token: { uid: 'owner', generation: 1 }, value: idea },
    onClearSelectedIdea: clear,
    onOpenProject: open,
  };
  const render = () => {
    h.index = 0;
    return StudioHub(props)!;
  };
  const original = render();
  expect(original.props.selectedIdea).toBe(idea);
  props.user = { uid: 'other' };
  const switched = render();
  expect(original.props.isCurrentOwner()).toBe(false);
  expect(switched.props.isCurrentOwner()).toBe(true);
  expect(switched.key).not.toBe(original.key);
  expect(switched.props.selectedIdea).toBeNull();
  expect(switched.props.brand).toBeNull();
  expect(switched.props.projects).toEqual([]);
  original.props.onOpenProject('private');
  original.props.onClearSelectedIdea();
  expect(open).not.toHaveBeenCalled();
  expect(clear).not.toHaveBeenCalled();
  props.selectedIdea = { title: 'New account idea' };
  expect(render().props.selectedIdea).toBe(props.selectedIdea);
  props.user = { uid: 'owner' };
  render();
  original.props.onOpenProject('private');
  expect(open).not.toHaveBeenCalled();
});
