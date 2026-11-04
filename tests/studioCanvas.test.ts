import { describe, expect, it } from 'vitest';
import { canAddRecoveryWrite, recoveryPendingWrites, projectDraft, projectBaseline, sameBaseline, sameDraft, studioUpdate, trustedServerSnapshot } from '../src/components/studio/studioDraft';

describe('project canvas draft safety', () => {
  it('reads the existing editor fields without losing fallback names', () => {
    expect(projectDraft({ name: 'My project', data: { body: 'Draft', other: 1 } })).toEqual({
      title: 'My project',
      body: 'Draft',
      platform: 'youtube',
    });
  });

  it('detects remote changes to editor fields', () => {
    const original = projectDraft({ name: 'Title', data: { body: 'one' } });
    expect(sameDraft(original, projectDraft({ name: 'Title', data: { body: 'two' } }))).toBe(false);
    expect(
      sameDraft(
        original,
        projectDraft({ name: 'Title', data: { body: 'one', unrelated: 'changed' } }),
      ),
    ).toBe(true);
  });

  it('detects concurrent top-level renames even when the editor title is unchanged', () => {
    const before = projectBaseline({ name: 'Old name', data: { title: 'Title', body: 'one' } });
    const after = projectBaseline({ name: 'New name', data: { title: 'Title', body: 'one' } });
    expect(sameBaseline(before, after)).toBe(false);
    expect(sameBaseline(before, before)).toBe(true);
    expect(sameBaseline({ title: 'Title', body: 'one', platform: 'youtube' }, before)).toBe(false);
  });

  it('retains complete or previously pruned pending history without trusting snapshots', () => {
    const a = { title: 'Title', body: 'A', platform: 'youtube' };
    const b = { ...a, body: 'B' };
    expect(recoveryPendingWrites({draft:a,pendingWrites:[a,b,a]})).toEqual([a,b,a]);
    expect(recoveryPendingWrites({draft:a,pendingWrites:[b]})).toEqual([b]);
    expect(recoveryPendingWrites({draft:a,pending:a})).toEqual([a]);
    expect(recoveryPendingWrites({draft:a,pendingWrites:[null]})).toEqual([a]);
    expect(recoveryPendingWrites({draft:a})).toEqual([]);
  });

  it('requires explicit server and no-pending-writes metadata', () => {
    expect(trustedServerSnapshot({metadata:{fromCache:false,hasPendingWrites:false}})).toBe(true);
    expect(trustedServerSnapshot({metadata:{fromCache:true,hasPendingWrites:false}})).toBe(false);
    expect(trustedServerSnapshot({metadata:{fromCache:false,hasPendingWrites:true}})).toBe(false);
    expect(trustedServerSnapshot({metadata:{fromCache:false}})).toBe(false);
    expect(trustedServerSnapshot({})).toBe(false);
  });

  it('bounds new recovery entries by count and serialized size without mutating history', () => {
    const draft = { title: 'Title', body: 'text', platform: 'youtube' };
    const history = Array.from({ length: 10 }, () => draft);
    expect(canAddRecoveryWrite(history.slice(0, 9), draft)).toBe(true);
    expect(canAddRecoveryWrite(history, draft)).toBe(false);
    expect(history).toHaveLength(10);
    expect(canAddRecoveryWrite([], { ...draft, body: 'x'.repeat(512 * 1024) })).toBe(false);
  });

  it('updates only editor data fields, preserving unrelated nested data and existing score', () => {
    expect(studioUpdate({ title: 'T', body: 'B', platform: 'youtube' })).toEqual({
      name: 'T',
      'data.title': 'T',
      'data.body': 'B',
      'data.platform': 'youtube',
    });
    expect(studioUpdate({ title: '', body: 'B', platform: 'youtube' }, 0)['data.score']).toBe(0);
  });
});
