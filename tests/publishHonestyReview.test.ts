import { expect, it, vi } from 'vitest';
import {
  scheduleProject,
  unscheduleProject,
  correctRecordedPublication,
} from '../src/components/calendar/calendarPersistence';

let current: any;
const fence = vi.fn();
const tx = {
  get: vi.fn(async () => ({ exists: () => !!current, data: () => current })),
  update: vi.fn(),
};
vi.mock('../src/components/studio/studioOwnerFence', () => ({
  prepareStudioOwnerFence: async () => fence,
}));
vi.mock('firebase/firestore', () => ({
  serverTimestamp: () => 'timestamp',
  runTransaction: (_db: any, cb: any) => cb(tx),
}));
const db = {} as any;
const ref = { id: 'x' } as any;

it.each(['Draft', 'Production', 'Scheduled', ''])(
  'preserves status and historical auto-publish while planning %s',
  async (status) => {
    current = {
      userId: 'owner',
      type: 'content',
      status,
      autoPublish: true,
      data: { body: 'keep' },
    };
    tx.update.mockClear();
    fence.mockClear();
    await scheduleProject(db, ref, 'owner', current, {
      scheduledDate: new Date(123),
      publishTime: '12:00',
      autoPublish: false,
    });
    expect(tx.update).toHaveBeenCalledWith(ref, {
      scheduledDate: new Date(123),
      publishTime: '12:00',
      updatedAt: 'timestamp',
    });
    expect(fence).toHaveBeenCalled();
  },
);

it('does not fabricate Published for contradictory state when clearing scheduling', async () => {
  current = {
    userId: 'owner',
    type: 'content',
    status: 'Scheduled',
    published: true,
    autoPublish: true,
  };
  tx.update.mockClear();
  await unscheduleProject(db, ref, 'owner', current);
  expect(tx.update.mock.calls[0][1]).not.toHaveProperty('status');
});

it('corrects recorded publication explicitly without touching content or schedule and uses fence', async () => {
  current = {
    userId: 'owner',
    type: 'content',
    status: 'Published',
    published: true,
    data: { body: 'keep' },
    scheduledDate: new Date(123),
  };
  tx.update.mockClear();
  fence.mockClear();
  await correctRecordedPublication(db, ref, 'owner', current);
  expect(fence).toHaveBeenCalled();
  expect(tx.update).toHaveBeenCalledWith(ref, {
    status: 'Draft',
    published: false,
    updatedAt: 'timestamp',
  });
});

it('rejects clearing when an absent publication field changed after confirmation', async () => {
  current = {
    userId: 'owner',
    type: 'content',
    status: 'Scheduled',
    published: true,
    autoPublish: true,
  };
  tx.update.mockClear();
  await expect(
    unscheduleProject(db, ref, 'owner', { status: 'Scheduled', autoPublish: true }),
  ).rejects.toThrow('recorded status changed');
  expect(tx.update).not.toHaveBeenCalled();
});

it('rejects stale and foreign correction without writes', async () => {
  current = { userId: 'owner', type: 'content', status: 'Published', published: true };
  tx.update.mockClear();
  await expect(correctRecordedPublication(db, ref, 'other', current)).rejects.toThrow();
  await expect(
    correctRecordedPublication(db, ref, 'owner', { ...current, published: false }),
  ).rejects.toThrow();
  expect(tx.update).not.toHaveBeenCalled();
});
