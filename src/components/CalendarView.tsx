import React, { useState, useEffect, useRef } from 'react';
import { collection, query, where, getDocs, doc } from 'firebase/firestore';
import { db } from '../firebase';
import {
  startOfWeek,
  addDays,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  addMonths,
  subMonths,
} from 'date-fns';
import { AnimatePresence } from 'motion/react';
import { CalendarBlock, HeatmapMode } from './calendar/calendarTypes';
import UnscheduledSidebar from './calendar/UnscheduledSidebar';
import CalendarHeader from './calendar/CalendarHeader';
import CalendarGrid from './calendar/CalendarGrid';
import AutoPublishPanel from './calendar/AutoPublishPanel';
import EventDetailModal from './calendar/EventDetailModal';
import EventCreationForm from './calendar/EventCreationForm';
import { unscheduleProject } from './calendar/calendarPersistence';
import { deleteOwnedContentProject, STUDIO_JOURNEY_UNAVAILABLE } from './studio/studioOwnerFence';

export default function CalendarView({
  user,
  setActiveTab,
}: {
  user: any;
  setActiveTab: (tab: string) => void;
}) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [heatmapMode, setHeatmapMode] = useState<HeatmapMode>('off');

  const [allBlocks, setAllBlocks] = useState<CalendarBlock[]>([]);
  const [scheduledEvents, setScheduledEvents] = useState<CalendarBlock[]>([]);
  const [unscheduledBlocks, setUnscheduledBlocks] = useState<CalendarBlock[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showEventModal, setShowEventModal] = useState(false);

  // Drag and Drop pop-out state
  const [showAutoPublishModal, setShowAutoPublishModal] = useState(false);
  const [draggedBlock, setDraggedBlock] = useState<CalendarBlock | null>(null);
  const schedulingLock = useRef(false);

  // Selected detail modal
  const [selectedEvent, setSelectedEvent] = useState<CalendarBlock | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [scheduleError, setScheduleError] = useState('');

  // Search sidebar
  const [sidebarSearch, setSidebarSearch] = useState('');
  const calendarOwner = useRef({ uid: user?.uid, generation: 0 });
  if (calendarOwner.current.uid !== user?.uid) {
    calendarOwner.current = { uid: user?.uid, generation: calendarOwner.current.generation + 1 };
  }

  const fetchAllBlocks = async () => {
    if (!user?.uid) return;
    const generation = calendarOwner.current.generation;
    const isCurrent = () =>
      calendarOwner.current.uid === user.uid && calendarOwner.current.generation === generation;
    if (!isCurrent()) return;
    setIsLoading(true);
    try {
      const q = query(collection(db, 'projects'), where('userId', '==', user.uid));
      const snapshot = await getDocs(q);
      if (!isCurrent()) return;
      const fetched = snapshot.docs
        .filter((d) => d.data().type === 'content')
        .map((d) => {
          const data = d.data();
          return {
            id: d.id,
            ...data,
            scheduledDate: data.scheduledDate ? data.scheduledDate.toDate() : null,
          };
        });

      setAllBlocks(fetched);

      // Separate into scheduled and unscheduled
      const scheduled = fetched.filter((b) => b.scheduledDate !== null);
      const unscheduled = fetched.filter((b) => b.scheduledDate === null);

      setScheduledEvents(scheduled);
      setUnscheduledBlocks(unscheduled);
    } catch (error) {
      console.error('Error fetching content blocks:', error);
    } finally {
      if (isCurrent()) setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAllBlocks();
  }, [user]);

  const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1));

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
  const endDate = startOfWeek(addDays(monthEnd, 6), { weekStartsOn: 1 });

  const dateFormat = 'MMMM yyyy';
  const days = eachDayOfInterval({ start: startDate, end: addDays(endDate, 6) });

  // Drag over day cell
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.add('bg-[var(--bg-secondary)]/50');
  };

  // Drag leave day cell
  const handleDragLeave = (e: React.DragEvent) => {
    e.currentTarget.classList.remove('bg-[var(--bg-secondary)]/50');
  };

  // Drop content block onto day cell -> open the auto-publish panel
  const handleDropOnDay = (day: Date, e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.remove('bg-[var(--bg-secondary)]/50');
    if (schedulingLock.current) return;

    const blockId = e.dataTransfer.getData('blockId');
    if (!blockId) return;

    const block = allBlocks.find((b) => b.id === blockId && b.userId === user?.uid);
    if (!block) return;

    setSelectedDate(day);
    setDraggedBlock(block);
    setShowAutoPublishModal(true);
  };

  // Apply the block scheduling confirmed in AutoPublishPanel
  const handleBlockScheduled = (updatedBlock: CalendarBlock) => {
    setAllBlocks((prev) => prev.map((b) => (b.id === updatedBlock.id ? updatedBlock : b)));
    setScheduledEvents((prev) => [...prev.filter((b) => b.id !== updatedBlock.id), updatedBlock]);
    setUnscheduledBlocks((prev) => prev.filter((b) => b.id !== updatedBlock.id));
    setShowAutoPublishModal(false);
    setDraggedBlock(null);
  };

  const closeAutoPublish = () => {
    setShowAutoPublishModal(false);
    setDraggedBlock(null);
  };

  // Confirm sync completion: mirror local status + refresh
  const handlePublished = async (eventId: string) => {
    setSelectedEvent((prev) =>
      prev?.id === eventId && prev.userId === user?.uid ? { ...prev, status: 'Published' } : prev,
    );
    await fetchAllBlocks();
  };

  // Delete event
  const handleDeleteEvent = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!user?.uid) return;
    try {
      setScheduleError('');
      await deleteOwnedContentProject(db, doc(db, 'projects', id), user.uid);
      setAllBlocks((prev) => prev.filter((b) => b.id !== id));
      setScheduledEvents((prev) => prev.filter((b) => b.id !== id));
      setUnscheduledBlocks((prev) => prev.filter((b) => b.id !== id));
      setShowDetailModal(false);
    } catch (error) {
      console.error('Error deleting block:', error);
      setScheduleError(
        error instanceof Error && error.message === STUDIO_JOURNEY_UNAVAILABLE
          ? error.message
          : 'This item could not be deleted. Refresh the calendar and try again.',
      );
    }
  };

  // Unschedule a scheduled event (return to sidebar)
  const handleUnschedule = async (event: CalendarBlock) => {
    if (!user?.uid) return;
    try {
      setScheduleError('');
      await unscheduleProject(db, doc(db, 'projects', event.id), user.uid, event);
      await fetchAllBlocks();
      setShowDetailModal(false);
    } catch (error) {
      console.error('Error unscheduling block:', error);
      setScheduleError(
        error instanceof Error && error.message === STUDIO_JOURNEY_UNAVAILABLE
          ? error.message
          : 'Scheduling could not be cleared. Refresh the calendar and try again.',
      );
    }
  };

  const filteredUnscheduled = unscheduledBlocks.filter((block) => {
    if (!user?.uid || block.userId !== user.uid) return false;
    const title = block.name || block.data?.title || '';
    const body = block.data?.body || '';
    const platform = block.platform || block.data?.platform || '';
    const search = sidebarSearch.toLowerCase();
    return (
      title.toLowerCase().includes(search) ||
      body.toLowerCase().includes(search) ||
      platform.toLowerCase().includes(search)
    );
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start min-h-[700px]">
      {/* 1. Unscheduled Sidebar - 3 Columns */}
      <UnscheduledSidebar
        isLoading={isLoading}
        sidebarSearch={sidebarSearch}
        setSidebarSearch={setSidebarSearch}
        filteredUnscheduled={filteredUnscheduled}
        onOpenNewEvent={() => {
          setSelectedDate(new Date());
          setShowEventModal(true);
        }}
        onSelectEvent={(block) => {
          setSelectedEvent(block);
          setScheduleError('');
          setShowDetailModal(true);
        }}
        onDeleteEvent={handleDeleteEvent}
      />

      {/* 2. Content Calendar Grid - 9 Columns */}
      <div className="lg:col-span-9 bg-[var(--bg-tertiary)] border border-[var(--separator)]/60 rounded-[24px] overflow-hidden flex flex-col min-h-[600px] shadow-sm">
        <CalendarHeader
          currentDate={currentDate}
          dateFormat={dateFormat}
          heatmapMode={heatmapMode}
          setHeatmapMode={setHeatmapMode}
          onPrevMonth={handlePrevMonth}
          onNextMonth={handleNextMonth}
        />

        <CalendarGrid
          days={days}
          monthStart={monthStart}
          scheduledEvents={scheduledEvents.filter(
            (event) => !!user?.uid && event.userId === user.uid,
          )}
          heatmapMode={heatmapMode}
          onSelectDay={(day) => {
            setSelectedDate(day);
            setShowEventModal(true);
          }}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDropOnDay={handleDropOnDay}
          onSelectEvent={(event) => {
            setSelectedEvent(event);
            setScheduleError('');
            setShowDetailModal(true);
          }}
        />
      </div>

      {/* 3. Drag and Drop Auto-Publish Panel */}
      <AnimatePresence>
        <AutoPublishPanel
          user={user}
          open={showAutoPublishModal}
          block={draggedBlock}
          day={selectedDate}
          onClose={closeAutoPublish}
          onScheduled={handleBlockScheduled}
        />
      </AnimatePresence>

      {/* 4. Event Detail Panel (sync + reformat extracted to sub-panels) */}
      <EventDetailModal
        user={user}
        showDetailModal={showDetailModal}
        selectedEvent={selectedEvent}
        onClose={() => setShowDetailModal(false)}
        onDeleteEvent={handleDeleteEvent}
        onUnschedule={handleUnschedule}
        scheduleError={scheduleError}
        onGoToProfile={() => setActiveTab('profile')}
        onPublished={handlePublished}
        onSaved={fetchAllBlocks}
      />

      {/* 5. Standard New Event / Click Day to Create Block Form */}
      <AnimatePresence>
        <EventCreationForm
          user={user}
          showEventModal={showEventModal}
          selectedDate={selectedDate}
          onClose={() => setShowEventModal(false)}
          onAdded={fetchAllBlocks}
        />
      </AnimatePresence>
    </div>
  );
}
