import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, updateDoc, doc, addDoc, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, authorizedFetch } from '../firebase';
import { format, startOfWeek, addDays, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, isToday } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { 
  Youtube, 
  Instagram, 
  Twitter, 
  Flame, 
  Plus, 
  Trash2, 
  Clock, 
  Sparkles, 
  Check, 
  CheckCircle, 
  RefreshCw, 
  Smartphone, 
  Globe, 
  ChevronLeft, 
  ChevronRight, 
  X,
  Search,
  Calendar as CalendarIcon,
  Video,
  FileText,
  AlertCircle,
  CloudUpload,
  ExternalLink
} from 'lucide-react';

// Platform configurations with industry-accepted colors
export const getPlatformStyle = (platform: string) => {
  const p = platform?.toLowerCase() || '';
  if (p === 'youtube') {
    return {
      bg: 'bg-[#FF0000]/10 dark:bg-[#FF0000]/15 hover:bg-[#FF0000]/20',
      border: 'border-[#FF0000]/30',
      text: 'text-[#FF0000]',
      solidBg: 'bg-[#FF0000]',
      solidText: 'text-white',
      name: 'YouTube',
      accent: '#FF0000',
    };
  } else if (p === 'tiktok') {
    return {
      bg: 'bg-zinc-900/10 dark:bg-zinc-100/10 hover:bg-zinc-900/15 border-zinc-700',
      border: 'border-zinc-500/30 dark:border-zinc-400/30',
      text: 'text-zinc-900 dark:text-zinc-100',
      solidBg: 'bg-black dark:bg-white',
      solidText: 'text-white dark:text-black',
      name: 'TikTok',
      accent: '#010101',
    };
  } else if (p === 'instagram') {
    return {
      bg: 'bg-gradient-to-r from-[#833AB4]/5 via-[#FD1D1D]/5 to-[#F56040]/5 hover:opacity-90',
      border: 'border-[#E1306C]/30',
      text: 'text-[#E1306C]',
      solidBg: 'bg-gradient-to-tr from-[#F56040] via-[#FD1D1D] to-[#833AB4]',
      solidText: 'text-white',
      name: 'Instagram',
      accent: '#E1306C',
    };
  } else if (p === 'twitter' || p === 'x') {
    return {
      bg: 'bg-sky-500/10 hover:bg-sky-500/15',
      border: 'border-sky-500/30',
      text: 'text-sky-500 dark:text-sky-400',
      solidBg: 'bg-sky-500',
      solidText: 'text-white',
      name: 'X (Twitter)',
      accent: '#1DA1F2',
    };
  } else {
    return {
      bg: 'bg-indigo-500/10 hover:bg-indigo-500/15',
      border: 'border-indigo-500/30',
      text: 'text-indigo-500',
      solidBg: 'bg-indigo-500',
      solidText: 'text-white',
      name: platform || 'Other',
      accent: '#6366f1',
    };
  }
};

const getPlatformIcon = (platform: string, size = 16) => {
  const p = platform?.toLowerCase() || '';
  switch (p) {
    case 'youtube':
      return <Youtube size={size} />;
    case 'instagram':
      return <Instagram size={size} />;
    case 'twitter':
    case 'x':
      return <Twitter size={size} />;
    case 'tiktok':
      return <Smartphone size={size} />;
    default:
      return <Video size={size} />;
  }
};

