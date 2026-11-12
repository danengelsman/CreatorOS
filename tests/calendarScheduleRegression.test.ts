import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import EventDetailModal from '../src/components/calendar/EventDetailModal';
import AutoPublishModal from '../src/components/calendar/AutoPublishModal';
import CalendarGrid from '../src/components/calendar/CalendarGrid';
import NewEventModal from '../src/components/calendar/NewEventModal';
import CalendarHeader from '../src/components/calendar/CalendarHeader';
import { scheduleProject, unscheduleProject } from '../src/components/calendar/calendarPersistence';

vi.mock('../src/firebase', () => ({ db: {}, auth: { currentUser: { uid: 'owner' } } }));

vi.mock('@/lib/utils', () => ({ cn: (...args: any[]) => args.filter(Boolean).join(' ') }));
// The detail shell is under test here; extracted panels have their own tests.
vi.mock('../src/components/calendar/ReformatPanel', () => ({ default: () => null }));
vi.mock('../src/components/studio/studioOwnerFence', () => ({
  prepareStudioOwnerFence: async () => () => {},
}));
vi.mock('firebase/firestore', () => ({
  serverTimestamp: () => 'timestamp',
  runTransaction: (_db: any, callback: any) => callback(transaction),
}));
let current: any;
const transaction = {
  get: vi.fn(async () => ({ exists: () => !!current, data: () => current })),
  update: vi.fn(),
};

const props: any = {
  user: { uid: 'owner' },
  onSaved: vi.fn(),
  showDetailModal: true,
  connectedAccounts: [],
  selectedSyncPlatforms: [],
  setSelectedSyncPlatforms: vi.fn(),
  isSyncing: false,
  syncError: '',
  syncResults: null,
  selectedTargetPlatforms: [],
  setSelectedTargetPlatforms: vi.fn(),
  isGeneratingReformat: false,
  reformatError: '',
  reformatSuggestions: [],
  onClose: vi.fn(),
  onSyncToPlatforms: vi.fn(),
  onGenerateAIReformat: vi.fn(),
  onSaveAIBlock: vi.fn(),
  onDeleteEvent: vi.fn(),
  onUnschedule: vi.fn(),
  onGoToProfile: vi.fn(),
};

it.each([{ status: 'Scheduled' }, { status: 'Draft', autoPublish: true }])(
  'offers schedule removal for a dateless locked item %#',
  (data) => {
    const html = renderToStaticMarkup(
      React.createElement(EventDetailModal, {
        ...props,
        selectedEvent: { id: 'x', userId: 'owner', ...data },
      }),
    );
    expect(html).toContain('Clear scheduling');
  },
);

it('invokes the detail action for a dateless scheduled item', () => {
  const event = { id: 'x', userId: 'owner', status: 'Scheduled' };
  const onUnschedule = vi.fn();
  const tree = EventDetailModal({ ...props, selectedEvent: event, onUnschedule });
  const findButton = (node: any): any => {
    if (!React.isValidElement(node)) return undefined;
    const element = node as React.ReactElement<any>;
    if (element.type === 'button' && element.props.children === 'Clear scheduling') return element;
    for (const child of React.Children.toArray(element.props.children)) {
      const result = findButton(child);
      if (result) return result;
    }
  };
  const button = findButton(tree);
  expect(button).toBeTruthy();
  button.props.onClick();
  expect(onUnschedule).toHaveBeenCalledWith(event);
});

it('uses current transaction status rather than a stale event, preserving publication', async () => {
  current = {
    userId: 'owner',
    type: 'content',
    status: 'Published',
    scheduledDate: new Date(123),
    autoPublish: true,
  };
  transaction.update.mockClear();
  await unscheduleProject({} as any, { id: 'x' } as any, 'owner', {
    ...current,
    scheduledDate: new Date(123),
    autoPublish: true,
  });
  expect(transaction.update).toHaveBeenCalledWith(
    { id: 'x' },
    { scheduledDate: null, autoPublish: false, updatedAt: 'timestamp' },
  );
});

it('resets only Scheduled status and rejects a different owner', async () => {
  current = { userId: 'owner', type: 'content', status: 'Scheduled', autoPublish: true };
  transaction.update.mockClear();
  await unscheduleProject({} as any, { id: 'x' } as any, 'owner', {
    ...current,
    autoPublish: true,
  });
  expect(transaction.update.mock.calls[0][1]).toMatchObject({
    status: 'Draft',
    autoPublish: false,
    scheduledDate: null,
  });
  transaction.update.mockClear();
  await expect(
    unscheduleProject({} as any, { id: 'x' } as any, 'other', { ...current, autoPublish: true }),
  ).rejects.toThrow();
  expect(transaction.update).not.toHaveBeenCalled();
});

