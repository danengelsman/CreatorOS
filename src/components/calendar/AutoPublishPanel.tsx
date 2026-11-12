import React, { useState, useRef, useEffect } from 'react';
import { doc } from 'firebase/firestore';
import { auth, db } from '../../firebase';
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
 * F5.4: extracted manual-planning panel.
 * Owns showAutoPublishModal/draggedBlock/publishTime state +
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
  const [autoPublishError, setAutoPublishError] = useState('');
  const [isScheduling, setIsScheduling] = useState(false);
  const schedulingLock = useRef(false);
  const lifecycle = useRef({ uid: user?.uid, id: block?.id, generation: 0, mounted: true });
  if (lifecycle.current.uid !== user?.uid || lifecycle.current.id !== block?.id) {
    lifecycle.current = {
      uid: user?.uid,
      id: block?.id,
      generation: lifecycle.current.generation + 1,
      mounted: lifecycle.current.mounted,
    };
  }
  useEffect(() => {
    lifecycle.current.mounted = true;
    return () => {
      lifecycle.current.mounted = false;
      lifecycle.current.generation++;
    };
  }, []);

  // Re-derive defaults whenever a new block is opened (mirrors the previous
  // handleDropOnDay behaviour that set these from the dragged block each time).
  useEffect(() => {
    setPublishTime(block?.publishTime || '12:00');
    setAutoPublishError('');
  }, [block?.id, day]);

  const handleConfirmAutoPublish = async () => {
    if (!day || !block || !user?.uid || schedulingLock.current) return;
    const generation = lifecycle.current.generation;
    const isCurrent = () =>
      lifecycle.current.mounted &&
      lifecycle.current.generation === generation &&
      auth.currentUser?.uid === user.uid;
    if (block.userId !== user.uid || !isCurrent()) return;
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
      };

      await scheduleProject(
        db,
        doc(db, 'projects', block.id),
        user.uid,
        block,
        {
          scheduledDate: finalDateTime,
          publishTime,
        },
        isCurrent,
      );

      if (!isCurrent()) return;
      onScheduled(updatedBlock);
      onClose();
    } catch (error) {
      if (!isCurrent()) return;
      console.error('Error setting planned date:', error);
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
      error={autoPublishError}
      isScheduling={isScheduling}
      onClose={handlePanelClose}
      onConfirm={handleConfirmAutoPublish}
    />
  );
}
