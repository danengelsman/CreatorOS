import React, { useState, useRef, useEffect } from 'react';
import { doc } from 'firebase/firestore';
import { db } from '../../firebase';
import { scheduleProject } from './calendarPersistence';
import { STUDIO_JOURNEY_UNAVAILABLE } from '../studio/studioOwnerFence';
import AutoPublishModal from './AutoPublishModal';
import { CalendarBlock } from './calendarTypes';

interface AutoPublishPanelProps {
  user: any;
  open: boolean;
  block: CalendarBlock | null;
  day: Date | null;
  onClose: () => void;
  onScheduled: (updatedBlock: CalendarBlock) => void;
}

/**
 * F5.4: extracted auto-publish panel.
 * Owns showAutoPublishModal/draggedBlock/publishTime/autoPublishEnabled state +
 * handleConfirmAutoPublish. CalendarView only orchestrates visibility + the
 * resulting block-list updates.
 */
export default function AutoPublishPanel({
  user,
  open,
  block,
  day,
  onClose,
  onScheduled,
}: AutoPublishPanelProps) {
  const [publishTime, setPublishTime] = useState(block?.publishTime || '12:00');
  const [autoPublishEnabled, setAutoPublishEnabled] = useState(
    block?.autoPublish !== undefined ? block.autoPublish : true,
  );
  const [autoPublishError, setAutoPublishError] = useState('');
  const [isScheduling, setIsScheduling] = useState(false);
  const schedulingLock = useRef(false);

  // Re-derive defaults whenever a new block is opened (mirrors the previous
  // handleDropOnDay behaviour that set these from the dragged block each time).
  useEffect(() => {
    setPublishTime(block?.publishTime || '12:00');
    setAutoPublishEnabled(block?.autoPublish !== undefined ? block.autoPublish : true);
    setAutoPublishError('');
  }, [block?.id, day]);

  const handleConfirmAutoPublish = async () => {
    if (!day || !block || !user?.uid || schedulingLock.current) return;
    schedulingLock.current = true;
    setIsScheduling(true);
    setAutoPublishError('');

    try {
      const [hours, minutes] = publishTime.split(':').map(Number);
      const finalDateTime = new Date(day);
      finalDateTime.setHours(hours, minutes, 0, 0);

      const updatedBlock: CalendarBlock = {
        ...block,
        scheduledDate: finalDateTime,
        publishTime,
        autoPublish: autoPublishEnabled,
        status: autoPublishEnabled ? 'Scheduled' : 'Draft',
      };

      await scheduleProject(db, doc(db, 'projects', block.id), user.uid, block, {
        scheduledDate: finalDateTime,
        publishTime,
        autoPublish: autoPublishEnabled,
      });

      onScheduled(updatedBlock);
      onClose();
    } catch (error) {
      console.error('Error setting auto-publish date:', error);
      setAutoPublishError(
        error instanceof Error && error.message === STUDIO_JOURNEY_UNAVAILABLE
          ? error.message
          : 'Could not schedule this item. It may have been published or changed. Refresh the calendar and try again.',
      );
    } finally {
      schedulingLock.current = false;
      setIsScheduling(false);
    }
  };

  const handlePanelClose = () => {
    if (schedulingLock.current) return;
    onClose();
  };

  if (!open || !block) return null;

  return (
    <AutoPublishModal
      showAutoPublishModal={open}
      draggedBlock={block}
      selectedDate={day}
      publishTime={publishTime}
      setPublishTime={setPublishTime}
      autoPublishEnabled={autoPublishEnabled}
      setAutoPublishEnabled={setAutoPublishEnabled}
      error={autoPublishError}
      isScheduling={isScheduling}
      onClose={handlePanelClose}
      onConfirm={handleConfirmAutoPublish}
    />
  );
}
