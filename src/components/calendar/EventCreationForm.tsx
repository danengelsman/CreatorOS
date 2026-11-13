import React, { useEffect, useState } from 'react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import NewEventModal from './NewEventModal';

interface EventCreationFormProps {
  user: any;
  showEventModal: boolean;
  selectedDate: Date | null;
  onClose: () => void;
  onAdded: () => void;
}

/**
 * F5.4: extracted event-creation form.
 * Owns newEventTitle/Body/Platform/Status state + handleAddEvent.
 * CalendarView only orchestrates: it passes visibility/date and callbacks.
 */
export default function EventCreationForm({
  user,
  showEventModal,
  selectedDate,
  onClose,
  onAdded,
}: EventCreationFormProps) {
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventBody, setNewEventBody] = useState('');
  const [newEventPlatform, setNewEventPlatform] = useState('youtube');
  const [newEventStatus, setNewEventStatus] = useState('Draft');

  // The form stays mounted while hidden; each opening starts fresh content,
  // without resetting the user's platform or planning-status preferences.
  useEffect(() => {
    if (showEventModal) {
      setNewEventTitle('');
      setNewEventBody('');
    }
  }, [showEventModal, selectedDate]);

  const handleAddEvent = async () => {
    if (!newEventTitle || !selectedDate || !user) return;

    try {
      await addDoc(collection(db, 'projects'), {
        userId: user.uid,
        name: newEventTitle,
        type: 'content',
        scheduledDate: selectedDate,
        status: newEventStatus,
        autoPublish: false,
        publishTime: '12:00',
        data: {
          title: newEventTitle,
          body: newEventBody,
          platform: newEventPlatform,
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      onAdded();
      setNewEventTitle('');
      setNewEventBody('');
      onClose();
    } catch (error) {
      console.error('Error adding event:', error);
    }
  };

  return (
    <NewEventModal
      showEventModal={showEventModal}
      selectedDate={selectedDate}
      newEventTitle={newEventTitle}
      setNewEventTitle={setNewEventTitle}
      newEventBody={newEventBody}
      setNewEventBody={setNewEventBody}
      newEventPlatform={newEventPlatform}
      setNewEventPlatform={setNewEventPlatform}
      newEventStatus={newEventStatus}
      setNewEventStatus={setNewEventStatus}
      onClose={onClose}
      onAddEvent={handleAddEvent}
    />
  );
}
