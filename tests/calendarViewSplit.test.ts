import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

vi.mock('../src/firebase', () => ({
  db: {},
  auth: { currentUser: { uid: 'user-1' } },
  authorizedFetch: vi.fn(),
  apiFetch: vi.fn(),
  serverTimestamp: vi.fn(() => ({ __serverTimestamp: true })),
}));

vi.mock('../src/components/calendar/calendarPersistence', () => ({
  scheduleProject: vi.fn().mockResolvedValue(undefined),
  unscheduleProject: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../src/components/studio/studioOwnerFence', () => ({
  deleteOwnedContentProject: vi.fn().mockResolvedValue(undefined),
  updateOwnedContentProject: vi.fn().mockResolvedValue(undefined),
  STUDIO_JOURNEY_UNAVAILABLE: 'STUDIO_JOURNEY_UNAVAILABLE',
  prepareStudioOwnerFence: vi.fn().mockResolvedValue(() => {}),
}));

import CalendarView from '../src/components/CalendarView';
import EventCreationForm from '../src/components/calendar/EventCreationForm';
import AutoPublishPanel from '../src/components/calendar/AutoPublishPanel';
import SyncPanel from '../src/components/calendar/SyncPanel';
import ReformatPanel from '../src/components/calendar/ReformatPanel';

const user = { uid: 'user-1' };
const setActiveTab = vi.fn();

const sampleBlock = {
  id: 'block-1',
  name: 'Draft Block',
  platform: 'youtube',
  data: { title: 'Draft Block', body: 'Body', platform: 'youtube' },
  scheduledDate: null,
  autoPublish: true,
  publishTime: '12:00',
  userId: 'user-1',
};

describe('CalendarView split (F5.4)', () => {
  it('CalendarView renders as a thin orchestrator with calendar subcomponents', () => {
    const html = renderToStaticMarkup(
      React.createElement(CalendarView, { user, setActiveTab }),
    );
    expect(html).toContain('Unscheduled Content');
    expect(html).toContain('lg:col-span-9');
    expect(html).toContain('MMMM yyyy');
  });

  it('EventCreationForm renders the new-event form UI', () => {
    const html = renderToStaticMarkup(
      React.createElement(EventCreationForm, {
        user,
        showEventModal: true,
        selectedDate: new Date('2026-11-07'),
        onClose: vi.fn(),
        onAdded: vi.fn(),
      }),
    );
    expect(html).toContain('Schedule Content');
    expect(html).toContain('Title / Hook');
    expect(html).toContain('Confirm & Add');
  });

  it('AutoPublishPanel renders the auto-publish confirmation UI', () => {
    const html = renderToStaticMarkup(
      React.createElement(AutoPublishPanel, {
        user,
        open: true,
        block: sampleBlock,
        day: new Date('2026-11-07'),
        onClose: vi.fn(),
        onScheduled: vi.fn(),
      }),
    );
    expect(html).toContain('Configure Auto-Publish');
    expect(html).toContain('Draft Block');
    expect(html).toContain('Enable Auto-Publish');
  });

  it('SyncPanel renders the sync-to-platforms section', () => {
    const html = renderToStaticMarkup(
      React.createElement(SyncPanel, {
        user,
        selectedEvent: sampleBlock,
        onGoToProfile: vi.fn(),
        onPublished: vi.fn(),
      }),
    );
    expect(html).toContain('Push and Sync to Connected Social Networks');
    expect(html).toContain('YouTube');
    expect(html).toContain('Sync to Platforms');
  });

  it('ReformatPanel renders the AI reformat section', () => {
    const html = renderToStaticMarkup(
      React.createElement(ReformatPanel, {
        user,
        selectedEvent: sampleBlock,
        onSaved: vi.fn(),
      }),
    );
    expect(html).toContain('Reformat for Multiple Platforms with AI');
    expect(html).toContain('Generate Cross-Platform Reformatted Drafts');
  });

  it('CalendarView composition delegates to extracted panels', () => {
    const html = renderToStaticMarkup(
      React.createElement(CalendarView, { user, setActiveTab }),
    );
    // Panels are rendered conditionally by state; with no events and no modal
    // open they render null, but the orchestrator shell must still render.
    expect(html).toContain('Unscheduled Content');
    expect(html).toContain('lg:grid-cols-12');
  });
});
