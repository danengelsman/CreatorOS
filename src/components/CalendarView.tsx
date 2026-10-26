import React, { useState, useEffect } from 'react';
import {
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
  addDoc,
  serverTimestamp,
  deleteDoc,
} from 'firebase/firestore';
import { db, authorizedFetch, apiFetch } from '../firebase';
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
import { getFriendlyError } from '../lib/friendlyError';
import {
  CalendarBlock,
  HeatmapMode,
  ConnectedAccount,
  ReformatSuggestion,
} from './calendar/calendarTypes';
import UnscheduledSidebar from './calendar/UnscheduledSidebar';
import CalendarHeader from './calendar/CalendarHeader';
import CalendarGrid from './calendar/CalendarGrid';
import AutoPublishModal from './calendar/AutoPublishModal';
import NewEventModal from './calendar/NewEventModal';
import EventDetailModal from './calendar/EventDetailModal';

export { getPlatformStyle } from './calendar/calendarHelpers';

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

  // Create state fields
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventPlatform, setNewEventPlatform] = useState('youtube');
  const [newEventStatus, setNewEventStatus] = useState('Draft');
  const [newEventBody, setNewEventBody] = useState('');

  // Drag and Drop pop-out state
  const [showAutoPublishModal, setShowAutoPublishModal] = useState(false);
  const [draggedBlock, setDraggedBlock] = useState<CalendarBlock | null>(null);
  const [publishTime, setPublishTime] = useState('12:00');
  const [autoPublishEnabled, setAutoPublishEnabled] = useState(true);

  // Selected detail modal
  const [selectedEvent, setSelectedEvent] = useState<CalendarBlock | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // AI Reformatting states
  const [isGeneratingReformat, setIsGeneratingReformat] = useState(false);
  const [selectedTargetPlatforms, setSelectedTargetPlatforms] = useState<string[]>([]);
  const [reformatSuggestions, setReformatSuggestions] = useState<ReformatSuggestion[]>([]);
  const [reformatError, setReformatError] = useState('');

  // Search sidebar
  const [sidebarSearch, setSidebarSearch] = useState('');

  // Instant Sync states
  const [connectedAccounts, setConnectedAccounts] = useState<ConnectedAccount[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResults, setSyncResults] = useState<any>(null);
  const [syncError, setSyncError] = useState('');
  const [selectedSyncPlatforms, setSelectedSyncPlatforms] = useState<string[]>([]);

  const fetchConnectedAccounts = async () => {
    if (!user) return;
    try {
      const accounts = await authorizedFetch('/api/accounts');
      setConnectedAccounts(accounts || []);
    } catch (error) {
      console.error('Failed to fetch connected accounts:', error);
    }
  };

  const handleSyncToPlatforms = async () => {
    if (!selectedEvent || selectedSyncPlatforms.length === 0) return;
    setIsSyncing(true);
    setSyncResults(null);
    setSyncError('');

    const originalTitle = selectedEvent.name || selectedEvent.data?.title || 'Draft Content';
    const originalBody = selectedEvent.data?.body || selectedEvent.body || '';

    try {
      const result = await authorizedFetch('/api/publish', {
        method: 'POST',
        body: JSON.stringify({
          title: originalTitle,
          body: originalBody,
          platforms: selectedSyncPlatforms,
        }),
      });

      if (result.success) {
        setSyncResults(result.results);

        const hasSuccess = Object.values(result.results).some((r: any) => r.status === 'success');
        if (hasSuccess) {
          await updateDoc(doc(db, 'projects', selectedEvent.id), {
            status: 'Published',
            updatedAt: serverTimestamp(),
          });

          await fetchAllBlocks();

          setSelectedEvent((prev: any) => ({
            ...prev,
            status: 'Published',
          }));
        }
      } else {
        throw new Error(result.error || 'Failed to sync content');
      }
    } catch (err: any) {
      console.error(err);
      setSyncError(getFriendlyError(err));
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    if (selectedEvent) {
      setSyncResults(null);
      setSyncError('');
      const currentPlatform = (
        selectedEvent.platform ||
        selectedEvent.data?.platform ||
        ''
      ).toLowerCase();
      const isConnected = connectedAccounts.some((acc) => acc.platform === currentPlatform);
      if (isConnected) {
        setSelectedSyncPlatforms([currentPlatform]);
      } else {
        setSelectedSyncPlatforms([]);
      }
    }
  }, [selectedEvent, connectedAccounts]);

  const fetchAllBlocks = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const q = query(collection(db, 'projects'), where('userId', '==', user.uid));
      const snapshot = await getDocs(q);
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
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAllBlocks();
    if (user) {
      fetchConnectedAccounts();
    }
  }, [user]);

  const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1));

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
  const endDate = startOfWeek(addDays(monthEnd, 6), { weekStartsOn: 1 });

  const dateFormat = 'MMMM yyyy';
  const days = eachDayOfInterval({ start: startDate, end: addDays(endDate, 6) });

  // Add standard new event
  const handleAddEvent = async () => {
    if (!newEventTitle || !selectedDate || !user) return;

    try {
      await addDoc(collection(db, 'projects'), {
        userId: user.uid,
        name: newEventTitle,
        type: 'content',
        scheduledDate: selectedDate,
        status: newEventStatus,
        autoPublish: newEventStatus === 'Scheduled',
        publishTime: '12:00',
        data: {
          title: newEventTitle,
          body: newEventBody,
          platform: newEventPlatform,
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      await fetchAllBlocks();

      setNewEventTitle('');
      setNewEventBody('');
      setShowEventModal(false);
    } catch (error) {
      console.error('Error adding event:', error);
    }
  };

  // Delete event
  const handleDeleteEvent = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await deleteDoc(doc(db, 'projects', id));
      setAllBlocks((prev) => prev.filter((b) => b.id !== id));
      setScheduledEvents((prev) => prev.filter((b) => b.id !== id));
      setUnscheduledBlocks((prev) => prev.filter((b) => b.id !== id));
      setShowDetailModal(false);
    } catch (error) {
      console.error('Error deleting block:', error);
    }
  };

  // Drag over day cell
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.add('bg-[var(--bg-secondary)]/50');
  };

  // Drag leave day cell
  const handleDragLeave = (e: React.DragEvent) => {
    e.currentTarget.classList.remove('bg-[var(--bg-secondary)]/50');
  };

  // Drop content block onto day cell
  const handleDropOnDay = (day: Date, e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.remove('bg-[var(--bg-secondary)]/50');

    const blockId = e.dataTransfer.getData('blockId');
    if (!blockId) return;

    const block = allBlocks.find((b) => b.id === blockId);
    if (!block) return;

    setSelectedDate(day);
    setDraggedBlock(block);

    // Set default auto-publish settings
    setPublishTime(block.publishTime || '12:00');
    setAutoPublishEnabled(block.autoPublish !== undefined ? block.autoPublish : true);

    // Open the pop-out auto-publish configuration window
    setShowAutoPublishModal(true);
  };

  // Confirm Drag and Drop Auto-Publish Settings
  const handleConfirmAutoPublish = async () => {
    if (!selectedDate || !draggedBlock) return;

    try {
      const [hours, minutes] = publishTime.split(':').map(Number);
      const finalDateTime = new Date(selectedDate);
      finalDateTime.setHours(hours, minutes, 0, 0);

      const updatedBlock: CalendarBlock = {
        ...draggedBlock,
        scheduledDate: finalDateTime,
        publishTime,
        autoPublish: autoPublishEnabled,
        status: autoPublishEnabled ? 'Scheduled' : 'Draft',
      };

      setAllBlocks((prev) => prev.map((b) => (b.id === draggedBlock.id ? updatedBlock : b)));
      setScheduledEvents((prev) => [...prev.filter((b) => b.id !== draggedBlock.id), updatedBlock]);
      setUnscheduledBlocks((prev) => prev.filter((b) => b.id !== draggedBlock.id));

      await updateDoc(doc(db, 'projects', draggedBlock.id), {
        scheduledDate: finalDateTime,
        publishTime,
        autoPublish: autoPublishEnabled,
        status: autoPublishEnabled ? 'Scheduled' : 'Draft',
        updatedAt: serverTimestamp(),
      });

      setShowAutoPublishModal(false);
      setDraggedBlock(null);
    } catch (error) {
      console.error('Error setting auto-publish date:', error);
      fetchAllBlocks();
    }
  };

  // Unschedule a scheduled event (return to sidebar)
  const handleUnschedule = async (event: CalendarBlock) => {
    try {
      await updateDoc(doc(db, 'projects', event.id), {
        scheduledDate: null,
        status: 'Draft',
        updatedAt: serverTimestamp(),
      });
      await fetchAllBlocks();
      setShowDetailModal(false);
    } catch (error) {
      console.error('Error unscheduling block:', error);
    }
  };

  // Gemini AI content reformatting generator
  const handleGenerateAIReformat = async () => {
    if (!selectedEvent || selectedTargetPlatforms.length === 0) return;
    setIsGeneratingReformat(true);
    setReformatSuggestions([]);
    setReformatError('');

    const originalTitle = selectedEvent.name || selectedEvent.data?.title || 'Draft Content';
    const originalBody = selectedEvent.data?.body || selectedEvent.body || '';
    const originalPlatform = selectedEvent.data?.platform || selectedEvent.platform || 'youtube';

    try {
      const response = await apiFetch('/api/gemini/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gemini-3.8-flash',
          contents: `You are an expert social media copywriter and content strategist.
Your task is to reformat the following content block for multiple target platforms: ${selectedTargetPlatforms.join(', ')}.

Original Platform: ${originalPlatform}
Original Title: ${originalTitle}
Original Content:
${originalBody}

Generate fully rewritten, native, and engaging content tailored specifically for each of the requested target platforms:
- TikTok: Needs a bold, attention-grabbing opening hook, script style paragraphs, and 3-4 viral hashtags.
- Instagram: Needs spacing, visual emoticons/emojis, strong caption aesthetic, call-to-action, and hashtag block.
- X (Twitter): Needs a very punchy, thought-provoking single post or clean 2-post micro-thread, maximizing engagement within character constraints.
- YouTube: Needs an optimized description with clickable hook chapters, title ideas, and tag recommendations.

Return your response strictly in the following JSON format:
{
  "suggestions": [
    {
      "platform": "tiktok",
      "title": "TikTok Hook/Title",
      "body": "TikTok formatted text body..."
    },
    {
      "platform": "instagram",
      "title": "Instagram Caption Title",
      "body": "Instagram formatted text body..."
    }
  ]
}`,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: 'OBJECT',
              properties: {
                suggestions: {
                  type: 'ARRAY',
                  items: {
                    type: 'OBJECT',
                    properties: {
                      platform: { type: 'STRING' },
                      title: { type: 'STRING' },
                      body: { type: 'STRING' },
                    },
                    required: ['platform', 'title', 'body'],
                  },
                },
              },
              required: ['suggestions'],
            },
          },
        }),
      });

      if (!response.ok) throw new Error('Failed to generate suggestions');
      const result = await response.json();

      const parsed = JSON.parse(result.text);
      if (parsed?.suggestions) {
        setReformatSuggestions(parsed.suggestions);
      } else {
        throw new Error('Invalid formatting response');
      }
    } catch (err: any) {
      console.error(err);
      setReformatError(getFriendlyError(err));
    } finally {
      setIsGeneratingReformat(false);
    }
  };

  // Save selected AI suggestions as new Unscheduled drafts
  const handleSaveAIBlock = async (suggestion: ReformatSuggestion) => {
    if (!user) return;
    try {
      await addDoc(collection(db, 'projects'), {
        userId: user.uid,
        name: suggestion.title,
        type: 'content',
        status: 'Draft',
        scheduledDate: null,
        data: {
          title: suggestion.title,
          body: suggestion.body,
          platform: suggestion.platform,
          score: 80,
          score_feedback: 'AI Reformatted Draft',
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      await fetchAllBlocks();

      setReformatSuggestions((prev) => prev.filter((s) => s !== suggestion));
    } catch (error) {
      console.error('Error saving AI draft:', error);
    }
  };

  const filteredUnscheduled = unscheduledBlocks.filter((block) => {
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
          setReformatSuggestions([]);
          setReformatError('');
          setSelectedTargetPlatforms([]);
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
          scheduledEvents={scheduledEvents}
          heatmapMode={heatmapMode}
          onSelectDay={(day) => {
            setSelectedDate(day);
            setNewEventTitle('');
            setNewEventBody('');
            setShowEventModal(true);
          }}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDropOnDay={handleDropOnDay}
          onSelectEvent={(event) => {
            setSelectedEvent(event);
            setReformatSuggestions([]);
            setReformatError('');
            setSelectedTargetPlatforms([]);
            setShowDetailModal(true);
          }}
        />
      </div>

      {/* 3. Drag and Drop Auto-Publish Confirmation Modal */}
      <AnimatePresence>
        {showAutoPublishModal && draggedBlock && (
          <AutoPublishModal
            showAutoPublishModal={showAutoPublishModal}
            draggedBlock={draggedBlock}
            selectedDate={selectedDate}
            publishTime={publishTime}
            setPublishTime={setPublishTime}
            autoPublishEnabled={autoPublishEnabled}
            setAutoPublishEnabled={setAutoPublishEnabled}
            onClose={() => {
              setShowAutoPublishModal(false);
              setDraggedBlock(null);
            }}
            onConfirm={handleConfirmAutoPublish}
          />
        )}
      </AnimatePresence>

      {/* 4. Event Detail & AI Reformatting Modal */}
      <AnimatePresence>
        {showDetailModal && selectedEvent && (
          <EventDetailModal
            showDetailModal={showDetailModal}
            selectedEvent={selectedEvent}
            connectedAccounts={connectedAccounts}
            selectedSyncPlatforms={selectedSyncPlatforms}
            setSelectedSyncPlatforms={setSelectedSyncPlatforms}
            isSyncing={isSyncing}
            syncError={syncError}
            syncResults={syncResults}
            selectedTargetPlatforms={selectedTargetPlatforms}
            setSelectedTargetPlatforms={setSelectedTargetPlatforms}
            isGeneratingReformat={isGeneratingReformat}
            reformatError={reformatError}
            reformatSuggestions={reformatSuggestions}
            onClose={() => setShowDetailModal(false)}
            onSyncToPlatforms={handleSyncToPlatforms}
            onGenerateAIReformat={handleGenerateAIReformat}
            onSaveAIBlock={handleSaveAIBlock}
            onDeleteEvent={handleDeleteEvent}
            onUnschedule={handleUnschedule}
            onGoToProfile={() => setActiveTab('profile')}
          />
        )}
      </AnimatePresence>

      {/* 5. Standard New Event / Click Day to Create Block Modal */}
      <AnimatePresence>
        {showEventModal && selectedDate && (
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
            onClose={() => setShowEventModal(false)}
            onAddEvent={handleAddEvent}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
