import { apiFetch } from "../firebase";
import React, { useState, useRef, useEffect } from 'react';
import { PaperPlaneRight as Send, CheckCircle as CheckCircle2, ArrowsClockwise as RefreshCw, TextT as Type, Hash, Image as ImageIcon, CaretRight as ChevronRight, DownloadSimple as Download, Microphone as Mic, SpeakerHigh as Volume2, SpeakerSlash, Rewind, FastForward, VideoCamera as VideoIcon, Play, CircleNotch as Loader2, FloppyDisk as Save, Sparkle as Sparkles, MagnifyingGlass as Search, GearSix as Settings, DotsThree as MoreHorizontal, Lightbulb, Article, FilmScript, LockKey, Plus, TrendUp, X, Lightning, Cards } from '@phosphor-icons/react';
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
import ContentEditorView, { PLATFORMS } from './ContentEditorView';
import AIToolPanel from './AIToolPanel';
import ContentIdeaGenerator from './ContentIdeaGenerator';
import ViralTemplatesLibrary from './ViralTemplatesLibrary';

export default function Create({ brand, setActiveTab, user, selectedIdea, setSelectedIdea }: { brand: any, setActiveTab: (tab: string) => void, user: any, selectedIdea?: any, setSelectedIdea?: any }) {
  const [studioTab, setStudioTab] = useState<'editor' | 'ideas' | 'templates' | 'retention' | 'planner' | 'calendar'>('editor');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
    const [videoHistory, setVideoHistory] = useState<any[]>([]);
  const [allProjects, setAllProjects] = useState<any[]>([]);
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
        
          
  const [isScoring, setIsScoring] = useState(false);
  const [scoreData, setScoreData] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isPolishing, setIsPolishing] = useState(false);
  const [isGeneratingSpeech, setIsGeneratingSpeech] = useState(false);
      const [saveSuccess, setSaveSuccess] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

    const audioChunks = useRef<Blob[]>([]);

  const [toastMessage, setToastMessage] = useState('');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
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
          model: "gemini-3.8-flash",
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

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-center px-1 pt-4 pb-4 gap-4">
        
        <div className="flex bg-[var(--bg-secondary)]/50 p-1.5 rounded-[24px] w-full max-w-[850px] shadow-inner border border-[var(--separator)]/30 backdrop-blur-md overflow-x-auto no-scrollbar">
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
            onClick={() => setStudioTab('ideas')}
            className={cn(
              "shrink-0 whitespace-nowrap px-4 py-2 rounded-[18px] text-[14px] font-bold transition-all duration-300 transform flex items-center justify-center gap-1",
              studioTab === 'ideas' 
                ? "bg-[var(--accent)] text-white shadow-lg scale-[1.02]" 
                : "text-[var(--label-secondary)] hover:text-[var(--label-primary)] hover:bg-[var(--bg-secondary)]"
            )}
          >
            <Lightbulb size={15} weight="fill" className={studioTab === 'ideas' ? "text-amber-200" : "text-amber-400"} />
            <span>AI Ideas</span>
          </button>
          <button
            onClick={() => setStudioTab('templates')}
            className={cn(
              "shrink-0 whitespace-nowrap px-4 py-2 rounded-[18px] text-[14px] font-bold transition-all duration-300 transform flex items-center justify-center gap-1",
              studioTab === 'templates' 
                ? "bg-[var(--accent)] text-white shadow-lg scale-[1.02]" 
                : "text-[var(--label-secondary)] hover:text-[var(--label-primary)] hover:bg-[var(--bg-secondary)]"
            )}
          >
            <Cards size={15} weight="fill" className={studioTab === 'templates' ? "text-blue-200" : "text-blue-400"} />
            <span>Templates</span>
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
      ) : studioTab === 'ideas' ? (
        <ContentIdeaGenerator 
          brand={brand} 
          onSelectIdea={(idea) => {
            setTitle(idea.title);
            setBody(`Hook: ${idea.hook}\n\nConcept: ${idea.description}`);
            setStudioTab('editor');
          }} 
        />
      ) : studioTab === 'templates' ? (
        <ViralTemplatesLibrary 
          brand={brand} 
          onSelectTemplate={(template) => {
            setTitle(template.title);
            setBody(`Hook: ${template.hook}\n\nScript: ${template.body}`);
            if (template.platform === 'TikTok' || template.platform === 'YouTube Shorts' || template.platform === 'Instagram') {
              setPlatform('youtube');
            } else if (template.platform === 'Twitter') {
              setPlatform('x');
            } else {
              setPlatform('linkedin');
            }
            setStudioTab('editor');
          }} 
        />
      ) : studioTab === 'retention' ? (
        <RetentionHookLab
          initialText={body}
          showToast={showToast}
          brand={brand}
          onApplyHookToEditor={(newHook) => {
            setBody((prev) => (prev ? `${newHook}\n\n${prev}` : newHook));
            setStudioTab('editor');
          }}
          onSendToScenePlanner={() => setStudioTab('planner')}
        />
      ) : studioTab === 'planner' ? (
        <ScenePlanner initialScript={body} initialTitle={title} showToast={showToast} brand={brand} />
      ) : (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-8 space-y-6">
                    <ContentEditorView
            title={title}
            setTitle={setTitle}
            body={body}
            setBody={setBody}
            platform={platform}
            setPlatform={setPlatform}
            brand={brand}
            showToast={showToast}
            setStudioTab={setStudioTab}
            isSaving={isSaving}
            onPublish={handlePublish}
            isScoring={isScoring}
            onScore={handleScore}
            isPolishing={isPolishing}
            setIsPolishing={setIsPolishing}
            onFormat={handleFormat}
          />

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

          {/* Create Settings / Tools */}
         
        <AIToolPanel 
          brand={brand}
          allProjects={allProjects}
          body={body}
          setBody={setBody}
          setTitle={setTitle}
          showToast={showToast}
          setIsPolishing={setIsPolishing}
          isPolishing={isPolishing}
          platform={platform}
          onFormat={handleFormat}
          setActiveTab={setActiveTab}
          videoHistory={videoHistory}
          onSelectVideo={setActivePreviewVideo}
          isScoring={isScoring}
          scoreData={scoreData}
        />
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
