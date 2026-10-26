import { describe, it, expect } from 'vitest';
import {
  getPlatformStyle,
  getHeatmapClass,
  isAutoPublished,
} from '../src/components/calendar/calendarHelpers';

describe('CalendarView modular architecture (F5.4)', () => {
  it('returns appropriate styles for all social platforms', () => {
    const youtube = getPlatformStyle('youtube');
    expect(youtube.name).toBe('YouTube');
    expect(youtube.accent).toBe('#FF0000');

    const tiktok = getPlatformStyle('tiktok');
    expect(tiktok.name).toBe('TikTok');

    const instagram = getPlatformStyle('instagram');
    expect(instagram.name).toBe('Instagram');

    const twitter = getPlatformStyle('twitter');
    expect(twitter.name).toBe('X (Twitter)');

    const fallback = getPlatformStyle('unknown');
    expect(fallback.name).toBe('unknown');
  });

  it('calculates heatmap classes correctly', () => {
    const monthStart = new Date(2026, 9, 1);
    const day = new Date(2026, 9, 15);

    expect(getHeatmapClass(day, [], 'off', monthStart)).toBe('');

    const events = [
      { id: '1', name: 'Draft 1' },
      { id: '2', name: 'Draft 2' },
    ];
    expect(getHeatmapClass(day, events, 'volume', monthStart)).toBe('bg-[var(--accent)]/[0.08]');

    // Heatmap mode time
    const tuesday = new Date(2026, 9, 13); // Tuesday = day 2
    expect(getHeatmapClass(tuesday, [], 'time', monthStart)).toBe('bg-emerald-500/20');
  });

  it('determines auto-published state accurately', () => {
    const pastDate = new Date(Date.now() - 10000);
    const futureDate = new Date(Date.now() + 100000);

    expect(
      isAutoPublished({
        id: '1',
        scheduledDate: pastDate,
        autoPublish: true,
      }),
    ).toBe(true);

    expect(
      isAutoPublished({
        id: '2',
        scheduledDate: futureDate,
        autoPublish: true,
      }),
    ).toBe(false);

    expect(
      isAutoPublished({
        id: '3',
        status: 'published',
      }),
    ).toBe(true);
  });
});
