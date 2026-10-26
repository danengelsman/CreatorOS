import React from 'react';
import { format } from 'date-fns';
import { ChevronLeft, ChevronRight, Flame } from 'lucide-react';
import { cn } from '@/lib/utils';
import { HeatmapMode } from './calendarTypes';

interface CalendarHeaderProps {
  currentDate: Date;
  dateFormat: string;
  heatmapMode: HeatmapMode;
  setHeatmapMode: (mode: HeatmapMode) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
}

export default function CalendarHeader({
  currentDate,
  dateFormat,
  heatmapMode,
  setHeatmapMode,
  onPrevMonth,
  onNextMonth,
}: CalendarHeaderProps) {
  return (
    <>
      {/* Calendar Header */}
      <div className="flex items-center justify-between p-6 border-b border-[var(--separator)] bg-[var(--bg-tertiary)]">
        <div>
          <h2 className="text-[20px] font-semibold tracking-tight text-[var(--label-primary)]">
            {format(currentDate, dateFormat)}
          </h2>
          <p className="text-[13px] text-[var(--label-secondary)] font-medium mt-1">
            Plan, visualize and trigger auto-publishing
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onPrevMonth}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-[var(--bg-secondary)] hover:bg-[var(--bg-primary)] transition-colors border border-[var(--separator)]/30 text-[var(--label-primary)]"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={onNextMonth}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-[var(--bg-secondary)] hover:bg-[var(--bg-primary)] transition-colors border border-[var(--separator)]/30 text-[var(--label-primary)]"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Heatmap Layer Control Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-6 py-3 border-b border-[var(--separator)] bg-[var(--bg-secondary)]/15">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 text-[12px] font-bold text-[var(--label-secondary)]">
            <Flame className="text-[var(--accent)]" size={15} />
            <span>Heatmap view:</span>
          </div>
          <div className="flex bg-[var(--bg-secondary)] border border-[var(--separator)]/40 rounded-lg p-0.5 text-[11px] font-bold">
            <button
              onClick={() => setHeatmapMode('off')}
              className={cn(
                'px-2.5 py-1 rounded-md transition-all cursor-pointer',
                heatmapMode === 'off'
                  ? 'bg-[var(--bg-tertiary)] text-[var(--label-primary)] shadow-sm'
                  : 'text-[var(--label-tertiary)] hover:text-[var(--label-secondary)]',
              )}
            >
              None
            </button>
            <button
              onClick={() => setHeatmapMode('volume')}
              className={cn(
                'px-2.5 py-1 rounded-md transition-all cursor-pointer',
                heatmapMode === 'volume'
                  ? 'bg-[var(--accent)] text-white shadow-sm'
                  : 'text-[var(--label-tertiary)] hover:text-[var(--label-secondary)]',
              )}
            >
              Density
            </button>
            <button
              onClick={() => setHeatmapMode('score')}
              className={cn(
                'px-2.5 py-1 rounded-md transition-all cursor-pointer',
                heatmapMode === 'score'
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'text-[var(--label-tertiary)] hover:text-[var(--label-secondary)]',
              )}
            >
              Content Score
            </button>
            <button
              onClick={() => setHeatmapMode('time')}
              className={cn(
                'px-2.5 py-1 rounded-md transition-all cursor-pointer',
                heatmapMode === 'time'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-[var(--label-tertiary)] hover:text-[var(--label-secondary)]',
              )}
            >
              Best Time to Post
            </button>
          </div>
        </div>

        {/* Dynamic Heatmap Legend */}
        {heatmapMode !== 'off' && (
          <div className="flex items-center gap-2 text-[10px] text-[var(--label-tertiary)] font-bold">
            <span>Low</span>
            <div className="flex gap-1">
              {heatmapMode === 'volume' && (
                <>
                  <div className="w-3.5 h-3.5 rounded bg-[var(--accent)]/[0.04] border border-[var(--accent)]/10" />
                  <div className="w-3.5 h-3.5 rounded bg-[var(--accent)]/[0.08] border border-[var(--accent)]/20" />
                  <div className="w-3.5 h-3.5 rounded bg-[var(--accent)]/[0.14] border border-[var(--accent)]/30" />
                  <div className="w-3.5 h-3.5 rounded bg-[var(--accent)]/[0.22] border border-[var(--accent)]" />
                </>
              )}
              {heatmapMode === 'score' && (
                <>
                  <div className="w-3.5 h-3.5 rounded bg-amber-500/[0.04] border border-amber-500/10" />
                  <div className="w-3.5 h-3.5 rounded bg-amber-500/[0.10] border border-amber-500/20" />
                  <div className="w-3.5 h-3.5 rounded bg-amber-500/[0.18] border border-amber-500/30" />
                  <div className="w-3.5 h-3.5 rounded bg-amber-500/[0.28] border border-amber-500" />
                </>
              )}
              {heatmapMode === 'time' && (
                <>
                  <div className="w-3.5 h-3.5 rounded bg-emerald-500/[0.03] border border-emerald-500/10" />
                  <div className="w-3.5 h-3.5 rounded bg-emerald-500/[0.07] border border-emerald-500/20" />
                  <div className="w-3.5 h-3.5 rounded bg-emerald-500/[0.12] border border-emerald-500/30" />
                  <div className="w-3.5 h-3.5 rounded bg-emerald-500/40 border border-emerald-500" />
                </>
              )}
            </div>
            <span>High</span>
          </div>
        )}
      </div>
    </>
  );
}
