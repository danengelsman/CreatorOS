import React from 'react';
import { CalendarBlock } from './calendarTypes';
import PublicationNotice from './PublicationNotice';

// Keep the extracted boundary, but no publisher, request, retry or Published write.
export default function SyncPanel({
  user,
  selectedEvent,
  onSaved,
}: {
  user: any;
  selectedEvent: CalendarBlock | null;
  onSaved?: () => void;
}) {
  if (!selectedEvent || selectedEvent.userId !== user?.uid) return null;
  return <PublicationNotice project={selectedEvent} user={user} onChanged={onSaved} />;
}
