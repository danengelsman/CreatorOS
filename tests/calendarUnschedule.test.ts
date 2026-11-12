import React from 'react';
import { beforeEach, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({
  slots: [] as any[],
  index: 0,
  update: vi.fn(),
  directUpdate: vi.fn(),
  add: vi.fn(),
  set: vi.fn(),
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
      const slots = h.slots;
      if (!(i in slots)) slots[i] = typeof initial === 'function' ? initial() : initial;
      return [
        slots[i],
        (next: any) => {
          slots[i] = typeof next === 'function' ? next(slots[i]) : next;
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
  serverTimestamp: () => 'timestamp',
}));
vi.mock('@/lib/utils', async () => await import('../src/lib/utils'));
vi.mock('firebase/firestore', () => ({
  collection: (...args: any[]) => args,
  query: (...args: any[]) => args,
  where: (...args: any[]) => args,
  getDocs: h.fetch,
  updateDoc: h.directUpdate,
  doc: (_db: any, collection: string, id: string) => ({ collection, id }),
  serverTimestamp: () => 'timestamp',
  Timestamp: class Timestamp {},
  addDoc: h.add,
  deleteDoc: vi.fn(),
  runTransaction: async (_db: any, callback: any) => {
    const result = await callback({
      get: async (ref: any) =>
        ref.collection === 'first_dollar_journeys'
          ? { exists: () => false }
          : { exists: () => true, data: () => h.current },
      update: h.update,
      set: h.set,
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
import AutoPublishPanel from '../src/components/calendar/AutoPublishPanel';
import EventCreationForm from '../src/components/calendar/EventCreationForm';
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
  vi.stubGlobal('window', { confirm: vi.fn(() => true) });
  h.add.mockReset().mockResolvedValue({ id: 'new' });
  h.slots = [];
  h.index = 0;
  h.transactionWait = null;
  h.publish
    .mockReset()
    .mockResolvedValue({ success: true, results: { youtube: { status: 'success' } } });
  h.update.mockReset().mockResolvedValue(undefined);
  h.directUpdate.mockReset();
  h.set.mockReset();
  h.fetch.mockReset().mockResolvedValue({ docs: [] });
});
function renderChild(component: (props: any) => any, props: any, slots: any[]) {
  h.slots = slots;
  h.index = 0;
  return component(props);
}

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
  expect(h.set).toHaveBeenCalledWith(
    { collection: 'first_dollar_journeys', id: 'owner' },
    expect.objectContaining({ uid: 'owner' }),
  );
  expect(isScheduleManaged({ ...event, ...h.update.mock.calls[0][1] })).toBe(false);
  expect(h.fetch).toHaveBeenCalledTimes(1);
  expect(find(render(), 'EventDetailModal').props.showDetailModal).toBe(false);
});

it('updates calendar state only after the scheduling transaction commits', async () => {
  const event = {
    id: 'abc',
    userId: 'owner',
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
  const panelProps = find(render(), 'AutoPublishPanel').props;
  const parentSlots = h.slots;
  const panelSlots: any[] = [];
  const pending = renderChild(AutoPublishPanel, panelProps, panelSlots).props.onConfirm();
  expect(parentSlots[3]).toEqual([]);
  expect(parentSlots[4]).toEqual([event]);
  finish();
  await pending;
  expect(h.update).toHaveBeenCalledWith(
    { collection: 'projects', id: 'abc' },
    expect.objectContaining({
      publishTime: '12:00',
      scheduledDate: new Date(2030, 0, 1, 12),
    }),
  );
  expect(h.set).toHaveBeenCalledWith(
    { collection: 'first_dollar_journeys', id: 'owner' },
    expect.objectContaining({ uid: 'owner' }),
  );
  expect(parentSlots[3][0].status).toBe('Draft');
  expect(h.update.mock.calls[0][1]).not.toHaveProperty('status');
  expect(h.update.mock.calls[0][1]).not.toHaveProperty('autoPublish');
  expect(parentSlots[4]).toEqual([]);
});

it('leaves the calendar unchanged and shows an error when a dragged draft was published', async () => {
  const event = {
    id: 'abc',
    userId: 'owner',
    status: 'Draft',
    scheduledDate: null,
    autoPublish: false,
  };
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
  const panelProps = find(render(), 'AutoPublishPanel').props;
  const parentSlots = h.slots;
  const panelSlots: any[] = [];
  await renderChild(AutoPublishPanel, panelProps, panelSlots).props.onConfirm();
  expect(h.update).not.toHaveBeenCalled();
  expect(h.set).not.toHaveBeenCalled();
  expect(parentSlots[3]).toEqual([]);
  expect(parentSlots[4]).toEqual([event]);
  expect(renderChild(AutoPublishPanel, panelProps, panelSlots).props.error).toContain(
    'published or changed',
  );
});

it('does not expose publication dispatch or success callbacks from Calendar', () => {
  const render = () => {
    h.index = 0;
    return CalendarView({ user: { uid: 'owner' }, setActiveTab: vi.fn() });
  };
  find(render(), 'CalendarGrid').props.onSelectEvent({
    id: 'abc',
    userId: 'owner',
    status: 'Draft',
  });
  expect(find(render(), 'EventDetailModal').props.onPublished).toBeUndefined();
  expect(h.publish).not.toHaveBeenCalled();
  expect(h.update).not.toHaveBeenCalled();
});
it.each([true, false])(
  'planning preserves historical flag %s and unrelated status',
  async (autoPublish) => {
    const block = {
      id: 'abc',
      userId: 'owner',
      type: 'content',
      status: 'Production',
      autoPublish,
      publishTime: '12:00',
    };
    h.current = block;
    const scheduled = vi.fn();
    const props = {
      user: { uid: 'owner' },
      open: true,
      block,
      day: new Date(2030, 0, 1),
      onClose: vi.fn(),
      onScheduled: scheduled,
    };
    await renderChild(AutoPublishPanel, props, []).props.onConfirm();
    expect(h.update).toHaveBeenCalledWith(
      { collection: 'projects', id: 'abc' },
      { scheduledDate: new Date(2030, 0, 1, 12), publishTime: '12:00', updatedAt: 'timestamp' },
    );
    expect(scheduled).toHaveBeenCalledWith({ ...block, scheduledDate: new Date(2030, 0, 1, 12) });
    expect(h.directUpdate).not.toHaveBeenCalled();
  },
);
it('new scheduled event never enables automatic posting', async () => {
  const slots: any[] = [];
  const props = {
    user: { uid: 'owner' },
    showEventModal: true,
    selectedDate: new Date(2030, 0, 1),
    onClose: vi.fn(),
    onAdded: vi.fn(),
  };
  renderChild(EventCreationForm, props, slots).props.setNewEventTitle('New event');
  renderChild(EventCreationForm, props, slots).props.setNewEventStatus('Scheduled');
  await renderChild(EventCreationForm, props, slots).props.onAddEvent();
  expect(h.add).toHaveBeenCalledWith(
    expect.anything(),
    expect.objectContaining({ status: 'Scheduled', autoPublish: false }),
  );
});
