import { apiFetch } from "../firebase";
import React, { useState, useRef, useEffect } from 'react';
import { PaperPlaneRight as Send, CheckCircle as CheckCircle2, ArrowsClockwise as RefreshCw, TextT as Type, Hash, Image as ImageIcon, CaretRight as ChevronRight, DownloadSimple as Download, Microphone as Mic, SpeakerHigh as Volume2, SpeakerSlash, Rewind, FastForward, VideoCamera as VideoIcon, Play, CircleNotch as Loader2, FloppyDisk as Save, Sparkle as Sparkles, MagnifyingGlass as Search, GearSix as Settings, DotsThree as MoreHorizontal, Lightbulb, Article, FilmScript, LockKey, Plus, TrendUp, X, Lightning } from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'motion/react';
import { scoreContent, quickPolish, remixContent, optimizeSearchTerms, generateSpeech, transcribeAudio, generateVideo, getOperationStatus, generateContentIdeas, generateSmartSuggestions } from '../services/gemini';
import { cn } from '../lib/utils';
import { db, serverTimestamp, handleFirestoreError, OperationType } from '../firebase';
import { doc, setDoc, collection, addDoc, getDocs, query, where, orderBy } from 'firebase/firestore';
import VideoStudio from "./VideoStudio";
import BrandIcon from './BrandIcon';
import CalendarView from './CalendarView';
import CustomVideoPlayer from './CustomVideoPlayer';
import ScenePlanner from './ScenePlanner';
import RetentionHookLab from './RetentionHookLab';
import localforage from 'localforage';
import Confetti from './Confetti';

const PLATFORMS = [
  { id: 'youtube', label: 'YouTube', distributionLabel: 'Format for YouTube', icon: (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
    </svg>
  ) },
  { id: 'tiktok', label: 'TikTok', distributionLabel: 'Format for TikTok', icon: (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5.8 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.84-.1z"/>
    </svg>
  ) },
  { id: 'instagram', label: 'Instagram', distributionLabel: 'Format for Instagram', icon: (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
    </svg>
  ) },
  { id: 'twitter', label: 'X', distributionLabel: 'Format for X (Twitter)', icon: (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
    </svg>
  ) },
];