export default function CalendarView({ user, setActiveTab }: { user: any, setActiveTab: (tab: string) => void }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [heatmapMode, setHeatmapMode] = useState<'off' | 'volume' | 'score' | 'time'>('off');

  const getHeatmapClass = (day: Date, dayEvents: any[]) => {
    if (heatmapMode === 'off') return '';
    
    const inMonth = isSameMonth(day, monthStart);
    if (!inMonth) return 'opacity-25';
    
    if (heatmapMode === 'volume') {
      const count = dayEvents.length;
      if (count === 0) return 'bg-[var(--bg-tertiary)]';
      if (count === 1) return 'bg-[var(--accent)]/[0.04] border-b-2 border-[var(--accent)]/10';
      if (count === 2) return 'bg-[var(--accent)]/[0.08] border-b-2 border-[var(--accent)]/30';
      if (count === 3) return 'bg-[var(--accent)]/[0.14] border-b-2 border-[var(--accent)]/60';
      return 'bg-[var(--accent)]/[0.22] border-b-2 border-[var(--accent)]';
    }
    
    if (heatmapMode === 'score') {
      const scores = dayEvents.map(e => e.data?.score || 0).filter(s => s > 0);
      if (scores.length === 0) return 'bg-[var(--bg-tertiary)]';
      const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
      
      if (avgScore < 50) return 'bg-amber-500/[0.04]';
      if (avgScore < 75) return 'bg-amber-500/[0.10]';
      if (avgScore < 90) return 'bg-amber-500/[0.18]';
      return 'bg-amber-500/[0.28] border-b-2 border-amber-500';
    }
    
    if (heatmapMode === 'time') {
      const dayOfWeek = day.getDay();
      if (dayOfWeek === 2 || dayOfWeek === 4) {
        return 'bg-emerald-500/[0.12] border-b-2 border-emerald-500/30';
      }
      if (dayOfWeek === 5 || dayOfWeek === 6) {
        return 'bg-emerald-500/[0.07] border-b-2 border-emerald-500/20';
      }
      return 'bg-emerald-500/[0.03]';
    }
    
    return '';
  };

  const [allBlocks, setAllBlocks] = useState<any[]>([]);
  const [scheduledEvents, setScheduledEvents] = useState<any[]>([]);
  const [unscheduledBlocks, setUnscheduledBlocks] = useState<any[]>([]);
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
  const [draggedBlock, setDraggedBlock] = useState<any>(null);
  const [publishTime, setPublishTime] = useState('12:00');
  const [autoPublishEnabled, setAutoPublishEnabled] = useState(true);
  
  // Selected detail modal
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // AI Reformatting states
  const [isGeneratingReformat, setIsGeneratingReformat] = useState(false);
  const [selectedTargetPlatforms, setSelectedTargetPlatforms] = useState<string[]>([]);
  const [reformatSuggestions, setReformatSuggestions] = useState<any[]>([]);
  const [reformatError, setReformatError] = useState('');
  
  // Search sidebar
  const [sidebarSearch, setSidebarSearch] = useState('');

  // Instant Sync states
  const [connectedAccounts, setConnectedAccounts] = useState<any[]>([]);
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
          platforms: selectedSyncPlatforms
        })
      });

      if (result.success) {
        setSyncResults(result.results);
        
        const hasSuccess = Object.values(result.results).some((r: any) => r.status === 'success');
        if (hasSuccess) {
          await updateDoc(doc(db, 'projects', selectedEvent.id), {
            status: 'Published',
            updatedAt: serverTimestamp()
          });
          
          await fetchAllBlocks();
          
          setSelectedEvent((prev: any) => ({
            ...prev,
            status: 'Published'
          }));
        }
      } else {
        throw new Error(result.error || 'Failed to sync content');
      }
    } catch (err: any) {
      console.error(err);
      setSyncError(err.message || 'Failed to sync content to platforms. Please try again.');
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    if (selectedEvent) {
      setSyncResults(null);
      setSyncError('');
      const currentPlatform = (selectedEvent.platform || selectedEvent.data?.platform || '').toLowerCase();
      const isConnected = connectedAccounts.some(acc => acc.platform === currentPlatform);
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
      const q = query(
        collection(db, 'projects'),
        where('userId', '==', user.uid)
      );
      const snapshot = await getDocs(q);
      const fetched = snapshot.docs
        .filter(doc => doc.data().type === 'content')
        .map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            scheduledDate: data.scheduledDate ? data.scheduledDate.toDate() : null
          };
        });

      setAllBlocks(fetched);
      
      // Separate into scheduled and unscheduled
      const scheduled = fetched.filter(b => b.scheduledDate !== null);
      const unscheduled = fetched.filter(b => b.scheduledDate === null);
      
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

  const dateFormat = "MMMM yyyy";
  const days = eachDayOfInterval({ start: startDate, end: addDays(endDate, 6) });

  // Add standard new event
  const handleAddEvent = async () => {
    if (!newEventTitle || !selectedDate || !user) return;
    
    try {
      const docRef = await addDoc(collection(db, 'projects'), {
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
        updatedAt: serverTimestamp()
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
      setAllBlocks(allBlocks.filter(b => b.id !== id));
      setScheduledEvents(scheduledEvents.filter(b => b.id !== id));
      setUnscheduledBlocks(unscheduledBlocks.filter(b => b.id !== id));
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

    const block = allBlocks.find(b => b.id === blockId);
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
      // Calculate final datetime based on target date and selected time
      const [hours, minutes] = publishTime.split(':').map(Number);
      const finalDateTime = new Date(selectedDate);
      finalDateTime.setHours(hours, minutes, 0, 0);

      // Optimistically update local states
      const updatedBlock = {
        ...draggedBlock,
        scheduledDate: finalDateTime,
        publishTime,
        autoPublish: autoPublishEnabled,
        status: autoPublishEnabled ? 'Scheduled' : 'Draft'
      };

      setAllBlocks(allBlocks.map(b => b.id === draggedBlock.id ? updatedBlock : b));
      setScheduledEvents([
        ...scheduledEvents.filter(b => b.id !== draggedBlock.id),
        updatedBlock
      ]);
      setUnscheduledBlocks(unscheduledBlocks.filter(b => b.id !== draggedBlock.id));

      // Update in Firestore
      await updateDoc(doc(db, 'projects', draggedBlock.id), {
        scheduledDate: finalDateTime,
        publishTime,
        autoPublish: autoPublishEnabled,
        status: autoPublishEnabled ? 'Scheduled' : 'Draft',
        updatedAt: serverTimestamp()
      });

      setShowAutoPublishModal(false);
      setDraggedBlock(null);
    } catch (error) {
      console.error('Error setting auto-publish date:', error);
      fetchAllBlocks(); // Rollback if error
    }
  };

  // Unschedule a scheduled event (return to sidebar)
  const handleUnschedule = async (event: any) => {
    try {
      await updateDoc(doc(db, 'projects', event.id), {
        scheduledDate: null,
        status: 'Draft',
        updatedAt: serverTimestamp()
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
      const response = await fetch('/api/gemini/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gemini-3.5-flash',
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
                      body: { type: 'STRING' }
                    },
                    required: ['platform', 'title', 'body']
                  }
                }
              },
              required: ['suggestions']
            }
          }
        })
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
      setReformatError(err.message || 'Failed to reformat content. Please try again.');
    } finally {
      setIsGeneratingReformat(false);
    }
  };

  // Save selected AI suggestions as new Unscheduled drafts
  const handleSaveAIBlock = async (suggestion: any) => {
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
          score_feedback: 'AI Reformatted Draft'
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // Refresh list to put new drafts in the Sidebar!
      await fetchAllBlocks();
      
      // Filter out saved suggestion from view
      setReformatSuggestions(reformatSuggestions.filter(s => s !== suggestion));
    } catch (error) {
      console.error('Error saving AI draft:', error);
    }
  };

  // Check if a scheduled event has been auto-published (its time is in the past)
  const isAutoPublished = (event: any) => {
    if (!event.scheduledDate) return false;
    if (!event.autoPublish) return false;
    return new Date(event.scheduledDate) < new Date();
  };

  const filteredUnscheduled = unscheduledBlocks.filter(block => {
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
      <div className="lg:col-span-3 bg-[var(--bg-tertiary)] border border-[var(--separator)]/60 rounded-[24px] p-5 flex flex-col h-full max-h-[850px]">
        <div className="space-y-4 pb-4 border-b border-[var(--separator)]">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-[17px] font-bold tracking-tight text-[var(--label-primary)]">Unscheduled Content</h3>
              <p className="text-[12px] text-[var(--label-secondary)] font-medium mt-0.5">Drag blocks onto calendar dates</p>
            </div>
            <button 
              onClick={() => {
                setSelectedDate(new Date());
                setShowEventModal(true);
              }}
              className="p-1.5 rounded-full bg-[var(--accent)]/10 text-[var(--accent)] hover:bg-[var(--accent)] hover:text-white transition-colors"
              title="Add Unscheduled Block"
            >
              <Plus size={16} />
            </button>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-3.5 text-[var(--label-tertiary)] w-4 h-4" />
            <input 
              type="text"
              placeholder="Search drafts..."
              value={sidebarSearch}
              onChange={e => setSidebarSearch(e.target.value)}
              className="w-full bg-[var(--bg-secondary)] border border-[var(--separator)]/40 rounded-xl pl-9 pr-4 py-2.5 text-[13px] outline-none focus:border-[var(--accent)] transition-colors text-[var(--label-primary)]"
            />
          </div>
        </div>

        {/* Draggable blocks list */}
        <div className="flex-1 overflow-y-auto no-scrollbar space-y-3 mt-4 pr-1">
          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3 text-[var(--label-secondary)]">
              <RefreshCw className="animate-spin text-[var(--accent)]" size={24} />
              <span className="text-[13px] font-medium">Loading content blocks...</span>
            </div>
          ) : filteredUnscheduled.length === 0 ? (
            <div className="py-20 text-center text-[var(--label-tertiary)] text-[13px] font-medium flex flex-col items-center gap-2">
              <CalendarIcon size={24} className="opacity-40" />
              <span>No unscheduled drafts.</span>
              <p className="text-[11px] px-4">Create content in the Editor or click (+) above to build ideas.</p>
            </div>
          ) : (
            filteredUnscheduled.map(block => {
              const style = getPlatformStyle(block.platform || block.data?.platform);
              const title = block.name || block.data?.title || 'Draft Content';
              const body = block.data?.body || '';
              const score = block.data?.score || 0;
              
              return (
                <div
                  key={block.id}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('blockId', block.id);
                    e.dataTransfer.effectAllowed = 'move';
                  }}
                  onClick={() => {
                    setSelectedEvent(block);
                    setReformatSuggestions([]);
                    setReformatError('');
                    setSelectedTargetPlatforms([]);
                    setShowDetailModal(true);
                  }}
                  className={cn(
                    "p-3.5 rounded-2xl border cursor-grab active:cursor-grabbing transition-all hover:scale-[1.02] bg-[var(--bg-secondary)] group flex flex-col gap-2 shadow-sm hover:shadow-md",
                    style.border
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className={cn("text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full", style.bg, style.text)}>
                      {style.name}
                    </span>
                    {score > 0 && (
                      <span className="text-[10px] font-bold text-[var(--system-green)] bg-green-500/10 px-2 py-0.5 rounded-full">
                        Score: {score}
                      </span>
                    )}
                  </div>
                  <h4 className="text-[13px] font-bold text-[var(--label-primary)] truncate">{title}</h4>
                  {body && (
                    <p className="text-[11px] text-[var(--label-secondary)] line-clamp-2 leading-relaxed font-medium">
                      {body}
                    </p>
                  )}
                  
                  <div className="flex items-center justify-between pt-1 border-t border-[var(--separator)]/30 text-[10px] text-[var(--label-tertiary)] font-bold">
                    <span className="flex items-center gap-1">
                      {getPlatformIcon(block.platform || block.data?.platform, 12)}
                      Hold & Drag
                    </span>
                    <button 
                      onClick={(e) => handleDeleteEvent(block.id, e)}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/10 text-red-500 transition-all"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 2. Content Calendar Grid - 9 Columns */}
      <div className="lg:col-span-9 bg-[var(--bg-tertiary)] border border-[var(--separator)]/60 rounded-[24px] overflow-hidden flex flex-col min-h-[600px] shadow-sm">
        {/* Calendar Header */}
        <div className="flex items-center justify-between p-6 border-b border-[var(--separator)] bg-[var(--bg-tertiary)]">
          <div>
            <h2 className="text-[20px] font-semibold tracking-tight text-[var(--label-primary)]">{format(currentDate, dateFormat)}</h2>
            <p className="text-[13px] text-[var(--label-secondary)] font-medium mt-1">Plan, visualize and trigger auto-publishing</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handlePrevMonth} className="w-8 h-8 flex items-center justify-center rounded-full bg-[var(--bg-secondary)] hover:bg-[var(--bg-primary)] transition-colors border border-[var(--separator)]/30 text-[var(--label-primary)]">
              <ChevronLeft size={16} />
            </button>
            <button onClick={handleNextMonth} className="w-8 h-8 flex items-center justify-center rounded-full bg-[var(--bg-secondary)] hover:bg-[var(--bg-primary)] transition-colors border border-[var(--separator)]/30 text-[var(--label-primary)]">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* Heatmap Layer Control Panel */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-6 py-3 border-b border-[var(--separator)] bg-[var(--bg-secondary)]/15">
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-1.5 text-[12px] font-bold text-[var(--label-secondary)]">
              <Flame className="text-[var(--accent)]" size={15} />
              <span>Heatmap view:</span>
            </div>
            <div className="flex bg-[var(--bg-secondary)] border border-[var(--separator)]/40 rounded-lg p-0.5 text-[11px] font-bold">
              <button 
                onClick={() => setHeatmapMode('off')} 
                className={cn(
                  "px-2.5 py-1 rounded-md transition-all cursor-pointer",
                  heatmapMode === 'off' 
                    ? "bg-[var(--bg-tertiary)] text-[var(--label-primary)] shadow-sm" 
                    : "text-[var(--label-tertiary)] hover:text-[var(--label-secondary)]"
                )}
              >
                None
              </button>
              <button 
                onClick={() => setHeatmapMode('volume')} 
                className={cn(
                  "px-2.5 py-1 rounded-md transition-all cursor-pointer",
                  heatmapMode === 'volume' 
                    ? "bg-[var(--accent)] text-white shadow-sm" 
                    : "text-[var(--label-tertiary)] hover:text-[var(--label-secondary)]"
                )}
              >
                Density
              </button>
              <button 
                onClick={() => setHeatmapMode('score')} 
                className={cn(
                  "px-2.5 py-1 rounded-md transition-all cursor-pointer",
                  heatmapMode === 'score' 
                    ? "bg-amber-500 text-white shadow-sm" 
                    : "text-[var(--label-tertiary)] hover:text-[var(--label-secondary)]"
                )}
              >
                Content Score
              </button>
              <button 
                onClick={() => setHeatmapMode('time')} 
                className={cn(
                  "px-2.5 py-1 rounded-md transition-all cursor-pointer",
                  heatmapMode === 'time' 
                    ? "bg-emerald-600 text-white shadow-sm" 
                    : "text-[var(--label-tertiary)] hover:text-[var(--label-secondary)]"
                )}
              >
                Best Time to Post
              </button>
            </div>
          </div>

          {/* Dynamic Heatmap Legend */}
          {heatmapMode !== 'off' && (
            <div className="flex items-center gap-2 text-[10px] text-[var(--label-tertiary)] font-bold">
              <span>Low</span>
              <div className="flex gap-1">
                {heatmapMode === 'volume' && (
                  <>
                    <div className="w-3.5 h-3.5 rounded bg-[var(--accent)]/[0.04] border border-[var(--accent)]/10" />
                    <div className="w-3.5 h-3.5 rounded bg-[var(--accent)]/[0.08] border border-[var(--accent)]/20" />
                    <div className="w-3.5 h-3.5 rounded bg-[var(--accent)]/[0.14] border border-[var(--accent)]/30" />
                    <div className="w-3.5 h-3.5 rounded bg-[var(--accent)]/[0.22] border border-[var(--accent)]" />
                  </>
                )}
                {heatmapMode === 'score' && (
                  <>
                    <div className="w-3.5 h-3.5 rounded bg-amber-500/[0.04] border border-amber-500/10" />
                    <div className="w-3.5 h-3.5 rounded bg-amber-500/[0.10] border border-amber-500/20" />
                    <div className="w-3.5 h-3.5 rounded bg-amber-500/[0.18] border border-amber-500/30" />
                    <div className="w-3.5 h-3.5 rounded bg-amber-500/[0.28] border border-amber-500" />
                  </>
                )}
                {heatmapMode === 'time' && (
                  <>
                    <div className="w-3.5 h-3.5 rounded bg-emerald-500/[0.03] border border-emerald-500/10" />
                    <div className="w-3.5 h-3.5 rounded bg-emerald-500/[0.07] border border-emerald-500/20" />
                    <div className="w-3.5 h-3.5 rounded bg-emerald-500/[0.12] border border-emerald-500/30" />
                    <div className="w-3.5 h-3.5 rounded bg-emerald-500/40 border border-emerald-500" />
                  </>
                )}
              </div>
              <span>High</span>
            </div>
          )}
        </div>

        {/* Days of Week */}
        <div className="grid grid-cols-7 border-b border-[var(--separator)] bg-[var(--bg-secondary)]/50">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
            <div key={day} className="py-3 text-center text-[11px] font-bold tracking-wider uppercase text-[var(--label-secondary)]">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="flex-1 grid grid-cols-7 grid-rows-5 bg-[var(--separator)]/30 gap-[1px]">
          {days.slice(0, 35).map((day, i) => {
            const dayEvents = scheduledEvents.filter(e => isSameDay(e.scheduledDate, day));
            return (
              <div 
                key={day.toString()}
                onClick={() => {
                  setSelectedDate(day);
                  setNewEventTitle('');
                  setNewEventBody('');
                  setShowEventModal(true);
                }}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDropOnDay(day, e)}
                className={cn(
                  getHeatmapClass(day, dayEvents) || "bg-[var(--bg-tertiary)]",
                  "min-h-[110px] p-2 hover:bg-[var(--bg-secondary)]/30 transition-colors cursor-pointer group flex flex-col gap-1.5 relative",
                  !isSameMonth(day, monthStart) && "opacity-30"
                )}
              >
                <div className="flex items-center justify-between">
                  <span className={cn(
                    "w-6 h-6 flex items-center justify-center rounded-full text-[12px] font-bold flex-shrink-0 text-[var(--label-primary)]",
                    isToday(day) ? "bg-[var(--accent)] text-white shadow-sm" : ""
                  )}>
                    {format(day, 'd')}
                  </span>
                  {heatmapMode === 'off' && (
                    <Plus size={12} className="opacity-0 group-hover:opacity-100 text-[var(--label-tertiary)] transition-opacity" />
                  )}
                  {heatmapMode === 'volume' && dayEvents.length > 0 && (
                    <span className="text-[9px] font-bold text-[var(--accent)] bg-[var(--accent)]/15 px-1.5 py-0.5 rounded-full">
                      {dayEvents.length}p
                    </span>
                  )}
                  {heatmapMode === 'score' && dayEvents.some(e => (e.data?.score || 0) > 0) && (
                    <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/20 px-1.5 py-0.5 rounded-full">
                      {Math.round(dayEvents.reduce((acc, e) => acc + (e.data?.score || 0), 0) / dayEvents.filter(e => (e.data?.score || 0) > 0).length)}%
                    </span>
                  )}
                  {heatmapMode === 'time' && (
                    <span className={cn(
                      "text-[8px] font-extrabold uppercase px-1 py-0.5 rounded",
                      day.getDay() === 2 || day.getDay() === 4 
                        ? "text-emerald-600 dark:text-emerald-400 bg-emerald-500/20" 
                        : "text-emerald-500/80 bg-emerald-500/5"
                    )}>
                      {day.getDay() === 2 || day.getDay() === 4 ? "Peak" : "Good"}
                    </span>
                  )}
                </div>
                
                {/* Day events stack */}
                <div className="flex-1 overflow-y-auto space-y-1.5 no-scrollbar max-h-[85px]">
                  {dayEvents.map(event => {
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
                          setSelectedEvent(event);
                          setReformatSuggestions([]);
                          setReformatError('');
                          setSelectedTargetPlatforms([]);
                          setShowDetailModal(true);
                        }}
                        className={cn(
                          "group/item border rounded-xl px-2 py-1.5 text-[11px] font-bold flex flex-col gap-0.5 shadow-sm cursor-grab active:cursor-grabbing transition-all hover:scale-[1.01] bg-[var(--bg-secondary)]",
                          style.border
                        )}
                      >
                        <div className="flex items-center justify-between gap-1.5">
                          <span className={cn("text-[9px] px-1 py-0.5 rounded font-bold uppercase", style.bg, style.text)}>
                            {style.name}
                          </span>
                          <span className="text-[8px] text-[var(--label-tertiary)] font-bold">
                            {event.publishTime || '12:00'}
                          </span>
                        </div>
                        
                        <span className="truncate text-[11px] text-[var(--label-primary)] font-medium mt-0.5">{title}</span>
                        
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
                            <span className="text-[var(--label-tertiary)]">
                              Draft
                            </span>
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
      </div>

      {/* 3. Drag and Drop Auto-Publish Confirmation Modal */}
      <AnimatePresence>
        {showAutoPublishModal && draggedBlock && (
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
                  <h3 className="text-[18px] font-bold tracking-tight text-[var(--label-primary)]">Configure Auto-Publish</h3>
                  <p className="text-[13px] text-[var(--label-secondary)] mt-0.5">
                    For {selectedDate ? format(selectedDate, 'MMMM d, yyyy') : ''}
                  </p>
                </div>
                <button 
                  onClick={() => {
                    setShowAutoPublishModal(false);
                    setDraggedBlock(null);
                  }}
                  className="p-1.5 rounded-full hover:bg-[var(--bg-secondary)] text-[var(--label-tertiary)]"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Event Details Card */}
              <div className={cn(
                "p-4 rounded-2xl border bg-[var(--bg-secondary)]/50",
                getPlatformStyle(draggedBlock.platform || draggedBlock.data?.platform).border
              )}>
                <div className="flex items-center gap-2 mb-2">
                  <span className={cn(
                    "text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full",
                    getPlatformStyle(draggedBlock.platform || draggedBlock.data?.platform).bg,
                    getPlatformStyle(draggedBlock.platform || draggedBlock.data?.platform).text
                  )}>
                    {getPlatformStyle(draggedBlock.platform || draggedBlock.data?.platform).name}
                  </span>
                  <span className="text-[11px] text-[var(--label-tertiary)] font-bold">Draft Block</span>
                </div>
                <h4 className="text-[14px] font-bold text-[var(--label-primary)]">{draggedBlock.name || draggedBlock.data?.title || 'Untitled'}</h4>
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
                    <Clock size={13} /> Select Publishing Time
                  </label>
                  <input 
                    type="time" 
                    value={publishTime}
                    onChange={(e) => setPublishTime(e.target.value)}
                    className="w-full bg-[var(--bg-secondary)] border border-[var(--separator)] rounded-xl px-4 py-3 text-[15px] outline-none font-bold text-[var(--label-primary)] focus:border-[var(--accent)] transition-colors"
                  />
                </div>

                {/* Auto Publish Trigger Toggle */}
                <div className="flex items-center justify-between p-3.5 bg-[var(--bg-secondary)]/50 rounded-2xl border border-[var(--separator)]/40">
                  <div className="space-y-0.5 pr-4">
                    <span className="text-[13px] font-bold text-[var(--label-primary)] flex items-center gap-1.5">
                      <Sparkles size={14} className="text-[var(--accent)]" /> Enable Auto-Publish
                    </span>
                    <p className="text-[11px] text-[var(--label-secondary)] font-medium leading-tight">
                      Link this block to the API auto-publisher to schedule automated posting.
                    </p>
                  </div>
                  <button 
                    onClick={() => setAutoPublishEnabled(!autoPublishEnabled)}
                    className={cn(
                      "w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer",
                      autoPublishEnabled ? "bg-[var(--accent)]" : "bg-gray-300 dark:bg-zinc-700"
                    )}
                  >
                    <div className={cn(
                      "bg-white w-4 h-4 rounded-full shadow-md transform transition-transform",
                      autoPublishEnabled ? "translate-x-5" : "translate-x-0"
                    )} />
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <button 
                  onClick={() => {
                    setShowAutoPublishModal(false);
                    setDraggedBlock(null);
                  }}
                  className="flex-1 py-3.5 rounded-xl font-bold text-[14px] bg-[var(--bg-secondary)] hover:bg-[var(--bg-primary)] text-[var(--label-primary)] transition-colors border border-[var(--separator)]/30"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleConfirmAutoPublish}
                  className="flex-1 py-3.5 rounded-xl font-bold text-[14px] bg-[var(--accent)] text-white hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                >
                  <Check size={16} /> Schedule
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 4. Event Detail & AI Reformatting Modal */}
      <AnimatePresence>
        {showDetailModal && selectedEvent && (
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
                  <span className={cn(
                    "text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full",
                    getPlatformStyle(selectedEvent.platform || selectedEvent.data?.platform).bg,
                    getPlatformStyle(selectedEvent.platform || selectedEvent.data?.platform).text
                  )}>
                    {getPlatformStyle(selectedEvent.platform || selectedEvent.data?.platform).name}
                  </span>
                  <span className="text-[13px] text-[var(--label-secondary)] font-bold">
                    {selectedEvent.scheduledDate 
                      ? `Scheduled on ${format(selectedEvent.scheduledDate, 'MMMM d, yyyy')} at ${selectedEvent.publishTime || '12:00'}` 
                      : 'Unscheduled Draft'}
                  </span>
                </div>
                <button 
                  onClick={() => setShowDetailModal(false)}
                  className="p-1.5 rounded-full hover:bg-[var(--bg-secondary)] text-[var(--label-tertiary)]"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Main Content Pane */}
              <div className="p-6 space-y-6 max-h-[600px] overflow-y-auto no-scrollbar">
                <div className="space-y-2">
                  <h3 className="text-[20px] font-bold text-[var(--label-primary)]">{selectedEvent.name || selectedEvent.data?.title || 'Untitled Content'}</h3>
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
                          {isAutoPublished(selectedEvent) ? 'Successfully Auto-Published' : 'Linked to Auto-Publish'}
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

                {/* Sync to Platforms Section */}
                <div className="border-t border-[var(--separator)]/60 pt-6 space-y-4">
                  <div className="flex items-center gap-2">
                    <CloudUpload size={18} className="text-[var(--accent)]" />
                    <h4 className="text-[15px] font-bold text-[var(--label-primary)]">🚀 Push and Sync to Connected Social Networks</h4>
                  </div>
                  <p className="text-[12px] text-[var(--label-secondary)] font-medium leading-relaxed">
                    Instantly push this scheduled content block to your connected social channels via OAuth.
                  </p>

                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2.5">
                      {['youtube', 'tiktok', 'instagram', 'twitter'].map(p => {
                        const style = getPlatformStyle(p);
                        const isConnected = connectedAccounts.some(acc => acc.platform === p);
                        const isSelected = selectedSyncPlatforms.includes(p);
                        const accountInfo = connectedAccounts.find(acc => acc.platform === p);

                        return (
                          <div
                            key={p}
                            className={cn(
                              "relative flex items-center justify-between p-3.5 rounded-2xl border transition-all duration-200",
                              isConnected 
                                ? "bg-[var(--bg-secondary)] border-[var(--separator)] cursor-pointer hover:border-[var(--accent)]" 
                                : "bg-[var(--bg-tertiary)]/50 border-[var(--separator)]/30 opacity-75"
                            )}
                            onClick={() => {
                              if (!isConnected) return;
                              if (isSelected) {
                                setSelectedSyncPlatforms(prev => prev.filter(item => item !== p));
                              } else {
                                setSelectedSyncPlatforms(prev => [...prev, p]);
                              }
                            }}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className={cn(
                                "w-7 h-7 rounded-lg flex items-center justify-center shrink-0",
                                style.bg,
                                style.text
                              )}>
                                {getPlatformIcon(p, 16)}
                              </div>
                              <div className="min-w-0">
                                <span className="text-[12px] font-bold text-[var(--label-primary)] block truncate">
                                  {style.name}
                                </span>
                                <span className="text-[10px] text-[var(--label-tertiary)] font-semibold block truncate">
                                  {isConnected ? `@${accountInfo?.profile?.name || accountInfo?.profile?.username || 'connected'}` : 'Not connected'}
                                </span>
                              </div>
                            </div>
                            
                            {isConnected ? (
                              <div className={cn(
                                "w-5 h-5 rounded-md border flex items-center justify-center transition-colors shadow-sm",
                                isSelected 
                                  ? "bg-[var(--accent)] border-[var(--accent)] text-white" 
                                  : "border-[var(--separator)] bg-[var(--bg-primary)] text-transparent"
                              )}>
                                <Check size={12} strokeWidth={3} />
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveTab('profile');
                                }}
                                className="text-[10px] font-bold text-[var(--accent)] hover:underline flex items-center gap-0.5 shrink-0"
                              >
                                Connect <ExternalLink size={10} />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {connectedAccounts.length === 0 ? (
                      <div className="bg-[var(--bg-secondary)] border border-[var(--separator)]/60 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
                        <div className="space-y-1">
                          <p className="text-[13px] font-bold text-[var(--label-primary)]">No connected channels detected</p>
                          <p className="text-[11px] text-[var(--label-secondary)] font-medium leading-normal">
                            Connect your social accounts via secure OAuth under your Profile tab to unlock instant publishing.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setActiveTab('profile')}
                          className="ios-button ios-button-tinted shrink-0 h-9 px-4 text-[13px] font-bold"
                        >
                          Go to Profile
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3 pt-1">
                        <button
                          type="button"
                          disabled={isSyncing || selectedSyncPlatforms.length === 0}
                          onClick={handleSyncToPlatforms}
                          className="w-full h-11 bg-[var(--accent)] text-white rounded-2xl font-bold text-[14px] flex items-center justify-center gap-2 shadow-lg shadow-[#007AFF1A] hover:bg-opacity-95 active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none"
                        >
                          {isSyncing ? (
                            <>
                              <RefreshCw className="animate-spin" size={16} />
                              <span>Synchronizing across platforms...</span>
                            </>
                          ) : (
                            <>
                              <CloudUpload size={16} />
                              <span>Sync to Platforms ({selectedSyncPlatforms.length})</span>
                            </>
                          )}
                        </button>

                        {syncError && (
                          <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl flex items-start gap-2 text-[11px] font-medium leading-relaxed">
                            <AlertCircle size={14} className="shrink-0 mt-0.5" />
                            <span>{syncError}</span>
                          </div>
                        )}

                        {syncResults && (
                          <div className="bg-[var(--bg-secondary)] border border-[var(--separator)]/40 rounded-xl p-3.5 space-y-3">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--label-secondary)] block">
                              Sync Push Summary
                            </span>
                            <div className="space-y-2">
                              {Object.entries(syncResults).map(([plat, res]: [string, any]) => {
                                const style = getPlatformStyle(plat);
                                return (
                                  <div key={plat} className="flex items-start justify-between gap-3 text-[12px] font-medium">
                                    <div className="flex items-center gap-2 min-w-0">
                                      <div className={cn("w-5 h-5 rounded flex items-center justify-center text-[10px]", style.bg, style.text)}>
                                        {getPlatformIcon(plat, 11)}
                                      </div>
                                      <span className="font-bold text-[var(--label-primary)]">{style.name}</span>
                                    </div>
                                    <div className="text-right min-w-0 shrink-0">
                                      {res.status === 'success' ? (
                                        <div className="flex flex-col items-end gap-1">
                                          <span className="text-green-500 font-bold flex items-center gap-1">
                                            <CheckCircle size={12} /> Live Sync Success
                                          </span>
                                          {res.url && (
                                            <a
                                              href={res.url}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="text-[10px] text-[var(--accent)] hover:underline flex items-center gap-0.5 font-semibold"
                                            >
                                              View Draft/Community <ExternalLink size={10} />
                                            </a>
                                          )}
                                        </div>
                                      ) : (
                                        <span className="text-red-500 font-bold flex items-center gap-1">
                                          ❌ Failed: {res.message}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* AI Reformatting Section */}
                <div className="border-t border-[var(--separator)]/60 pt-6 space-y-4">
                  <div className="flex items-center gap-2">
                    <Sparkles size={18} className="text-[var(--accent)]" />
                    <h4 className="text-[15px] font-bold text-[var(--label-primary)]">✨ Reformat for Multiple Platforms with AI</h4>
                  </div>
                  <p className="text-[12px] text-[var(--label-secondary)] font-medium leading-relaxed">
                    Instantly rewrite and format this content block into separate native drafts for your other social channels using Gemini.
                  </p>

                  {/* Platforms selection toggles */}
                  <div className="flex flex-wrap gap-2.5 pt-1">
                    {['youtube', 'tiktok', 'instagram', 'twitter'].map(p => {
                      const isCurrent = (selectedEvent.platform || selectedEvent.data?.platform) === p;
                      const isSelected = selectedTargetPlatforms.includes(p);
                      const config = getPlatformStyle(p);
                      
                      if (isCurrent) return null; // Can't reformat to its own platform

                      return (
                        <button
                          key={p}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              setSelectedTargetPlatforms(selectedTargetPlatforms.filter(item => item !== p));
                            } else {
                              setSelectedTargetPlatforms([...selectedTargetPlatforms, p]);
                            }
                          }}
                          className={cn(
                            "flex items-center gap-2 px-3.5 py-2.5 rounded-xl border text-[13px] font-semibold transition-all",
                            isSelected 
                              ? `${config.bg} ${config.border} ${config.text} scale-[1.03]` 
                              : "border-[var(--separator)]/40 hover:bg-[var(--bg-secondary)] text-[var(--label-secondary)]"
                          )}
                        >
                          {getPlatformIcon(p, 14)}
                          {config.name}
                        </button>
                      );
                    })}
                  </div>

                  {/* Generate Button */}
                  <button
                    onClick={handleGenerateAIReformat}
                    disabled={selectedTargetPlatforms.length === 0 || isGeneratingReformat}
                    className="w-full py-3.5 rounded-xl bg-[var(--accent)] text-white text-[13px] font-bold hover:opacity-90 transition-opacity disabled:opacity-40 flex items-center justify-center gap-2 shadow-sm"
                  >
                    {isGeneratingReformat ? (
                      <RefreshCw size={15} className="animate-spin" />
                    ) : (
                      <Sparkles size={15} />
                    )}
                    Generate Cross-Platform Reformatted Drafts
                  </button>

                  {/* AI Generating Skeletons */}
                  {isGeneratingReformat && (
                    <div className="space-y-3 pt-3">
                      <div className="p-4 bg-[var(--bg-secondary)] rounded-2xl animate-pulse space-y-2">
                        <div className="h-4 bg-[var(--bg-tertiary)] rounded w-1/4" />
                        <div className="h-3 bg-[var(--bg-tertiary)] rounded w-3/4" />
                        <div className="h-3 bg-[var(--bg-tertiary)] rounded w-1/2" />
                      </div>
                    </div>
                  )}

                  {/* Error Indicator */}
                  {reformatError && (
                    <div className="p-4 bg-red-500/10 text-red-500 rounded-2xl border border-red-500/20 text-[13px] font-bold flex items-center gap-2">
                      <AlertCircle size={16} />
                      {reformatError}
                    </div>
                  )}

                  {/* Suggestions Display */}
                  {reformatSuggestions.length > 0 && (
                    <div className="space-y-4 pt-3 border-t border-[var(--separator)]/40">
                      <h5 className="text-[13px] font-bold text-[var(--label-primary)] uppercase tracking-widest px-1">Gemini Proposed Drafts</h5>
                      <div className="space-y-4">
                        {reformatSuggestions.map((s, idx) => {
                          const config = getPlatformStyle(s.platform);
                          return (
                            <div key={idx} className={cn("p-4 rounded-2xl border bg-[var(--bg-secondary)]/30 flex flex-col gap-2.5", config.border)}>
                              <div className="flex items-center justify-between">
                                <span className={cn("text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full", config.bg, config.text)}>
                                  {config.name} Draft
                                </span>
                                <button
                                  onClick={() => handleSaveAIBlock(s)}
                                  className="text-[12px] font-bold text-[var(--accent)] hover:underline flex items-center gap-1"
                                >
                                  <Plus size={14} /> Save Draft
                                </button>
                              </div>
                              <h6 className="text-[13px] font-bold text-[var(--label-primary)]">{s.title}</h6>
                              <p className="text-[12px] text-[var(--label-secondary)] whitespace-pre-wrap leading-relaxed font-medium">
                                {s.body}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer Actions */}
              <div className="p-6 bg-[var(--bg-secondary)]/40 border-t border-[var(--separator)] flex flex-wrap gap-3 items-center justify-between">
                <button
                  onClick={() => handleDeleteEvent(selectedEvent.id)}
                  className="px-4 py-3 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500/20 text-[13px] font-bold transition-colors flex items-center gap-2"
                >
                  <Trash2 size={15} /> Delete Block
                </button>
                
                <div className="flex items-center gap-2">
                  {selectedEvent.scheduledDate && (
                    <button
                      onClick={() => handleUnschedule(selectedEvent)}
                      className="px-4 py-3 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--separator)]/60 text-[var(--label-secondary)] hover:text-[var(--label-primary)] text-[13px] font-bold transition-colors"
                    >
                      Unschedule Draft
                    </button>
                  )}
                  <button
                    onClick={() => setShowDetailModal(false)}
                    className="px-5 py-3 rounded-xl bg-[var(--accent)] text-white text-[13px] font-bold hover:opacity-90 transition-opacity"
                  >
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 5. Standard New Event / Click Day to Create Block Modal */}
      <AnimatePresence>
        {showEventModal && selectedDate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[var(--bg-tertiary)] w-full max-w-md rounded-[28px] shadow-2xl overflow-hidden border border-[var(--separator)] p-6 space-y-5"
            >
              <div>
                <h3 className="text-[18px] font-bold tracking-tight text-[var(--label-primary)]">Schedule Content</h3>
                <p className="text-[13px] text-[var(--label-secondary)] mt-0.5">
                  For {format(selectedDate, 'MMMM d, yyyy')}
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold tracking-wider text-[var(--label-secondary)] uppercase pl-1">Title / Hook</label>
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
                  <label className="text-[11px] font-bold tracking-wider text-[var(--label-secondary)] uppercase pl-1">Content Body / Script</label>
                  <textarea 
                    value={newEventBody}
                    onChange={(e) => setNewEventBody(e.target.value)}
                    placeholder="Draft the narrative script, outline, or captions here..."
                    className="w-full h-24 bg-[var(--bg-secondary)] border border-[var(--separator)]/40 rounded-xl px-4 py-2.5 text-[14px] outline-none text-[var(--label-primary)] focus:border-[var(--accent)] transition-colors resize-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold tracking-wider text-[var(--label-secondary)] uppercase pl-1">Target Platform</label>
                  <div className="flex bg-[var(--bg-secondary)] p-1 rounded-xl gap-1">
                    {['youtube', 'tiktok', 'instagram', 'twitter'].map((p) => {
                      const active = newEventPlatform === p;
                      const style = getPlatformStyle(p);
                      return (
                        <div
                          key={p}
                          onClick={() => setNewEventPlatform(p)}
                          className={cn(
                            "flex-1 py-2 rounded-lg text-[12px] font-bold text-center transition-all cursor-pointer flex items-center justify-center gap-1 capitalize",
                            active 
                              ? `${style.bg} ${style.text} shadow-sm border ${style.border}` 
                              : "text-[var(--label-secondary)] hover:text-[var(--label-primary)]"
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
                  <label className="text-[11px] font-bold tracking-wider text-[var(--label-secondary)] uppercase pl-1">Publishing Status</label>
                  <div className="flex bg-[var(--bg-secondary)] p-1 rounded-xl gap-1">
                    {['Draft', 'Scheduled'].map((s) => (
                      <div
                        key={s}
                        onClick={() => setNewEventStatus(s)}
                        className={cn(
                          "flex-1 py-2 rounded-lg text-[12px] font-bold text-center transition-all cursor-pointer",
                          newEventStatus === s 
                            ? "bg-[var(--bg-tertiary)] text-[var(--accent)] shadow-sm" 
                            : "text-[var(--label-secondary)]"
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
                  onClick={() => setShowEventModal(false)}
                  className="flex-1 py-3.5 rounded-xl font-bold text-[14px] bg-[var(--bg-secondary)] hover:bg-[var(--bg-primary)] text-[var(--label-primary)] transition-colors border border-[var(--separator)]/30"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleAddEvent}
                  disabled={!newEventTitle}
                  className="flex-1 py-3.5 rounded-xl font-bold text-[14px] bg-[var(--accent)] text-white hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  Confirm & Add
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