it('does not clear a schedule when only its publish time changed', async () => {
  current = {
    userId: 'owner',
    type: 'content',
    status: 'Scheduled',
    scheduledDate: new Date(123),
    autoPublish: true,
    publishTime: '14:00',
  };
  transaction.update.mockClear();
  await expect(
    unscheduleProject({} as any, { id: 'x' } as any, 'owner', {
      ...current,
      scheduledDate: new Date(123),
      autoPublish: true,
      publishTime: '12:00',
    }),
  ).rejects.toThrow('Scheduling changed');
  expect(transaction.update).not.toHaveBeenCalled();
});

it.each([
  { status: 'Published', scheduledDate: null, autoPublish: false, publishTime: null },
  { status: 'Draft', scheduledDate: new Date(456), autoPublish: false, publishTime: null },
  { status: 'Draft', scheduledDate: null, autoPublish: true, publishTime: null },
  { status: 'Draft', scheduledDate: null, autoPublish: false, publishTime: '14:00' },
])('rejects published or concurrently modified schedule %#', async (changes) => {
  current = { userId: 'owner', type: 'content', ...changes };
  transaction.update.mockClear();
  await expect(
    scheduleProject(
      {} as any,
      { id: 'x' } as any,
      'owner',
      { scheduledDate: null, autoPublish: false, status: 'Draft' },
      { scheduledDate: new Date(789), publishTime: '12:00', autoPublish: true },
    ),
  ).rejects.toThrow();
  expect(transaction.update).not.toHaveBeenCalled();
});

it('schedules unchanged draft through the transaction', async () => {
  current = { userId: 'owner', type: 'content', status: 'Draft', scheduledDate: null };
  transaction.update.mockClear();
  await scheduleProject(
    {} as any,
    { id: 'x' } as any,
    'owner',
    { scheduledDate: null, status: 'Draft' },
    { scheduledDate: new Date(789), publishTime: '12:00', autoPublish: true },
  );
  expect(transaction.update).toHaveBeenCalledWith(
    { id: 'x' },
    {
      scheduledDate: new Date(789),
      publishTime: '12:00',
      updatedAt: 'timestamp',
    },
  );
});

it('preserves published state and publish time when unscheduling a published Scheduled project', async () => {
  current = {
    userId: 'owner',
    type: 'content',
    status: 'Scheduled',
    published: true,
    scheduledDate: new Date(123),
    autoPublish: true,
    publishTime: '14:00',
  };
  transaction.update.mockClear();
  await unscheduleProject({} as any, { id: 'x' } as any, 'owner', {
    ...current,
    scheduledDate: new Date(123),
    autoPublish: true,
    publishTime: '14:00',
  });
  expect(transaction.update).toHaveBeenCalledWith(
    { id: 'x' },
    { scheduledDate: null, autoPublish: false, updatedAt: 'timestamp' },
  );
});

it.each(['Scheduled', 'Draft', ''])(
  'preserves contradictory recorded status %s on unschedule',
  async (status) => {
    current = { userId: 'owner', type: 'content', status, published: true, autoPublish: true };
    transaction.update.mockClear();
    await unscheduleProject({} as any, { id: 'x' } as any, 'owner', {
      ...current,
      autoPublish: true,
    });
    expect(transaction.update.mock.calls[0][1]).toMatchObject({
      autoPublish: false,
      scheduledDate: null,
    });
    expect(transaction.update.mock.calls[0][1]).not.toHaveProperty('status');
  },
);

it('preserves published status without a boolean flag', async () => {
  current = { userId: 'owner', type: 'content', status: ' published ', autoPublish: true };
  transaction.update.mockClear();
  await unscheduleProject({} as any, { id: 'x' } as any, 'owner', {
    ...current,
    autoPublish: true,
  });
  expect(transaction.update.mock.calls[0][1]).not.toHaveProperty('status');
});

it('rejects scheduling when the publication flag contradicts draft status', async () => {
  current = { userId: 'owner', type: 'content', status: 'Draft', published: true };
  transaction.update.mockClear();
  await expect(
    scheduleProject(
      {} as any,
      { id: 'x' } as any,
      'owner',
      { status: 'Draft' },
      { scheduledDate: new Date(789), publishTime: '12:00', autoPublish: false },
    ),
  ).rejects.toThrow();
  expect(transaction.update).not.toHaveBeenCalled();
});

it('disables schedule time and confirmation while saving', () => {
  const html = renderToStaticMarkup(
    React.createElement(AutoPublishModal, {
      showAutoPublishModal: true,
      draggedBlock: { id: 'x' },
      selectedDate: null,
      publishTime: '12:00',
      setPublishTime: vi.fn(),
      error: '',
      isScheduling: true,
      onClose: vi.fn(),
      onConfirm: vi.fn(),
    }),
  );
  expect(html).toMatch(/<input[^>]*type="time"[^>]*disabled/);
  expect(html).toMatch(
    /<button[^>]*disabled[^>]*class="flex-1 py-3.5 rounded-xl font-bold text-\[14px\] bg-\[var\(--accent\)\]/,
  );
});

