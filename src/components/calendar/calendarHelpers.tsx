import React from 'react';
import { Youtube, Instagram, Twitter, Smartphone, Video } from 'lucide-react';
import { isSameMonth } from 'date-fns';
import { PlatformStyle, HeatmapMode, CalendarBlock } from './calendarTypes';

export const getPlatformStyle = (platform?: string): PlatformStyle => {
  const p = platform?.toLowerCase() || '';
  if (p === 'youtube') {
    return {
      bg: 'bg-[#FF0000]/10 dark:bg-[#FF0000]/15 hover:bg-[#FF0000]/20',
      border: 'border-[#FF0000]/30',
      text: 'text-[#FF0000]',
      solidBg: 'bg-[#FF0000]',
      solidText: 'text-white',
      name: 'YouTube',
      accent: '#FF0000',
    };
  } else if (p === 'tiktok') {
    return {
      bg: 'bg-zinc-900/10 dark:bg-zinc-100/10 hover:bg-zinc-900/15 border-zinc-700',
      border: 'border-zinc-500/30 dark:border-zinc-400/30',
      text: 'text-zinc-900 dark:text-zinc-100',
      solidBg: 'bg-black dark:bg-white',
      solidText: 'text-white dark:text-black',
      name: 'TikTok',
      accent: '#010101',
    };
  } else if (p === 'instagram') {
    return {
      bg: 'bg-gradient-to-r from-[#833AB4]/5 via-[#FD1D1D]/5 to-[#F56040]/5 hover:opacity-90',
      border: 'border-[#E1306C]/30',
      text: 'text-[#E1306C]',
      solidBg: 'bg-gradient-to-tr from-[#F56040] via-[#FD1D1D] to-[#833AB4]',
      solidText: 'text-white',
      name: 'Instagram',
      accent: '#E1306C',
    };
  } else if (p === 'twitter' || p === 'x') {
    return {
      bg: 'bg-sky-500/10 hover:bg-sky-500/15',
      border: 'border-sky-500/30',
      text: 'text-sky-500 dark:text-sky-400',
      solidBg: 'bg-sky-500',
      solidText: 'text-white',
      name: 'X (Twitter)',
      accent: '#1DA1F2',
    };
  } else {
    return {
      bg: 'bg-indigo-500/10 hover:bg-indigo-500/15',
      border: 'border-indigo-500/30',
      text: 'text-indigo-500',
      solidBg: 'bg-indigo-500',
      solidText: 'text-white',
      name: platform || 'Other',
      accent: '#6366f1',
    };
  }
};

export const getPlatformIcon = (platform?: string, size = 16) => {
  const p = platform?.toLowerCase() || '';
  switch (p) {
    case 'youtube':
      return <Youtube size={size} />;
    case 'instagram':
      return <Instagram size={size} />;
    case 'twitter':
    case 'x':
      return <Twitter size={size} />;
    case 'tiktok':
      return <Smartphone size={size} />;
    default:
      return <Video size={size} />;
  }
};

export const getHeatmapClass = (
  day: Date,
  dayEvents: CalendarBlock[],
  heatmapMode: HeatmapMode,
  monthStart: Date,
): string => {
  if (heatmapMode === 'off') return '';
  const inMonth = isSameMonth(day, monthStart);
  if (!inMonth) return '';

  if (heatmapMode === 'volume') {
    const count = dayEvents.length;
    if (count === 0) return '';
    if (count === 1) return 'bg-[var(--accent)]/[0.04]';
    if (count === 2) return 'bg-[var(--accent)]/[0.08]';
    if (count === 3) return 'bg-[var(--accent)]/[0.14]';
    return 'bg-[var(--accent)]/[0.22]';
  }

  if (heatmapMode === 'score') {
    const scores = dayEvents.map((e) => e.data?.score || 0).filter((s) => s > 0);
    if (scores.length === 0) return '';
    const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    if (avgScore >= 80) return 'bg-amber-500/[0.28]';
    if (avgScore >= 65) return 'bg-amber-500/[0.18]';
    if (avgScore >= 50) return 'bg-amber-500/[0.10]';
    return 'bg-amber-500/[0.04]';
  }

  if (heatmapMode === 'time') {
    const dayOfWeek = day.getDay();
    if (dayOfWeek === 2 || dayOfWeek === 4) {
      return 'bg-emerald-500/20';
    } else if (dayOfWeek === 0 || dayOfWeek === 6) {
      return 'bg-emerald-500/[0.03]';
    } else {
      return 'bg-emerald-500/[0.07]';
    }
  }

  return '';
};

export const isAutoPublished = (event: CalendarBlock): boolean => {
  return (
    event.published === true ||
    event.status === 'published' ||
    (event.autoPublish && event.scheduledDate && new Date(event.scheduledDate) <= new Date())
  );
};
