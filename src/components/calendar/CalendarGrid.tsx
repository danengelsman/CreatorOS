import React from 'react';
import { format, isSameMonth, isSameDay, isToday } from 'date-fns';
import { Plus, Clock, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CalendarBlock, HeatmapMode } from './calendarTypes';
import { getPlatformStyle, getHeatmapClass, isAutoPublished } from './calendarHelpers';

interface CalendarGridProps {
  days: Date[];
  monthStart: Date;
  scheduledEvents: CalendarBlock[];
  heatmapMode: HeatmapMode;
  onSelectDay: (day: Date) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDropOnDay: (day: Date, e: React.DragEvent) => void;
  onSelectEvent: (event: CalendarBlock) => void;
}

export default function CalendarGrid({
  days,
  monthStart,
  scheduledEvents,
  heatmapMode,
  onSelectDay,
  onDragOver,
  onDragLeave,
  onDropOnDay,
  onSelectEvent,
}: CalendarGridProps) {
  return (
    <>
      {/* Days of Week */}
      <div className="grid grid-cols-7 border-b border-[var(--separator)] bg-[var(--bg-secondary)]/50">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
          <div
            key={day}
            className="py-3 text-center text-[11px] font-bold tracking-wider uppercase text-[var(--label-secondary)]"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 grid grid-cols-7 grid-rows-5 bg-[var(--separator)]/30 gap-[1px]">
        {days.slice(0, 35).map((day) => {
          const dayEvents = scheduledEvents.filter((e) => isSameDay(e.scheduledDate, day));
          return (
            <div
              key={day.toString()}
              onClick={() => onSelectDay(day)}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={(e) => onDropOnDay(day, e)}
              className={cn(
                getHeatmapClass(day, dayEvents, heatmapMode, monthStart) ||
                  'bg-[var(--bg-tertiary)]',
                'min-h-[110px] p-2 hover:bg-[var(--bg-secondary)]/30 transition-colors cursor-pointer group flex flex-col gap-1.5 relative',
                !isSameMonth(day, monthStart) && 'opacity-30',
              )}
            >
              <div className="flex items-center justify-between">
                <span
                  className={cn(
                    'w-6 h-6 flex items-center justify-center rounded-full text-[12px] font-bold flex-shrink-0 text-[var(--label-primary)]',
                    isToday(day) ? 'bg-[var(--accent)] text-white shadow-sm' : '',
                  )}
                >
                  {format(day, 'd')}
                </span>
                {heatmapMode === 'off' && (
                  <Plus
                    size={12}
                    className="opacity-0 group-hover:opacity-100 text-[var(--label-tertiary)] transition-opacity"
                  />
                )}
                {heatmapMode === 'volume' && dayEvents.length > 0 && (
                  <span className="text-[9px] font-bold text-[var(--accent)] bg-[var(--accent)]/15 px-1.5 py-0.5 rounded-full">
                    {dayEvents.length}p
                  </span>
                )}
                {heatmapMode === 'score' && dayEvents.some((e) => (e.data?.score || 0) > 0) && (
                  <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/20 px-1.5 py-0.5 rounded-full">
                    {Math.round(
                      dayEvents.reduce((acc, e) => acc + (e.data?.score || 0), 0) /
                        dayEvents.filter((e) => (e.data?.score || 0) > 0).length,
                    )}
                    %
                  </span>
                )}
                {heatmapMode === 'time' && (
                  <span
                    className={cn(
                      'text-[8px] font-extrabold uppercase px-1 py-0.5 rounded',
                      day.getDay() === 2 || day.getDay() === 4
                        ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/20'
                        : 'text-emerald-500/80 bg-emerald-500/5',
                    )}
                  >
                    {day.getDay() === 2 || day.getDay() === 4 ? 'Peak' : 'Good'}
                  </span>
                )}
              </div>

              {/* Day events stack */}
              <div className="flex-1 overflow-y-auto space-y-1.5 no-scrollbar max-h-[85px]">
                {dayEvents.map((event) => {
                  const style = getPlatformStyle(event.platform || event.data?.platform);
                  const title = event.name || event.data?.title || 'Draft Content';
                  const isPublished = isAutoPublished(event);

                  return (
                    <div
                      key={event.id}
                      draggable
                      onDragStart={(e) => {
                        e.stopPropagation();
                        e.dataTransfer.setData('blockId', event.id);
                        e.dataTransfer.effectAllowed = 'move';
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectEvent(event);
                      }}
                      className={cn(
                        'group/item border rounded-xl px-2 py-1.5 text-[11px] font-bold flex flex-col gap-0.5 shadow-sm cursor-grab active:cursor-grabbing transition-all hover:scale-[1.01] bg-[var(--bg-secondary)]',
                        style.border,
                      )}
                    >
                      <div className="flex items-center justify-between gap-1.5">
                        <span
                          className={cn(
                            'text-[9px] px-1 py-0.5 rounded font-bold uppercase',
                            style.bg,
                            style.text,
                          )}
                        >
                          {style.name}
                        </span>
                        <span className="text-[8px] text-[var(--label-tertiary)] font-bold">
                          {event.publishTime || '12:00'}
                        </span>
                      </div>

                      <span className="truncate text-[11px] text-[var(--label-primary)] font-medium mt-0.5">
                        {title}
                      </span>

                      <div className="flex items-center justify-between gap-1 mt-1 border-t border-[var(--separator)]/20 pt-1 text-[8px] font-bold">
                        {isPublished ? (
                          <span className="text-emerald-500 flex items-center gap-0.5">
                            <CheckCircle size={8} /> Auto-Published
                          </span>
                        ) : event.autoPublish ? (
                          <span className="text-[var(--accent)] flex items-center gap-0.5">
                            <Clock size={8} /> Auto-Publish
                          </span>
                        ) : (
                          <span className="text-[var(--label-tertiary)]">Draft</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