it('does not clear a newer schedule selected concurrently', async () => {
  current = {
    userId: 'owner',
    type: 'content',
    status: 'Scheduled',
    scheduledDate: new Date(456),
    autoPublish: true,
  };
  transaction.update.mockClear();
  await expect(
    unscheduleProject({} as any, { id: 'x' } as any, 'owner', {
      ...current,
      scheduledDate: new Date(123),
      autoPublish: true,
    }),
  ).rejects.toThrow('Scheduling changed');
  expect(transaction.update).not.toHaveBeenCalled();
});

it.each([true, false])(
  'renders legacy scheduled autoPublish=%s as a manual plan',
  (autoPublish) => {
    const date = new Date(2020, 0, 1);
    const event = {
      id: 'x',
      userId: 'owner',
      status: 'Scheduled',
      scheduledDate: date,
      autoPublish,
    };
    const detail = renderToStaticMarkup(
      React.createElement(EventDetailModal, { ...props, selectedEvent: event }),
    );
    const grid = renderToStaticMarkup(
      React.createElement(CalendarGrid, {
        days: [date],
        monthStart: date,
        scheduledEvents: [event],
        heatmapMode: 'off',
        onSelectDay: vi.fn(),
        onDragOver: vi.fn(),
        onDragLeave: vi.fn(),
        onDropOnDay: vi.fn(),
        onSelectEvent: vi.fn(),
      }),
    );
    expect(detail).toContain('Publish directly');
    expect(detail).not.toMatch(
      /Successfully Auto-Published|Linked to Auto-Publish|went live automatically|Automatic API integration|>Live</,
    );
    expect(grid).not.toMatch(/Auto-Published|Auto-Publish|>Published</);
  },
);
it.each([{ status: 'Published' }, { published: true }])(
  'renders explicit publication without claiming automation %#',
  (signal) => {
    const date = new Date(2020, 0, 1);
    const event = { id: 'x', userId: 'owner', scheduledDate: date, ...signal };
    const detail = renderToStaticMarkup(
      React.createElement(EventDetailModal, { ...props, selectedEvent: event }),
    );
    const grid = renderToStaticMarkup(
      React.createElement(CalendarGrid, {
        days: [date],
        monthStart: date,
        scheduledEvents: [event],
        heatmapMode: 'off',
        onSelectDay: vi.fn(),
        onDragOver: vi.fn(),
        onDragLeave: vi.fn(),
        onDropOnDay: vi.fn(),
        onSelectEvent: vi.fn(),
      }),
    );
    expect(detail).toContain('Published');
    expect(grid).toContain('Published');
    expect(detail + grid).not.toMatch(/Auto-Published|went live automatically/);
  },
);
it.each([[[]], [[{ platform: 'youtube', profile: { name: 'test' } }]]])(
  'shows unavailable publishing regardless of connection',
  (connectedAccounts) => {
    const html = renderToStaticMarkup(
      React.createElement(EventDetailModal, {
        ...props,
        connectedAccounts,
        selectedEvent: { id: 'x', userId: 'owner' },
      }),
    );
    expect(html).toContain('Publishing from CreatorOS is not available');
    expect(html).not.toMatch(/unlock instant publishing|Instantly push/);
    expect(html).not.toContain('Sync to Platforms');
  },
);
it('explains manual scheduling in creation, drag modal and header', () => {
  const modal = renderToStaticMarkup(
    React.createElement(AutoPublishModal, {
      showAutoPublishModal: true,
      draggedBlock: { id: 'x' },
      selectedDate: new Date(2030, 0, 1),
      publishTime: '12:00',
      setPublishTime: vi.fn(),
      error: '',
      isScheduling: false,
      onClose: vi.fn(),
      onConfirm: vi.fn(),
    }),
  );
  const creation = renderToStaticMarkup(
    React.createElement(NewEventModal, {
      showEventModal: true,
      selectedDate: new Date(2030, 0, 1),
      newEventTitle: '',
      setNewEventTitle: vi.fn(),
      newEventBody: '',
      setNewEventBody: vi.fn(),
      newEventPlatform: 'youtube',
      setNewEventPlatform: vi.fn(),
      newEventStatus: 'Scheduled',
      setNewEventStatus: vi.fn(),
      onClose: vi.fn(),
      onAddEvent: vi.fn(),
    }),
  );
  const header = renderToStaticMarkup(
    React.createElement(CalendarHeader, {
      currentDate: new Date(2030, 0, 1),
      dateFormat: 'MMMM yyyy',
      heatmapMode: 'off',
      setHeatmapMode: vi.fn(),
      onPrevMonth: vi.fn(),
      onNextMonth: vi.fn(),
    }),
  );
  expect(modal).toContain('Publish directly');
  expect(creation).toContain('Publish directly');
  expect(modal + header).not.toMatch(
    /Enable Auto-Publish|automated posting|trigger auto-publishing/,
  );
});
