import { beforeEach, describe, expect, it, vi } from 'vitest';

const store = vi.hoisted(() => ({ current: undefined as any, writes: [] as any[], retryWith: undefined as any }));
vi.mock('firebase/firestore', () => ({
  serverTimestamp: () => 'timestamp',
  runTransaction: async (_db: unknown, callback: (tx: any) => Promise<unknown>) => {
    const run = () => callback({
      get: async () => ({ exists: () => !!store.current, data: () => store.current }),
      set: (_ref: unknown, value: unknown) => store.writes.push({ type: 'set', value }),
      update: (_ref: unknown, value: unknown) => store.writes.push({ type: 'update', value }),
    });
    if (store.retryWith) { await run(); store.writes = []; store.current = store.retryWith; }
    return run();
  },
}));
import { createProjectIfAbsent, updateStudioStage } from '../src/components/studio/studioHubPersistence';
import { getPipelineColumn, makeProjectDraft, isScheduleManaged } from '../src/components/studio/studioHubHelpers';

const ref = {} as any;
const draft = makeProjectDraft('owner');
beforeEach(() => { store.current = undefined; store.writes = []; store.retryWith = undefined; });

describe('Studio persistence safety', () => {
  it('does not write a project after its account generation changes during a read', async () => {
    const isCurrent = vi.fn().mockReturnValueOnce(true).mockReturnValue(false);
    await expect(createProjectIfAbsent({} as any, ref, draft, 'operation', isCurrent)).rejects.toThrow();
    expect(store.writes).toEqual([]);
  });
  it('does not update a stage after its account generation changes during a read', async () => {
    store.current = draft;
    const isCurrent = vi.fn().mockReturnValueOnce(true).mockReturnValue(false);
    await expect(updateStudioStage({} as any, ref, 'owner', 'production', isCurrent)).rejects.toThrow();
    expect(store.writes).toEqual([]);
  });
  it('creates once and reconciles a retry without touching edited content', async () => {
    await createProjectIfAbsent({} as any, ref, draft, 'operation');
    expect(store.writes).toHaveLength(1);
    store.writes = [];
    store.current = { ...draft, studioCreateId: 'operation', name: 'Edited elsewhere', data: { body: 'edited' } };
    await createProjectIfAbsent({} as any, ref, draft, 'operation');
    expect(store.writes).toEqual([]);
    expect(store.current.name).toBe('Edited elsewhere');
  });
  it('retries a create transaction after a concurrent create without replacing it', async () => {
    store.retryWith = { ...draft, studioCreateId: 'operation', name: 'Concurrent edit' };
    await createProjectIfAbsent({} as any, ref, draft, 'operation');
    expect(store.writes).toEqual([]);
    expect(store.current.name).toBe('Concurrent edit');
  });
  it('refuses an existing mismatched owner or type', async () => {
    for (const current of [{ ...draft, userId: 'other' }, { ...draft, type: 'workflow' }, { ...draft }, { ...draft, studioCreateId: 'different' }]) {
      store.current = current;
      await expect(createProjectIfAbsent({} as any, ref, draft, 'operation')).rejects.toThrow();
      expect(store.writes).toEqual([]);
    }
  });
  it('updates only workflow stage, never publication status', async () => {
    store.current = { ...draft, status: 'Draft' };
    await updateStudioStage({} as any, ref, 'owner', 'complete');
    expect(store.writes).toEqual([{ type: 'update', value: { studioStage: 'complete', updatedAt: 'timestamp' } }]);
  });
  it('refuses legacy boolean publication, including a concurrent publish', async () => {
    store.current = { ...draft, published: true, studioStage: 'ideation' };
    await expect(updateStudioStage({} as any, ref, 'owner', 'production')).rejects.toThrow(/Published/);
    expect(store.writes).toEqual([]);
    store.current = draft;
    store.retryWith = { ...draft, published: true };
    await expect(updateStudioStage({} as any, ref, 'owner', 'production')).rejects.toThrow(/Published/);
    expect(store.writes).toEqual([]);
  });
  it('re-reads after contention and refuses a newly scheduled draft', async () => {
    store.current = draft;
    store.retryWith = { ...draft, scheduledDate: new Date(), autoPublish: false };
    await expect(updateStudioStage({} as any, ref, 'owner', 'production')).rejects.toThrow(/Calendar/);
    expect(store.writes).toEqual([]);
  });
  it('refuses scheduled, auto-publish, foreign, missing and non-content projects', async () => {
    for (const current of [{ ...draft, status: 'Scheduled' }, { ...draft, autoPublish: true }, { ...draft, userId: 'other' }, { ...draft, type: 'workflow' }, undefined]) {
      store.current = current;
      await expect(updateStudioStage({} as any, ref, 'owner', 'production')).rejects.toThrow();
      expect(store.writes).toEqual([]);
    }
  });
});

describe('Studio semantics', () => {
  it('gives actual published and scheduled status precedence over workflow stage', () => {
    expect(getPipelineColumn({ status: 'Published', studioStage: 'ideation' })).toBe('published');
    expect(getPipelineColumn({ status: 'Draft', published: true, studioStage: 'ideation', scheduledDate: new Date() })).toBe('published');
    expect(getPipelineColumn({ status: 'Draft', published: false })).toBe('ideation');
    expect(getPipelineColumn({ status: 'Scheduled', studioStage: 'complete' })).toBe('production');
    expect(getPipelineColumn({ status: 'Draft', studioStage: 'complete' })).toBe('production');
    expect(getPipelineColumn({ status: 'In Production' })).toBe('production');
    expect(getPipelineColumn({ status: 'Draft' })).toBe('ideation');
    for (const studioStage of ['unknown', 'published', 42, {}, []]) {
      expect(getPipelineColumn({ status: 'Draft', studioStage })).toBe('ideation');
      expect(getPipelineColumn({ status: 'In Production', studioStage })).toBe('production');
    }
    expect(isScheduleManaged({ status: 'Draft', scheduledDate: new Date() })).toBe(true);
  });
  it('maps only supported editor platform IDs and refuses unsupported templates', () => {
    for (const [source, expected] of [['Twitter', 'twitter'], ['TikTok', 'tiktok'], ['Instagram', 'instagram'], ['YouTube Shorts', 'youtube']]) {
      expect(makeProjectDraft('owner', { platform: source }, 'template').data.platform).toBe(expected);
    }
    expect(() => makeProjectDraft('owner', { platform: 'LinkedIn' }, 'template')).toThrow(/not supported/i);
    expect(() => makeProjectDraft('owner', { platform: 'Mystery' }, 'template')).toThrow(/not supported/i);
    expect(() => makeProjectDraft('owner', { platform: 'constructor' }, 'template')).toThrow(/not supported/i);
  });
});
