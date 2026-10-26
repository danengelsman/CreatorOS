import React from 'react';
import { motion } from 'motion/react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { getPlatformStyle, getPlatformIcon } from './calendarHelpers';

interface NewEventModalProps {
  showEventModal: boolean;
  selectedDate: Date | null;
  newEventTitle: string;
  setNewEventTitle: (title: string) => void;
  newEventBody: string;
  setNewEventBody: (body: string) => void;
  newEventPlatform: string;
  setNewEventPlatform: (platform: string) => void;
  newEventStatus: string;
  setNewEventStatus: (status: string) => void;
  onClose: () => void;
  onAddEvent: () => void;
}

export default function NewEventModal({
  showEventModal,
  selectedDate,
  newEventTitle,
  setNewEventTitle,
  newEventBody,
  setNewEventBody,
  newEventPlatform,
  setNewEventPlatform,
  newEventStatus,
  setNewEventStatus,
  onClose,
  onAddEvent,
}: NewEventModalProps) {
  if (!showEventModal || !selectedDate) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-[var(--bg-tertiary)] w-full max-w-md rounded-[28px] shadow-2xl overflow-hidden border border-[var(--separator)] p-6 space-y-5"
      >
        <div>
          <h3 className="text-[18px] font-bold tracking-tight text-[var(--label-primary)]">
            Schedule Content
          </h3>
          <p className="text-[13px] text-[var(--label-secondary)] mt-0.5">
            For {format(selectedDate, 'MMMM d, yyyy')}
          </p>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold tracking-wider text-[var(--label-secondary)] uppercase pl-1">
              Title / Hook
            </label>
            <input
              type="text"
              value={newEventTitle}
              onChange={(e) => setNewEventTitle(e.target.value)}
              placeholder="e.g. 5 AI tools that will save you 10 hours"
              className="w-full bg-[var(--bg-secondary)] border border-[var(--separator)]/40 rounded-xl px-4 py-2.5 text-[14px] outline-none text-[var(--label-primary)] focus:border-[var(--accent)] transition-colors"
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold tracking-wider text-[var(--label-secondary)] uppercase pl-1">
              Content Body / Script
            </label>
            <textarea
              value={newEventBody}
              onChange={(e) => setNewEventBody(e.target.value)}
              placeholder="Draft the narrative script, outline, or captions here..."
              className="w-full h-24 bg-[var(--bg-secondary)] border border-[var(--separator)]/40 rounded-xl px-4 py-2.5 text-[14px] outline-none text-[var(--label-primary)] focus:border-[var(--accent)] transition-colors resize-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold tracking-wider text-[var(--label-secondary)] uppercase pl-1">
              Target Platform
            </label>
            <div className="flex bg-[var(--bg-secondary)] p-1 rounded-xl gap-1">
              {['youtube', 'tiktok', 'instagram', 'twitter'].map((p) => {
                const active = newEventPlatform === p;
                const style = getPlatformStyle(p);
                return (
                  <div
                    key={p}
                    onClick={() => setNewEventPlatform(p)}
                    className={cn(
                      'flex-1 py-2 rounded-lg text-[12px] font-bold text-center transition-all cursor-pointer flex items-center justify-center gap-1 capitalize',
                      active
                        ? `${style.bg} ${style.text} shadow-sm border ${style.border}`
                        : 'text-[var(--label-secondary)] hover:text-[var(--label-primary)]',
                    )}
                  >
                    {getPlatformIcon(p, 13)}
                    <span className="hidden sm:inline">{style.name.split(' ')[0]}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold tracking-wider text-[var(--label-secondary)] uppercase pl-1">
              Publishing Status
            </label>
            <div className="flex bg-[var(--bg-secondary)] p-1 rounded-xl gap-1">
              {['Draft', 'Scheduled'].map((s) => (
                <div
                  key={s}
                  onClick={() => setNewEventStatus(s)}
                  className={cn(
                    'flex-1 py-2 rounded-lg text-[12px] font-bold text-center transition-all cursor-pointer',
                    newEventStatus === s
                      ? 'bg-[var(--bg-tertiary)] text-[var(--accent)] shadow-sm'
                      : 'text-[var(--label-secondary)]',
                  )}
                >
                  {s}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-2">
          <button
            onClick={onClose}
            className="flex-1 py-3.5 rounded-xl font-bold text-[14px] bg-[var(--bg-secondary)] hover:bg-[var(--bg-primary)] text-[var(--label-primary)] transition-colors border border-[var(--separator)]/30"
          >
            Cancel
          </button>
          <button
            onClick={onAddEvent}
            disabled={!newEventTitle}
            className="flex-1 py-3.5 rounded-xl font-bold text-[14px] bg-[var(--accent)] text-white hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            Confirm & Add
          </button>
        </div>
      </motion.div>
    </div>
  );
}
