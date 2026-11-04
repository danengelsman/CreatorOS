import React from 'react';
import { beforeEach, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({
  slots: [] as any[],
  index: 0,
  update: vi.fn(),
  fetch: vi.fn(),
  publish: vi.fn(),
  current: null as any,
  transactionWait: null as Promise<void> | null,
}));
vi.mock('react', async (importOriginal) => {
  const real = await importOriginal<typeof import('react')>();
  return {
    ...real,
    useState: (initial: any) => {
      const i = h.index++;
      if (!(i in h.slots)) h.slots[i] = typeof initial === 'function' ? initial() : initial;
      return [
        h.slots[i],
        (next: any) => {
          h.slots[i] = typeof next === 'function' ? next(h.slots[i]) : next;
        },
      ];
    },
    useRef: (initial: any) => {
      const i = h.index++;
      return (h.slots[i] ??= { current: initial });
    },
    useEffect: () => {},
  };
});
vi.mock('../src/firebase', () => ({
  db: {},
  auth: { currentUser: { uid: 'owner' } },
  authorizedFetch: h.publish,
  apiFetch: vi.fn(),
}));
vi.mock('../src/components/studio/studioOwnerFence', () => ({
  STUDIO_JOURNEY_UNAVAILABLE: 'journey unavailable',
  prepareStudioOwnerFence: async () => () => {},
}));
vi.mock('firebase/firestore', () => ({
  collection: (...args: any[]) => args,
  query: (...args: any[]) => args,
  where: (...args: any[]) => args,
  getDocs: h.fetch,
  updateDoc: h.update,
  doc: (_db: any, collection: string, id: string) => ({ collection, id }),
  serverTimestamp: () => 'timestamp',
  addDoc: vi.fn(),
  deleteDoc: vi.fn(),
  runTransaction: async (_db: any, callback: any) => {
    const result = await callback({
      get: async () => ({ exists: () => true, data: () => h.current }),
      update: h.update,
    });
    if (h.transactionWait) await h.transactionWait;
    return result;
  },
}));
vi.mock('motion/react', () => ({ AnimatePresence: () => null }));
vi.mock('../src/components/calendar/UnscheduledSidebar', () => ({ default: () => null }));
vi.mock('../src/components/calendar/CalendarHeader', () => ({ default: () => null }));
vi.mock('../src/components/calendar/AutoPublishModal', () => ({
  default: function AutoPublishModal() {
    return null;
  },
}));
vi.mock('../src/components/calendar/NewEventModal', () => ({ default: () => null }));
vi.mock('../src/components/calendar/CalendarGrid', () => ({
  default: function CalendarGrid() {
    return null;
  },
}));
vi.mock('../src/components/calendar/EventDetailModal', () => ({
  default: function EventDetailModal() {
    return null;
  },
}));
import CalendarView from '../src/components/CalendarView';
import { isScheduleManaged } from '../src/components/studio/studioHubHelpers';

function find(node: any, name: string): any {
  if (!node || typeof node !== 'object') return undefined;
  if (node.type?.name === name) return node;
  for (const child of React.Children.toArray(node.props?.children)) {
    const result = find(child, name);
    if (result) return result;
  }
}

beforeEach(() => {
  h.slots = [];
  h.index = 0;
  h.transactionWait = null;
  h.publish
    .mockReset()
    .mockResolvedValue({ success: true, results: { youtube: { status: 'success' } } });
  h.update.mockReset().mockResolvedValue(undefined);
  h.fetch.mockReset().mockResolvedValue({ docs: [] });
});
it('unschedules through the calendar detail action and removes the Studio schedule lock', async () => {
  const render = () => {
    h.index = 0;
    return CalendarView({ user: { uid: 'owner' }, setActiveTab: vi.fn() });
  };
  const event = { id: 'abc', status: 'Scheduled', scheduledDate: new Date(), autoPublish: true };
  h.current = { ...event, userId: 'owner', type: 'content' };
  find(render(), 'CalendarGrid').props.onSelectEvent(event);
  const modal = find(render(), 'EventDetailModal');
  expect(modal).toBeTruthy();
  await modal.props.onUnschedule(event);
  expect(h.update).toHaveBeenCalledWith(
    { collection: 'projects', id: 'abc' },
    {
      scheduledDate: null,
      status: 'Draft',
      autoPublish: false,
      updatedAt: 'timestamp',
    },
  );
  expect(isScheduleManaged({ ...event, ...h.update.mock.calls[0][1] })).toBe(false);
  expect(h.fetch).toHaveBeenCalledTimes(1);
  expect(find(render(), 'EventDetailModal')).toBeUndefined();
});

