import React from 'react';
import { motion } from 'motion/react';
import { format } from 'date-fns';
import { X, CheckCircle, Clock, Trash2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { CalendarBlock } from './calendarTypes';
import { getPlatformStyle, isAutoPublished } from './calendarHelpers';
import { isScheduleManaged } from '../studio/studioHubHelpers';
import SyncPanel from './SyncPanel';
import ReformatPanel from './ReformatPanel';

interface EventDetailModalProps {
  showDetailModal: boolean;
  selectedEvent: CalendarBlock | null;
  user: any;
  onClose: () => void;
  onDeleteEvent: (id: string) => void;
  onUnschedule: (event: CalendarBlock) => void;
  scheduleError?: string;
  onGoToProfile: () => void;
  onPublished: () => void;
  onSaved: () => void;
}

export default function EventDetailModal({
  showDetailModal,
  selectedEvent,
  user,
  onClose,
  onDeleteEvent,
  onUnschedule,
  scheduleError,
  onGoToProfile,
  onPublished,
  onSaved,
}: EventDetailModalProps) {
  if (!showDetailModal || !selectedEvent) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-[var(--bg-tertiary)] w-full max-w-2xl rounded-[28px] shadow-2xl border border-[var(--separator)] overflow-hidden my-8"
      >
        {/* Header */}
        <div className="p-6 border-b border-[var(--separator)] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span
              className={cn(
                'text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full',
                getPlatformStyle(selectedEvent.platform || selectedEvent.data?.platform).bg,
                getPlatformStyle(selectedEvent.platform || selectedEvent.data?.platform).text,
              )}
            >
              {getPlatformStyle(selectedEvent.platform || selectedEvent.data?.platform).name}
            </span>
            <span className="text-[13px] text-[var(--label-secondary)] font-bold">
              {selectedEvent.scheduledDate
                ? `Scheduled on ${format(selectedEvent.scheduledDate, 'MMMM d, yyyy')} at ${selectedEvent.publishTime || '12:00'}`
                : 'No scheduled date'}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-[var(--bg-secondary)] text-[var(--label-tertiary)]"
          >
            <X size={18} />
          </button>
        </div>

        {/* Main Content Pane */}
        <div className="p-6 space-y-6 max-h-[600px] overflow-y-auto no-scrollbar">
          <div className="space-y-2">
            <h3 className="text-[20px] font-bold text-[var(--label-primary)]">
              {selectedEvent.name || selectedEvent.data?.title || 'Untitled Content'}
            </h3>
            {(selectedEvent.data?.body || selectedEvent.body) && (
              <div className="bg-[var(--bg-secondary)]/50 border border-[var(--separator)]/40 p-4 rounded-2xl">
                <p className="text-[14px] text-[var(--label-primary)] leading-relaxed whitespace-pre-wrap font-medium">
                  {selectedEvent.data?.body || selectedEvent.body}
                </p>
              </div>
            )}
          </div>

          {/* Auto Publish Status Indicators */}
          {selectedEvent.scheduledDate && (
            <div className="p-4 rounded-2xl bg-zinc-100/50 dark:bg-zinc-800/30 border border-[var(--separator)] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center text-green-500">
                  {isAutoPublished(selectedEvent) ? <CheckCircle size={20} /> : <Clock size={20} />}
                </div>
                <div>
                  <span className="text-[13px] font-bold text-[var(--label-primary)] block">
                    {isAutoPublished(selectedEvent)
                      ? 'Successfully Auto-Published'
                      : 'Linked to Auto-Publish'}
                  </span>
                  <p className="text-[11px] text-[var(--label-secondary)] font-medium leading-tight mt-0.5">
                    {isAutoPublished(selectedEvent)
                      ? `Content went live automatically on ${getPlatformStyle(selectedEvent.platform || selectedEvent.data?.platform).name}.`
                      : `Automatic API integration triggers on ${format(selectedEvent.scheduledDate, 'MMM d, yyyy')} at ${selectedEvent.publishTime || '12:00'}.`}
                  </p>
                </div>
              </div>
              {isAutoPublished(selectedEvent) && (
                <span className="text-[11px] font-bold text-green-500 uppercase tracking-wider bg-green-500/10 px-2.5 py-1 rounded-full">
                  Live
                </span>
              )}
            </div>
          )}

          {/* Sync to Platforms Section (extracted to SyncPanel) */}
          <SyncPanel
            user={user}
            selectedEvent={selectedEvent}
            onGoToProfile={onGoToProfile}
            onPublished={onPublished}
          />

          {/* AI Reformatting Section (extracted to ReformatPanel) */}
          <ReformatPanel user={user} selectedEvent={selectedEvent} onSaved={onSaved} />
        </div>

        {/* Footer Actions */}
        <div className="p-6 bg-[var(--bg-secondary)]/40 border-t border-[var(--separator)] flex flex-wrap gap-3 items-center justify-between">
          {scheduleError && (
            <p role="alert" className="w-full text-sm text-red-500">
              {scheduleError}
            </p>
          )}
          <button
            onClick={() => onDeleteEvent(selectedEvent.id)}
            className="px-4 py-3 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500/20 text-[13px] font-bold transition-colors flex items-center gap-2"
          >
            <Trash2 size={15} /> Delete Block
          </button>

          <div className="flex items-center gap-2">
            {isScheduleManaged(selectedEvent) && (
              <button
                onClick={() => onUnschedule(selectedEvent)}
                className="px-4 py-3 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--separator)]/60 text-[var(--label-secondary)] hover:text-[var(--label-primary)] text-[13px] font-bold transition-colors"
              >
                Clear scheduling
              </button>
            )}
            <button
              onClick={onClose}
              className="px-5 py-3 rounded-xl bg-[var(--accent)] text-white text-[13px] font-bold hover:opacity-90 transition-opacity"
            >
              Close
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