export default function Create({ brand, setActiveTab, user, selectedIdea, setSelectedIdea }: { brand: any, setActiveTab: (tab: string) => void, user: any, selectedIdea?: any, setSelectedIdea?: any }) {
  const [studioTab, setStudioTab] = useState<'editor' | 'retention' | 'planner' | 'calendar'>('editor');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [remixInstruction, setRemixInstruction] = useState('');
  const [videoHistory, setVideoHistory] = useState<any[]>([]);
  const [allProjects, setAllProjects] = useState<any[]>([]);
  const [isAnalyzingSuggestions, setIsAnalyzingSuggestions] = useState(false);
  const [suggestionsData, setSuggestionsData] = useState<any>(null);
  const [activeSuggestionTab, setActiveSuggestionTab] = useState<'trending' | 'angles'>('trending');
  const [activePreviewVideo, setActivePreviewVideo] = useState<any>(null);

  const loadVideoHistory = async () => {
    if (!user) return;
    try {
      const q = query(
        collection(db, 'videos'),
        where('userId', '==', user.uid),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      const docs = await Promise.all(snapshot.docs.map(async (doc) => {
        const data = doc.data();
        let url = data.url;
        if (url && url.startsWith('local:')) {
          try {
            const blob = await localforage.getItem<Blob>(url);
            if (blob) {
              url = URL.createObjectURL(blob);
            }
          } catch (e) {
            console.error('Failed to load local video blob', e);
          }
        }
        return { id: doc.id, ...data, url };
      }));
      setVideoHistory(docs);
    } catch (error) {
      console.error('Failed to load video history', error);
    }
  };

  const loadExistingProjects = async () => {
    if (!user) return;
    try {
      const q = query(
        collection(db, 'projects'),
        where('userId', '==', user.uid)
      );
      const snapshot = await getDocs(q);
      const docs = snapshot.docs
        .filter(doc => doc.data().type === 'content')
        .map(doc => ({ id: doc.id, ...doc.data() }));
      setAllProjects(docs);
    } catch (error) {
      console.error('Failed to load existing projects', error);
    }
  };

  useEffect(() => {
    if (user) {
      loadVideoHistory();
      loadExistingProjects();
    }
  }, [user]);

  const handleGenerateSuggestions = async () => {
    if (!brand) {
      showToast('Please set up your Brand Kit first.');
      return;
    }
    setIsAnalyzingSuggestions(true);
    try {
      const data = await generateSmartSuggestions(brand, allProjects);
      setSuggestionsData(data);
      showToast('Smart suggestions generated!');
    } catch (error: any) {
      console.error('Failed to generate suggestions:', error);
      showToast(error.message || 'Failed to analyze and suggest content.');
    } finally {
      setIsAnalyzingSuggestions(false);
    }
  };

  const handleDownloadVideo = async (url: string, title: string) => {
    try {
      let blob: Blob;
      if (url.startsWith('local:')) {
        const localBlob = await localforage.getItem<Blob>(url);
        if (!localBlob) throw new Error('Local video not found');
        blob = localBlob;
      } else {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Video not found');
        blob = await response.blob();
      }
      
      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'video'}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      showToast('This video has expired and is no longer available to download.');
    }
  };

  useEffect(() => {
    if (selectedIdea) {
      setTitle(selectedIdea.hook || selectedIdea.title || '');
      setBody(selectedIdea.description || '');
      if (setSelectedIdea) {
        setSelectedIdea(null);
      }
    }
  }, [selectedIdea, setSelectedIdea]);
  const [platform, setPlatform] = useState('youtube');
  const [isBrainstorming, setIsBrainstorming] = useState(false);
  const [brainstormIdeas, setBrainstormIdeas] = useState<any[] | null>(null);
  const [showBrainstorm, setShowBrainstorm] = useState(false);
  
  const [showContextSettings, setShowContextSettings] = useState(false);
  const [contentTone, setContentTone] = useState('Professional');
  const [contentAudience, setContentAudience] = useState('');
  const [contentGoal, setContentGoal] = useState('Engagement');
  
  const [isScoring, setIsScoring] = useState(false);
  const [scoreData, setScoreData] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isPolishing, setIsPolishing] = useState(false);
  const [isGeneratingSpeech, setIsGeneratingSpeech] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);

  const [toastMessage, setToastMessage] = useState('');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  const handleBrainstorm = async () => {
    if (!brand) {
      showToast('Please set up your Brand Kit first.');
      return;
    }
    
    if (brainstormIdeas) {
      setShowBrainstorm(!showBrainstorm);
      return;
    }

    setIsBrainstorming(true);
    setShowBrainstorm(true);
    try {
      const ideas = await generateContentIdeas(brand);
      setBrainstormIdeas(ideas);
    } catch (error) {
      console.error('Failed to brainstorm ideas:', error);
      showToast('Failed to generate ideas. Please try again.');
      setShowBrainstorm(false);
    } finally {
      setIsBrainstorming(false);
    }
  };

  const handleScore = async () => {
    if (!body || !brand) return;
    setIsScoring(true);
    setScoreData(null); // Clear previous score while loading
    try {
      const result = await scoreContent(body, `${brand.personality} - ${brand.tagline}`);
      setScoreData(result);
    } catch (error) {
      console.error(error);
      showToast(error.message || 'Scoring failed');
    } finally {
      setIsScoring(false);
    }
  };

  const handlePolish = async () => {
    if (!body || !brand) return;
    setIsPolishing(true);
    try {
      const polished = await quickPolish(body);
      setBody(polished);
    } catch (error) {
      console.error('Polish failed:', error);
      showToast(error.message || 'Polish failed');
    } finally {
      setIsPolishing(false);
    }
  };

  const handleRemix = async () => {
    if (!body || !remixInstruction) return;
    setIsPolishing(true);
    try {
      const remixed = await remixContent(body, remixInstruction);
      setBody(remixed);
      setRemixInstruction('');
    } catch (error: any) {
      console.error('Remix failed:', error);
      showToast(error.message || 'Remix failed');
    } finally {
      setIsPolishing(false);
    }
  };

  const handleOptimizeSearch = async () => {
    if (!body) {
      showToast("Please add some content first to optimize.");
      return;
    }
    setIsPolishing(true);
    showToast("Generating optimized search terms...");
    try {
      const terms = await optimizeSearchTerms(body, contentTone, contentAudience, contentGoal);
      setBody(prev => `${prev}\n\nSearch Optimization:\n${terms}`);
      showToast("Search terms appended to content");
    } catch (error: any) {
      console.error('Optimization failed:', error);
      showToast(error.message || 'Optimization failed');
    } finally {
      setIsPolishing(false);
    }
  };


  const handleFormat = async (targetPlatformId: string, label: string, isPro?: boolean) => {
    if (isPro) {
      showToast(`Upgrade to Pro to unlock formatting for ${label}`);
      return;
    }
    setPlatform(targetPlatformId);
    if (!body) return;
    setIsPolishing(true);
    showToast(`Formatting for ${label}...`);
    try {
      const response = await apiFetch('/api/gemini/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: "gemini-2.5-flash",
          contents: `Rewrite the following content to be formatted specifically for ${label}. Adapt the tone, length, and style appropriately. Keep it high quality.\n\nContent:\n${body}`
        })
      });
      if (!response.ok) throw new Error('Format failed');
      const data = await response.json();
      setBody(data.text);
      showToast(`Formatted for ${label}`);
    } catch (error) {
      console.error('Format error:', error);
      showToast('Failed to format content');
    } finally {
      setIsPolishing(false);
    }
  };

  const handleHashtags = async () => {
    if (!body) return;
    setIsPolishing(true);
    showToast('Generating hashtags...');
    try {
      const response = await apiFetch('/api/gemini/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: "gemini-2.5-flash",
          contents: `Generate 5 relevant hashtags for the following content. Output ONLY the hashtags separated by spaces, nothing else.\n\nContent:\n${body}`
        })
      });
      if (!response.ok) throw new Error('Hashtags failed');
      const data = await response.json();
      setBody(prev => prev + '\n\n' + data.text.trim());
      showToast('Hashtags added');
    } catch (error) {
      console.error('Hashtags error:', error);
      showToast('Failed to generate hashtags');
    } finally {
      setIsPolishing(false);
    }
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsPolishing(true);
    showToast('Analyzing image...');
    
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = async () => {
      const base64Image = (reader.result as string).split(',')[1];
      try {
        const response = await apiFetch('/api/gemini/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: "gemini-2.5-flash",
            contents: {
              parts: [
                {
                  inlineData: {
                    mimeType: file.type,
                    data: base64Image,
                  },
                },
                { text: "Describe this image in detail so I can use it as context for content creation." },
              ],
            }
          })
        });
        if (!response.ok) throw new Error('Image analysis failed');
        const data = await response.json();
        setBody(prev => prev + '\n\n[Image Details: ' + data.text.trim() + ']');
        showToast('Image details added');
      } catch (err) {
        console.error(err);
        showToast('Failed to analyze image');
      } finally {
        setIsPolishing(false);
      }
    };
  };

  const handleGenerateScript = async () => {
    if (!body || !brand) return;
    setIsPolishing(true);
    showToast('Generating detailed video script...');
    try {
      const response = await apiFetch('/api/gemini/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: "gemini-2.5-flash",
          contents: `Rewrite the following content as a detailed video script. Include time markers (e.g., [0:00 - 0:05]), settings, and AI Avatar look/sound based on the brand: ${JSON.stringify(brand.avatar || brand.visual_style)}. Ensure it is highly engaging and formatted well.

Content:
${body}`
        })
      });
      if (!response.ok) throw new Error('Failed to generate script');
      const data = await response.json();
      setBody(data.text);
      showToast('Video script generated');
    } catch (err) {
      console.error(err);
      showToast('Failed to generate video script');
    } finally {
      setIsPolishing(false);
    }
  };

  const handleMicrophone = async () => {
    if (isRecording) {
      mediaRecorder.current?.stop();
      setIsRecording(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder.current = new MediaRecorder(stream);
        audioChunks.current = [];
        
        mediaRecorder.current.ondataavailable = (e) => {
          if (e.data.size > 0) audioChunks.current.push(e.data);
        };
        
        mediaRecorder.current.onstop = async () => {
          setIsTranscribing(true);
          try {
            const audioBlob = new Blob(audioChunks.current, { type: mediaRecorder.current?.mimeType || 'audio/webm' });
            const reader = new FileReader();
            reader.readAsDataURL(audioBlob);
            reader.onloadend = async () => {
              const base64Audio = (reader.result as string).split(',')[1];
              try {
                const transcribedText = await transcribeAudio(base64Audio, mediaRecorder.current?.mimeType || 'audio/webm');
                setBody(prev => prev + (prev ? '\n' : '') + transcribedText);
                showToast('Audio transcribed');
              } catch (err) {
                console.error(err);
                showToast('Failed to transcribe audio');
              } finally {
                setIsTranscribing(false);
              }
            };
          } catch (err) {
            console.error(err);
            setIsTranscribing(false);
          }
          stream.getTracks().forEach(track => track.stop());
        };
        
        mediaRecorder.current.start();
        setIsRecording(true);
        showToast('Recording... click again to stop');
      } catch (err) {
        console.error('Microphone access denied:', err);
        showToast('Microphone access denied');
      }
    }
  };

  const handlePublish = async () => {
    if (!user || !body) return;
    setIsSaving(true);
    try {
      const projectRef = collection(db, 'projects');
      await addDoc(projectRef, {
        userId: user.uid,
        name: title || 'Untitled Content',
        type: 'content',
        data: {
          title,
          body,
          platform,
          score: scoreData?.score || 0
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }).catch(err => handleFirestoreError(err, OperationType.CREATE, 'projects'));
      
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      
      if (allProjects.length === 0) {
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 5000);
      }
      
      loadExistingProjects();
    } catch (error) {
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  if (!brand) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center space-y-8 max-w-sm mx-auto">
        <div className="w-24 h-24 bg-[var(--bg-secondary)] rounded-[22px] flex items-center justify-center ios-elevated">
          <Sparkles className="w-10 h-10 text-[var(--label-tertiary)]" strokeWidth={1.5} />
        </div>
        <div className="space-y-4">
          <h2 className="font-serif text-[28px] font-semibold tracking-[-0.015em]">Identity Required</h2>
          <p className="text-[var(--label-secondary)] text-[17px] font-medium leading-tight">
            Architect your brand identity before crafting world-class content with AI scoring.
          </p>
        </div>
        <button 
          onClick={() => setActiveTab('brand')}
          className="ios-button ios-button-filled w-full"
        >
          Build Brand Identity
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between px-1 pt-4 pb-4 gap-4">
        <h1 className="font-serif text-[36px] font-semibold tracking-[-0.015em] text-[var(--label-primary)] shrink-0">Create</h1>
        
        <div className="flex bg-[var(--bg-secondary)]/50 p-1.5 rounded-[24px] w-full max-w-[620px] shadow-inner border border-[var(--separator)]/30 backdrop-blur-md overflow-x-auto no-scrollbar">
          <button
            onClick={() => setStudioTab('editor')}
            className={cn(
              "shrink-0 whitespace-nowrap px-6 py-2 rounded-[18px] text-[14px] font-bold transition-all duration-300 transform",
              studioTab === 'editor' 
                ? "bg-[var(--accent)] text-white shadow-lg scale-[1.02]" 
                : "text-[var(--label-secondary)] hover:text-[var(--label-primary)] hover:bg-[var(--bg-secondary)]"
            )}
          >
            Editor
          </button>
          <button
            onClick={() => setStudioTab('retention')}
            className={cn(
              "shrink-0 whitespace-nowrap px-4 py-2 rounded-[18px] text-[14px] font-bold transition-all duration-300 transform flex items-center justify-center gap-1",
              studioTab === 'retention' 
                ? "bg-[var(--accent)] text-white shadow-lg scale-[1.02]" 
                : "text-[var(--label-secondary)] hover:text-[var(--label-primary)] hover:bg-[var(--bg-secondary)]"
            )}
          >
            <Lightning size={15} weight="fill" className={studioTab === 'retention' ? "text-amber-200" : "text-amber-400"} />
            <span>Retention Lab</span>
          </button>
          <button
            onClick={() => setStudioTab('planner')}
            className={cn(
              "shrink-0 whitespace-nowrap px-4 py-2 rounded-[18px] text-[14px] font-bold transition-all duration-300 transform flex items-center justify-center gap-1",
              studioTab === 'planner' 
                ? "bg-[var(--accent)] text-white shadow-lg scale-[1.02]" 
                : "text-[var(--label-secondary)] hover:text-[var(--label-primary)] hover:bg-[var(--bg-secondary)]"
            )}
          >
            <span>Scene Planner</span>
          </button>
          <button
            onClick={() => setStudioTab('calendar')}
            className={cn(
              "shrink-0 whitespace-nowrap px-6 py-2 rounded-[18px] text-[14px] font-bold transition-all duration-300 transform",
              studioTab === 'calendar' 
                ? "bg-[var(--accent)] text-white shadow-lg scale-[1.02]" 
                : "text-[var(--label-secondary)] hover:text-[var(--label-primary)] hover:bg-[var(--bg-secondary)]"
            )}
          >
            Calendar
          </button>
        </div>
      </div>

      {studioTab === 'calendar' ? (
        <CalendarView user={user} setActiveTab={setActiveTab} />
      ) : studioTab === 'retention' ? (
        <RetentionHookLab
          initialText={body}
          showToast={showToast}
          onApplyHookToEditor={(newHook) => {
            setBody((prev) => (prev ? `${newHook}\n\n${prev}` : newHook));
            setStudioTab('editor');
          }}
          onSendToScenePlanner={() => setStudioTab('planner')}
        />
      ) : studioTab === 'planner' ? (
        <ScenePlanner initialScript={body} initialTitle={title} showToast={showToast} />
      ) : (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-8 space-y-6">
          <section className="bg-[var(--bg-tertiary)] ios-card overflow-hidden">
            {/* Platform Selection */}
            <div className="p-2 border-b border-[var(--separator)]">
              <div className="flex bg-[var(--bg-secondary)] p-1 rounded-[12px] overflow-x-auto no-scrollbar gap-1">
                {PLATFORMS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => handleFormat(p.id, p.label, false)}
                    className={cn(
                      "flex shrink-0 items-center justify-center gap-2 px-4 py-2.5 rounded-[8px] text-[14px] font-semibold transition-all duration-200",
                      platform === p.id 
                        ? "bg-[var(--bg-primary)] text-[var(--accent)] shadow-sm ios-elevated" 
                        : "text-[var(--label-secondary)] hover:text-[var(--label-primary)] hover:bg-[var(--bg-primary)]/50"
                    )}
                  >
                    <div className="shrink-0 flex items-center justify-center w-5 h-5">{p.icon}</div>
                    <span>{p.label}</span>
                    {false && <LockKey size={14} className="ml-1 opacity-50 shrink-0" />}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-6 space-y-4 relative">
              {isPolishing && (
                <div className="absolute inset-0 z-10 bg-[var(--bg-tertiary)]/60 backdrop-blur-[2px] flex flex-col items-center justify-center gap-4 animate-in fade-in duration-300">
                  <div className="flex items-center gap-3 bg-[var(--bg-primary)] px-5 py-3 rounded-2xl shadow-xl border border-[var(--separator)]">
                    <Sparkles size={20} className="text-[var(--accent)] animate-pulse" strokeWidth={1.5} />
                    <span className="text-[15px] font-semibold">AI is polishing your narrative...</span>
                  </div>
                </div>
              )}
              <div className="flex items-center justify-between gap-4">
                <input 
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Title or Hook"
                  className="w-full font-serif text-[24px] font-semibold tracking-[-0.015em] outline-none placeholder:text-[var(--label-tertiary)] bg-transparent"
                />
                <button 
                  onClick={handleBrainstorm}
                  className={cn(
                    "flex-shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-full text-[13px] font-semibold transition-all",
                    showBrainstorm || isBrainstorming ? "bg-[var(--accent)] text-white" : "bg-[var(--bg-tertiary)] text-[var(--accent)] hover:bg-[var(--accent)] hover:text-white"
                  )}
                >
                  {isBrainstorming ? <Loader2 size={16} className="animate-spin" /> : <Lightbulb size={16} weight={showBrainstorm ? "fill" : "regular"} />}
                  Ideas
                </button>
              </div>

              <AnimatePresence>
                {showBrainstorm && (
                  <motion.div
                    initial={{ opacity: 0, height: 0, scale: 0.95 }}
                    animate={{ opacity: 1, height: 'auto', scale: 1 }}
                    exit={{ opacity: 0, height: 0, scale: 0.95 }}
                    className="overflow-hidden"
                  >
                    <div className="bg-[var(--bg-tertiary)] rounded-2xl p-4 mt-2 border border-[var(--separator)] shadow-lg space-y-3">
                      <div className="flex items-center justify-between text-[13px] font-semibold text-[var(--label-secondary)] px-1">
                        <span className="uppercase tracking-widest">Brand Aligned Ideas</span>
                        <button onClick={handleBrainstorm} className="text-[var(--accent)] flex items-center gap-1 hover:underline">
                          <RefreshCw size={14} className={isBrainstorming ? "animate-spin" : ""} /> Regenerate
                        </button>
                      </div>
                      
                      {isBrainstorming && !brainstormIdeas ? (
                        <div className="py-6 flex flex-col items-center justify-center gap-3 text-[var(--label-secondary)]">
                          <Loader2 className="animate-spin text-[var(--accent)]" size={24} />
                          <span className="text-[13px] font-medium">Analyzing brand vector...</span>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                          {brainstormIdeas?.map((idea, idx) => (
                            <button
                              key={idx}
                              onClick={() => {
                                setTitle(idea.title);
                                setBody(idea.hook + '\n\n' + idea.description);
                                setShowBrainstorm(false);
                              }}
                              className="text-left bg-[var(--bg-primary)] p-3 rounded-xl border border-[var(--separator)] hover:border-[var(--accent)] transition-all group ios-elevated hover:shadow-md"
                            >
                              <h4 className="font-semibold text-[14px] text-[var(--label-primary)] group-hover:text-[var(--accent)] transition-colors line-clamp-1">{idea.title}</h4>
                              <p className="text-[13px] text-[var(--label-secondary)] mt-1.5 line-clamp-2 leading-relaxed">{idea.hook}</p>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <textarea 
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="What's the narrative? AI will score your brand voice..."
                className="w-full h-[400px] text-[17px] leading-relaxed outline-none resize-none placeholder:text-[var(--label-tertiary)] bg-transparent font-medium"
              />
            </div>
            
            <div className="px-6 py-4 border-t border-[var(--separator)] flex flex-col gap-2">
              <div className="flex gap-2 h-10">
                <input 
                  type="text" 
                  placeholder="How should I refine this? (e.g. 'Make it punchier', 'Translate to Spanish')" 
                  value={remixInstruction} 
                  onChange={e => setRemixInstruction(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleRemix()}
                  className="flex-1 bg-[var(--bg-secondary)] border-none rounded-[10px] px-4 text-[14px] outline-none placeholder:text-[var(--label-tertiary)]"
                />
                <button 
                  onClick={handleRemix}
                  disabled={isPolishing || !remixInstruction || !body}
                  className="ios-button ios-button-tinted px-4"
                  title="Remix with AI"
                >
                  {isPolishing ? <Loader2 className="animate-spin" size={17} /> : <Sparkles size={17} />}
                </button>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-[var(--separator)] flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4">
              <div className="flex flex-wrap gap-2 sm:gap-5 text-[var(--accent)]">
                <button onClick={handlePolish} className="ios-button ios-button-gray px-3" title="Polish Text"><Type size={17} strokeWidth={1.5} /></button>
                <button onClick={handleImageClick} className="ios-button ios-button-gray px-3" title="Upload Image"><ImageIcon size={17} strokeWidth={1.5} /></button>
                <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
                <button onClick={handleHashtags} className="ios-button ios-button-gray px-3" title="Generate Hashtags"><Hash size={17} strokeWidth={1.5} /></button>
                <button onClick={handleMicrophone} className={cn("ios-button ios-button-gray px-3", isRecording && "text-red-500")} title="Voice Dictation"><Mic size={17} strokeWidth={1.5} /></button>
                <button onClick={handleGenerateScript} className="ios-button ios-button-gray px-3" title="Generate Video Script with Time Markers"><FilmScript size={17} strokeWidth={1.5} /></button>
              </div>
              
              <div className="flex flex-wrap items-center gap-2 mt-4 sm:mt-0 border-t border-[var(--separator)] sm:border-0 pt-4 sm:pt-0">
                <button 
                  onClick={() => setStudioTab('retention')}
                  disabled={!body}
                  className="ios-button ios-button-gray"
                  title="Optimize first 5-second viewer retention"
                >
                  <Lightning size={17} className="mr-1.5 hidden sm:inline-block text-amber-400" weight="fill" />
                  <span>Optimize Hook</span>
                </button>
                <button 
                  onClick={() => setStudioTab('planner')}
                  disabled={!body}
                  className="ios-button ios-button-gray"
                  title="Segment script into visual beats"
                >
                  <FilmScript size={17} strokeWidth={1.5} className="mr-1.5 hidden sm:inline-block text-[var(--accent)]" />
                  <span>Scene Plan</span>
                </button>
                <button 
                  onClick={handlePublish}
                  disabled={isSaving || !body}
                  className="ios-button ios-button-gray"
                >
                  {isSaving ? <Loader2 size={17} strokeWidth={1.5} className="mr-2 animate-spin" /> : <Save size={17} strokeWidth={1.5} className="mr-2 hidden sm:inline-block" />}
                  Save
                </button>
                <button 
                  onClick={handlePolish}
                  disabled={isPolishing || !body}
                  className="ios-button ios-button-tinted"
                >
                  {isPolishing ? (
                    <RefreshCw size={17} strokeWidth={1.5} className="mr-2 animate-spin hidden sm:inline-block" />
                  ) : (
                    <Sparkles size={17} strokeWidth={1.5} className="mr-2 hidden sm:inline-block" />
                  )}
                  <span className="hidden xl:inline">Auto-Polish</span>
                  <span className="xl:hidden">Polish</span>
                </button>
                <button 
                  onClick={handleScore}
                  disabled={isScoring || !body}
                  className="ios-button ios-button-filled"
                >
                  {isScoring ? (
                    <Loader2 size={17} strokeWidth={1.5} className="mr-2 animate-spin" />
                  ) : (
                    <BrandIcon size={17} strokeWidth={1.5} className="mr-2 hidden sm:inline-block" />
                  )}
                  Score
                </button>
              </div>
            </div>
          </section>

          {/* Gemini Video Studio */}
          <VideoStudio 
             body={body}
             title={title}
             platform={platform}
             brand={brand}
             showToast={showToast}
             user={user}
             onVideoSaved={loadVideoHistory}
          />

          {/* AI Score Feedback & Skeletons */}
          <AnimatePresence mode="wait">
            {isScoring ? (
              <motion.section 
                key="loading-score"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                <span className="ios-label flex items-center gap-2">
                  <RefreshCw size={14} strokeWidth={1.5} className="animate-spin" />
                  AI is analyzing your content...
                </span>
                <div className="bg-[var(--bg-tertiary)] ios-card overflow-hidden divide-y divide-[var(--separator)] animate-pulse">
                  <div className="p-10 flex flex-col items-center gap-3">
                    <div className="w-20 h-16 bg-[var(--bg-secondary)] rounded-2xl" />
                    <div className="w-32 h-4 bg-[var(--bg-secondary)] rounded-full" />
                  </div>
                  <div className="p-6 bg-[var(--bg-secondary)]/30 space-y-2">
                    <div className="w-full h-3 bg-[var(--bg-tertiary)] rounded-full" />
                    <div className="w-4/5 h-3 bg-[var(--bg-tertiary)] rounded-full" />
                  </div>
                  {[1, 2].map((i) => (
                    <div key={i} className="p-4 flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full bg-[var(--bg-secondary)]" />
                      <div className="w-2/3 h-3 bg-[var(--bg-secondary)] rounded-full" />
                    </div>
                  ))}
                </div>
              </motion.section>
            ) : scoreData && (
              <motion.section 
                key="score-data"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-2"
              >
                <span className="ios-label">AI Intelligence Score</span>
                <div className="bg-[var(--bg-tertiary)] ios-card overflow-hidden divide-y divide-[var(--separator)]">
                   <div className="p-6 flex flex-col items-center">
                      <div className="font-serif text-[48px] font-semibold tracking-[-0.015em] leading-none mb-1">{scoreData.score}</div>
                      <div className={cn(
                        "text-[13px] font-bold uppercase",
                        scoreData.score > 70 ? "text-[var(--system-green)]" : "text-[var(--system-orange)]"
                      )}>
                        {scoreData.score > 70 ? "High Fidelity" : "Needs Refinement"}
                      </div>
                   </div>
                   <div className="p-5 bg-[var(--bg-secondary)]/30">
                      <p className="text-[15px] font-medium leading-snug">{scoreData.feedback}</p>
                   </div>
                   {scoreData.suggestions.map((s: string, i: number) => (
                     <div key={i} className="p-4 flex items-center gap-3">
                        <CheckCircle2 size={18} strokeWidth={1.5} className="text-[var(--system-green)] shrink-0" />
                        <span className="text-[15px] font-medium">{s}</span>
                     </div>
                   ))}
                </div>
              </motion.section>
            )}
          </AnimatePresence>



        </div>

        {/* Create Settings / Tools */}
         <div className="lg:col-span-4 space-y-8">
           {/* Smart Content Suggestions Section */}
           <section>
             <span className="ios-label flex items-center gap-1.5">
               <TrendUp size={16} className="text-[var(--accent)]" />
               Smart Content Suggestions
             </span>
             <div className="bg-[var(--bg-tertiary)] ios-card p-5 border border-[var(--separator)]/50 shadow-sm space-y-4">
               {!suggestionsData && !isAnalyzingSuggestions ? (
                 <div className="space-y-4 text-center py-2">
                   <div className="w-12 h-12 rounded-full bg-[var(--accent)]/10 flex items-center justify-center mx-auto text-[var(--accent)]">
                     <Sparkles size={24} />
                   </div>
                   <div className="space-y-1.5">
                     <p className="text-[14px] font-bold text-[var(--label-primary)]">Analyze Performance DNA</p>
                     <p className="text-[12px] text-[var(--label-secondary)] leading-relaxed font-medium">
                       We'll inspect your previous {allProjects.length} projects to find high-performing niches and generate trending topics & unique custom angles.
                     </p>
                   </div>
                   <button
                     onClick={handleGenerateSuggestions}
                     className="ios-button ios-button-filled w-full flex items-center justify-center gap-2 py-2.5 text-[13px] font-bold cursor-pointer"
                   >
                     <Sparkles size={16} />
                     Analyze & Suggest
                   </button>
                 </div>
               ) : isAnalyzingSuggestions ? (
                 <div className="py-8 flex flex-col items-center justify-center text-center space-y-5">
                   {/* Pulsing glow animation */}
                   <div className="relative w-16 h-16 flex items-center justify-center">
                     <motion.div
                       animate={{
                         scale: [1, 1.3, 1],
                         opacity: [0.5, 0.1, 0.5]
                       }}
                       transition={{
                         duration: 2,
                         repeat: Infinity,
                         ease: "easeInOut"
                       }}
                       className="absolute inset-0 rounded-full bg-[var(--accent)]/20"
                     />
                     <div className="relative w-10 h-10 rounded-full bg-[var(--accent)]/10 flex items-center justify-center text-[var(--accent)]">
                       <Loader2 size={20} className="animate-spin" />
                     </div>
                   </div>
                   <div className="space-y-1">
                     <p className="text-[14px] font-bold text-[var(--label-primary)] animate-pulse">Running smart analysis...</p>
                     <p className="text-[11px] text-[var(--label-tertiary)] font-semibold">Matching brand vector with social footprint</p>
                   </div>
                 </div>
               ) : (
                 <div className="space-y-4">
                   {/* Analysis bubble */}
                   <div className="bg-[var(--bg-secondary)] border border-[var(--separator)] p-3 rounded-xl shadow-inner text-[13px] leading-relaxed text-[var(--label-secondary)] font-medium">
                     <span className="font-bold text-[var(--label-primary)] flex items-center gap-1 mb-1">
                       <Sparkles size={14} className="text-[var(--accent)]" /> Niche Footprint Analysis
                     </span>
                     {suggestionsData.analysis}
                   </div>

                   {/* Tabs */}
                   <div className="flex bg-[var(--bg-secondary)] p-1 rounded-xl border border-[var(--separator)]">
                     <button
                       onClick={() => setActiveSuggestionTab('trending')}
                       className={cn(
                         "flex-1 py-1.5 rounded-lg text-[12px] font-bold transition-all cursor-pointer",
                         activeSuggestionTab === 'trending'
                           ? "bg-[var(--accent)] text-white shadow"
                           : "text-[var(--label-secondary)] hover:text-[var(--label-primary)]"
                       )}
                     >
                       Trending Topics
                     </button>
                     <button
                       onClick={() => setActiveSuggestionTab('angles')}
                       className={cn(
                         "flex-1 py-1.5 rounded-lg text-[12px] font-bold transition-all cursor-pointer",
                         activeSuggestionTab === 'angles'
                           ? "bg-[var(--accent)] text-white shadow"
                           : "text-[var(--label-secondary)] hover:text-[var(--label-primary)]"
                       )}
                     >
                       New Angles
                     </button>
                   </div>

                   {/* Tab Contents */}
                   <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                     {activeSuggestionTab === 'trending' ? (
                       suggestionsData.trendingTopics?.map((t: any, idx: number) => (
                         <div
                           key={idx}
                           className="bg-[var(--bg-secondary)] border border-[var(--separator)] p-3.5 rounded-xl hover:border-[var(--accent)]/50 transition-all space-y-2 group"
                         >
                           <div className="flex items-start justify-between gap-2">
                             <div className="space-y-1">
                               <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-[var(--accent)]/15 text-[var(--accent)]">
                                 {t.platform}
                               </span>
                               <h4 className="font-bold text-[14px] text-[var(--label-primary)] leading-tight mt-1">{t.topic}</h4>
                             </div>
                             <button
                               onClick={() => {
                                 setTitle(t.topic);
                                 setBody(`${t.angle}\n\n[Topic Context / Target Justification]:\n${t.justification}`);
                                 showToast(`Loaded "${t.topic}" into editor`);
                               }}
                               className="p-1.5 rounded-lg bg-[var(--bg-primary)] hover:bg-[var(--accent)] hover:text-white transition-colors border border-[var(--separator)] shadow-sm shrink-0 cursor-pointer"
                               title="Adopt Topic"
                             >
                               <Plus size={14} />
                             </button>
                           </div>
                           <p className="text-[12px] text-[var(--label-secondary)] leading-relaxed"><span className="font-semibold text-[var(--label-primary)]">Angle:</span> {t.angle}</p>
                           <p className="text-[11px] text-[var(--label-tertiary)] italic">{t.justification}</p>
                         </div>
                       ))
                     ) : (
                       suggestionsData.newAngles?.map((a: any, idx: number) => (
                         <div
                           key={idx}
                           className="bg-[var(--bg-secondary)] border border-[var(--separator)] p-3.5 rounded-xl hover:border-[var(--accent)]/50 transition-all space-y-2 group"
                         >
                           <div className="flex items-start justify-between gap-2">
                             <div className="space-y-0.5">
                               <p className="text-[10px] font-bold text-[var(--label-tertiary)] uppercase tracking-wider">Concept: {a.originalConcept}</p>
                               <h4 className="font-bold text-[14px] text-[var(--label-primary)] leading-tight">{a.suggestedAngle}</h4>
                             </div>
                             <button
                               onClick={() => {
                                 setTitle(a.suggestedAngle);
                                 setBody(`Hook: "${a.hook}"\n\n[Conceptual Shift]:\nFrom "${a.originalConcept}" to "${a.suggestedAngle}"`);
                                 showToast(`Adopted Angle: "${a.suggestedAngle}"`);
                               }}
                               className="p-1.5 rounded-lg bg-[var(--bg-primary)] hover:bg-[var(--accent)] hover:text-white transition-colors border border-[var(--separator)] shadow-sm shrink-0 cursor-pointer"
                               title="Apply Angle"
                             >
                               <Plus size={14} />
                             </button>
                           </div>
                           <div className="bg-[var(--bg-primary)] p-2 rounded-lg border border-[var(--separator)]/60 text-[12px] leading-relaxed font-semibold italic text-[var(--accent)]">
                             "{a.hook}"
                           </div>
                         </div>
                       ))
                     )}
                   </div>

                   <button
                     onClick={handleGenerateSuggestions}
                     className="w-full py-2 border border-[var(--separator)] hover:bg-[var(--bg-secondary)] text-[12px] font-semibold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                   >
                     <RefreshCw size={12} className={isAnalyzingSuggestions ? "animate-spin" : ""} />
                     Re-Analyze Performance
                   </button>
                 </div>
               )}
             </div>
           </section>

           <section>
              <span className="ios-label">Context & Search Settings</span>
              <div className="bg-[var(--bg-tertiary)] ios-card overflow-hidden divide-y divide-[var(--separator)]">
                 <div onClick={() => setShowContextSettings(!showContextSettings)} className="p-4 flex items-center justify-between active:bg-[var(--separator)] transition-colors cursor-pointer">
                    <div className="flex items-center gap-3">
                       <Settings size={20} strokeWidth={1.5} className="text-[var(--label-secondary)]" />
                       <span className="font-semibold">Content Context</span>
                    </div>
                    <ChevronRight size={18} strokeWidth={1.5} className={cn("text-[var(--label-tertiary)] transition-transform", showContextSettings && "rotate-90")} />
                 </div>
                 <AnimatePresence>
                   {showContextSettings && (
                     <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden bg-[var(--bg-secondary)]/50">
                        <div className="p-4 space-y-4">
                           <div>
                              <label className="text-[12px] font-semibold text-[var(--label-secondary)] mb-1 block">Tone of Voice</label>
                              <select value={contentTone} onChange={e => setContentTone(e.target.value)} className="w-full bg-[var(--bg-primary)] border border-[var(--separator)] rounded-lg p-2 text-[13px] outline-none">
                                 <option>Professional</option>
                                 <option>Casual</option>
                                 <option>Humorous</option>
                                 <option>Inspirational</option>
                                 <option>Authoritative</option>
                              </select>
                           </div>
                           <div>
                              <label className="text-[12px] font-semibold text-[var(--label-secondary)] mb-1 block">Target Audience</label>
                              <input type="text" value={contentAudience} onChange={e => setContentAudience(e.target.value)} placeholder="e.g. Gen Z marketers" className="w-full bg-[var(--bg-primary)] border border-[var(--separator)] rounded-lg p-2 text-[13px] outline-none" />
                           </div>
                           <div>
                              <label className="text-[12px] font-semibold text-[var(--label-secondary)] mb-1 block">Primary Goal</label>
                              <select value={contentGoal} onChange={e => setContentGoal(e.target.value)} className="w-full bg-[var(--bg-primary)] border border-[var(--separator)] rounded-lg p-2 text-[13px] outline-none">
                                 <option>Engagement</option>
                                 <option>Conversion & Sales</option>
                                 <option>Education</option>
                                 <option>Brand Awareness</option>
                              </select>
                           </div>
                        </div>
                     </motion.div>
                   )}
                 </AnimatePresence>
                 <div onClick={handleOptimizeSearch} className="p-4 flex items-center justify-between active:bg-[var(--separator)] transition-colors cursor-pointer">
                    <div className="flex items-center gap-3">
                       <Search size={20} strokeWidth={1.5} className="text-[var(--label-secondary)]" />
                       <span className="font-semibold">Optimize Search</span>
                    </div>
                    {isPolishing ? <Loader2 size={18} className="animate-spin text-[var(--label-tertiary)]" /> : <ChevronRight size={18} strokeWidth={1.5} className="text-[var(--label-tertiary)]" />}
                 </div>
                 <div onClick={() => setActiveTab('brand')} className="p-4 flex items-center justify-between active:bg-[var(--separator)] transition-colors cursor-pointer">
                    <div className="flex items-center gap-3">
                       <BrandIcon size={20} strokeWidth={1.5} className="text-[var(--label-secondary)]" />
                       <span className="font-semibold">Global Brand Profile</span>
                    </div>
                    <ChevronRight size={18} strokeWidth={1.5} className="text-[var(--label-tertiary)]" />
                 </div>
              </div>
           </section>

           <section>
              <span className="ios-label">Distribution</span>
              <div className="bg-[var(--bg-tertiary)] ios-card overflow-hidden divide-y divide-[var(--separator)]">
                 {PLATFORMS.map(p => (
                   <div key={p.id} onClick={() => handleFormat(p.id, p.label, false)} className={cn("p-4 flex items-center justify-between active:bg-[var(--separator)] cursor-pointer transition-colors", p.id === platform ? "bg-[var(--bg-primary)] text-[var(--accent)]" : "text-[var(--label-primary)]")}>
                      <div className="flex items-center gap-3">
                         <div className={cn("flex items-center justify-center w-[22px] h-[22px] text-xl", p.id !== platform && "text-[var(--label-secondary)]")}>
                           {p.icon}
                         </div>
                         <span className="font-semibold">{p.distributionLabel}</span>
                         {false && <span className="text-[10px] uppercase font-bold tracking-wider bg-[var(--accent)]/10 text-[var(--accent)] px-2 py-0.5 rounded-full ml-2 flex items-center gap-1"><LockKey size={10} weight="bold"/> Pro</span>}
                      </div>
                      {p.id === platform ? (
                         <div className="w-2 h-2 rounded-full bg-[var(--accent)] mr-2" />
                      ) : (
                         <ChevronRight size={18} strokeWidth={1.5} className="text-[var(--label-tertiary)]" />
                      )}
                   </div>
                 ))}
              </div>
           </section>

           <section>
              <span className="ios-label">Video History</span>
              <div className="bg-[var(--bg-tertiary)] ios-card overflow-hidden divide-y divide-[var(--separator)] max-h-[400px] overflow-y-auto">
                 {videoHistory.length === 0 ? (
                    <div className="p-6 text-center text-[var(--label-tertiary)] text-[13px]">
                       No videos generated yet.
                    </div>
                 ) : (
                    videoHistory.map(item => (
                       <div key={item.id} onClick={() => setActivePreviewVideo(item)} className="p-3 flex items-center gap-3 hover:bg-[var(--bg-secondary)] transition-colors cursor-pointer group">
                          <div className="relative w-10 h-14 rounded bg-black/10 shrink-0 overflow-hidden group-hover:scale-105 transition-transform">
                              <video src={item.url || undefined} className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-black/35 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                 <Play size={12} weight="fill" className="text-white" />
                              </div>
                           </div>
                          <div className="flex-1 min-w-0">
                             <p className="text-[13px] font-semibold truncate">{item.title}</p>
                             <p className="text-[11px] text-[var(--label-tertiary)] truncate">{new Date(item.createdAt?.toDate?.() || Date.now()).toLocaleDateString()}</p>
                          </div>
                          <a href={item.url} download onClick={(e) => e.stopPropagation()} target="_blank" rel="noopener noreferrer" className="p-2 bg-[var(--bg-primary)] rounded-full text-[var(--accent)] hover:scale-110 active:scale-95 transition-transform shrink-0 shadow-sm border border-[var(--separator)]" title="Download">
                             <Download size={16} weight="bold" />
                          </a>
                       </div>
                    ))
                 )}
              </div>
           </section>
        </div>
      </div>
      )}

      {showConfetti && <Confetti count={150} />}

      <AnimatePresence>
        {saveSuccess && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] pointer-events-none"
          >
            <div className="bg-[var(--system-green)] text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3">
              <CheckCircle2 size={20} strokeWidth={1.5} />
              <span className="font-bold tracking-tight">Saved to CreatorOS</span>
            </div>
          </motion.div>
        )}
        {toastMessage && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] pointer-events-none"
          >
            <div className="bg-[var(--label-primary)] text-[var(--bg-primary)] px-6 py-3 rounded-full shadow-2xl flex items-center gap-3">
              <span className="font-bold tracking-tight">{toastMessage}</span>
            </div>
          </motion.div>
        )}

        {activePreviewVideo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md"
            onClick={() => setActivePreviewVideo(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", duration: 0.4 }}
              className="bg-[var(--bg-tertiary)] rounded-2xl overflow-hidden w-full max-w-md shadow-2xl border border-[var(--separator)]/50 flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="p-4 border-b border-[var(--separator)]/65 flex items-center justify-between bg-[var(--bg-secondary)]/40 backdrop-blur">
                <div className="min-w-0 flex-1">
                  <h3 className="font-serif text-[17px] font-semibold tracking-tight text-[var(--label-primary)] truncate">
                    {activePreviewVideo.title}
                  </h3>
                  {activePreviewVideo.createdAt && (
                    <p className="text-[11px] text-[var(--label-tertiary)] font-medium">
                      Generated {new Date(activePreviewVideo.createdAt?.toDate?.() || Date.now()).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => setActivePreviewVideo(null)}
                  className="p-2 rounded-full hover:bg-[var(--bg-secondary)] text-[var(--label-secondary)] hover:text-[var(--label-primary)] transition-colors cursor-pointer"
                >
                  <X size={18} weight="bold" />
                </button>
              </div>

              {/* Video Player Segment */}
              <div className="aspect-[9/16] max-h-[50vh] bg-black flex items-center justify-center relative overflow-hidden">
                <CustomVideoPlayer videoUrl={activePreviewVideo.url} />
              </div>

              {/* Footer details */}
              {activePreviewVideo.prompt && (
                <div className="p-4 bg-[var(--bg-secondary)]/60 border-t border-[var(--separator)]/65 space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--label-tertiary)] block">
                    Generation Prompt Vector
                  </span>
                  <p className="text-[12px] text-[var(--label-secondary)] leading-relaxed font-medium line-clamp-3 overflow-y-auto max-h-20 select-text">
                    {activePreviewVideo.prompt}
                  </p>
                </div>
              )}

              {/* Interactive buttons */}
              <div className="p-4 border-t border-[var(--separator)]/65 flex items-center justify-end gap-3 bg-[var(--bg-secondary)]/30">
                <button
                  onClick={() => handleDownloadVideo(activePreviewVideo.url, activePreviewVideo.title)}
                  className="ios-button ios-button-tinted flex items-center gap-2 text-[13px] font-bold px-4 py-2 cursor-pointer"
                >
                  <Download size={15} weight="bold" />
                  Download Video
                </button>
                <button
                  onClick={() => setActivePreviewVideo(null)}
                  className="ios-button ios-button-filled text-[13px] font-bold cursor-pointer px-4 py-2"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
