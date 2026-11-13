import React from 'react';
import { motion } from 'motion/react';
import { format } from 'date-fns';
import { X, Clock, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CalendarBlock } from './calendarTypes';
import { getPlatformStyle } from './calendarHelpers';

interface AutoPublishModalProps {
  showAutoPublishModal: boolean;
  draggedBlock: CalendarBlock | null;
  selectedDate: Date | null;
  publishTime: string;
  setPublishTime: (time: string) => void;
  error: string;
  isScheduling: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export default function AutoPublishModal({
  showAutoPublishModal,
  draggedBlock,
  selectedDate,
  publishTime,
  setPublishTime,
  error,
  isScheduling,
  onClose,
  onConfirm,
}: AutoPublishModalProps) {
  if (!showAutoPublishModal || !draggedBlock) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-[var(--bg-tertiary)] w-full max-w-md rounded-[28px] shadow-2xl overflow-hidden border border-[var(--separator)] p-6 space-y-6"
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-[18px] font-bold tracking-tight text-[var(--label-primary)]">
              Plan Content
            </h3>
            <p className="text-[13px] text-[var(--label-secondary)] mt-0.5">
              For {selectedDate ? format(selectedDate, 'MMMM d, yyyy') : ''}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-[var(--bg-secondary)] text-[var(--label-tertiary)]"
          >
            <X size={18} />
          </button>
        </div>

        {/* Event Details Card */}
        <div
          className={cn(
            'p-4 rounded-2xl border bg-[var(--bg-secondary)]/50',
            getPlatformStyle(draggedBlock.platform || draggedBlock.data?.platform).border,
          )}
        >
          <div className="flex items-center gap-2 mb-2">
            <span
              className={cn(
                'text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full',
                getPlatformStyle(draggedBlock.platform || draggedBlock.data?.platform).bg,
                getPlatformStyle(draggedBlock.platform || draggedBlock.data?.platform).text,
              )}
            >
              {getPlatformStyle(draggedBlock.platform || draggedBlock.data?.platform).name}
            </span>
            <span className="text-[11px] text-[var(--label-tertiary)] font-bold">
              Content Block
            </span>
          </div>
          <h4 className="text-[14px] font-bold text-[var(--label-primary)]">
            {draggedBlock.name || draggedBlock.data?.title || 'Untitled'}
          </h4>
          {draggedBlock.data?.body && (
            <p className="text-[12px] text-[var(--label-secondary)] line-clamp-3 mt-1.5 leading-relaxed font-medium">
              {draggedBlock.data.body}
            </p>
          )}
        </div>

        {/* Time Selection */}
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold tracking-wider text-[var(--label-secondary)] uppercase pl-1 flex items-center gap-1.5">
              <Clock size={13} /> Select Planned Time
            </label>
            <input
              type="time"
              disabled={isScheduling}
              value={publishTime}
              onChange={(e) => setPublishTime(e.target.value)}
              className="w-full bg-[var(--bg-secondary)] border border-[var(--separator)] rounded-xl px-4 py-3 text-[15px] outline-none font-bold text-[var(--label-primary)] focus:border-[var(--accent)] transition-colors"
            />
          </div>

          <p className="text-[12px] text-[var(--label-secondary)]">
            This date is for planning only. Publish directly on the destination platform.
          </p>
        </div>

        {error && (
          <p role="alert" className="text-sm text-red-500">
            {error}
          </p>
        )}
        {/* Action Buttons */}
        <div className="flex gap-3 pt-2">
          <button
            onClick={onClose}
            className="flex-1 py-3.5 rounded-xl font-bold text-[14px] bg-[var(--bg-secondary)] hover:bg-[var(--bg-primary)] text-[var(--label-primary)] transition-colors border border-[var(--separator)]/30"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isScheduling}
            className="flex-1 py-3.5 rounded-xl font-bold text-[14px] bg-[var(--accent)] text-white hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
          >
            <Check size={16} /> Schedule
          </button>
        </div>
      </motion.div>
    </div>
  );
}