it('updates calendar state only after the scheduling transaction commits', async () => {
  const event = {
    id: 'abc',
    status: 'Draft',
    scheduledDate: null,
    autoPublish: false,
    name: 'Draft',
  };
  h.current = { ...event, userId: 'owner', type: 'content' };
  let finish!: () => void;
  h.transactionWait = new Promise((resolve) => {
    finish = resolve;
  });
  const render = () => {
    h.index = 0;
    return CalendarView({ user: { uid: 'owner' }, setActiveTab: vi.fn() });
  };
  render();
  h.slots[2] = [event];
  h.slots[4] = [event];
  find(render(), 'CalendarGrid').props.onDropOnDay(new Date(2030, 0, 1), {
    preventDefault: vi.fn(),
    currentTarget: { classList: { remove: vi.fn() } },
    dataTransfer: { getData: () => 'abc' },
  });
  const pending = find(render(), 'AutoPublishModal').props.onConfirm();
  expect(h.slots[3]).toEqual([]);
  expect(h.slots[4]).toEqual([event]);
  finish();
  await pending;
  expect(h.slots[3][0].status).toBe('Draft');
  expect(h.slots[4]).toEqual([]);
});

it('leaves the calendar unchanged and shows an error when a dragged draft was published', async () => {
  const event = { id: 'abc', status: 'Draft', scheduledDate: null, autoPublish: false };
  h.current = { ...event, userId: 'owner', type: 'content', status: 'Published' };
  vi.spyOn(console, 'error').mockImplementation(() => {});
  const render = () => {
    h.index = 0;
    return CalendarView({ user: { uid: 'owner' }, setActiveTab: vi.fn() });
  };
  render();
  h.slots[2] = [event];
  h.slots[4] = [event];
  find(render(), 'CalendarGrid').props.onDropOnDay(new Date(2030, 0, 1), {
    preventDefault: vi.fn(),
    currentTarget: { classList: { remove: vi.fn() } },
    dataTransfer: { getData: () => 'abc' },
  });
  await find(render(), 'AutoPublishModal').props.onConfirm();
  expect(h.update).not.toHaveBeenCalled();
  expect(h.slots[3]).toEqual([]);
  expect(h.slots[4]).toEqual([event]);
  expect(find(render(), 'AutoPublishModal').props.error).toContain('published or changed');
});

it('marks a successful Calendar publish through an owner transaction, not updateDoc', async () => {
  const event = {
    id: 'abc',
    userId: 'owner',
    type: 'content',
    status: 'Draft',
    name: 'Owner title',
    data: { body: 'Owner draft' },
  };
  h.current = event;
  const render = () => {
    h.index = 0;
    return CalendarView({ user: { uid: 'owner' }, setActiveTab: vi.fn() });
  };
  find(render(), 'CalendarGrid').props.onSelectEvent(event);
  find(render(), 'EventDetailModal').props.setSelectedSyncPlatforms(['youtube']);
  // A foreign document must be rejected by the persistence transaction after publishing.
  h.current = { ...event, userId: 'other' };
  await find(render(), 'EventDetailModal').props.onSyncToPlatforms();
  expect(h.publish).toHaveBeenCalledWith(
    '/api/publish',
    expect.any(Object),
    expect.objectContaining({ uid: 'owner', isCurrent: expect.any(Function) }),
  );
  expect(h.update).not.toHaveBeenCalled();
});
