import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  CircleNotch as Loader2, 
  Sparkle as Sparkles, 
  ArrowsClockwise as RefreshCw, 
  Lightbulb, 
  TextT as Type, 
  Image as ImageIcon, 
  Hash, 
  Microphone as Mic, 
  FilmScript, 
  Lightning, 
  FloppyDisk as Save,
  LockKey
} from '@phosphor-icons/react';
import { cn } from '../lib/utils';
import BrandIcon from './BrandIcon';
import { apiFetch } from '../firebase';
import { quickPolish, remixContent, generateContentIdeas } from '../services/gemini';

// Extracted from ContentStudio.tsx
export const PLATFORMS = [
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

export interface ContentEditorViewProps {
  title: string;
  setTitle: (t: string) => void;
  body: string;
  setBody: React.Dispatch<React.SetStateAction<string>>;
  platform: string;
  setPlatform: (p: string) => void;
  brand: any;
  showToast: (msg: string) => void;
  setStudioTab: (tab: any) => void;
  isSaving: boolean;
  onPublish: () => void;
  isScoring: boolean;
  onScore: () => void;
  isPolishing: boolean;
  setIsPolishing: (b: boolean) => void;
  onFormat: (targetPlatformId: string, label: string, isPro?: boolean) => void;
}

export default function ContentEditorView({
  title, setTitle,
  body, setBody,
  platform, setPlatform,
  brand, showToast,
  setStudioTab,
  isSaving, onPublish,
  isScoring, onScore,
  isPolishing, setIsPolishing,
  onFormat
}: ContentEditorViewProps) {

  // Moved Local State
  const [remixInstruction, setRemixInstruction] = useState('');
  const [showBrainstorm, setShowBrainstorm] = useState(false);
  const [isBrainstorming, setIsBrainstorming] = useState(false);
  const [brainstormIdeas, setBrainstormIdeas] = useState<any[] | null>(null);
  
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<BlobPart[]>([]);

  // Moved Handlers
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

  const handlePolish = async () => {
    if (!body || !brand) return;
    setIsPolishing(true);
    try {
      const polished = await quickPolish(body);
      setBody(polished);
    } catch (error: any) {
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
                // Assuming transcribeAudio logic exists in your gemini service, but we'll inline a fetch here to avoid circular dep if needed, or we can just import it.
                // Oh wait, transcribeAudio is exported from '../services/gemini'
                // Let's import it at the top.
                const { transcribeAudio } = await import('../services/gemini');
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
          contents: `Rewrite the following content as a detailed video script. Include time markers (e.g., [0:00 - 0:05]), settings, and AI Avatar look/sound based on the brand: ${JSON.stringify(brand.avatar || brand.visual_style)}. Ensure it is highly engaging and formatted well.\n\nContent:\n${body}`
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

  ;

  // Returned JSX (Extracted from ContentStudio.tsx)
  return (
    <section className="bg-[var(--bg-tertiary)] ios-card overflow-hidden">
      {/* Platform Selection */}
      <div className="p-2 border-b border-[var(--separator)]">
        <div className="flex bg-[var(--bg-secondary)] p-1 rounded-[12px] overflow-x-auto no-scrollbar gap-1">
          {PLATFORMS.map((p) => (
            <button
              key={p.id}
              onClick={() => onFormat(p.id, p.label, false)}
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
            onClick={onPublish}
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
            onClick={onScore}
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
  );
}
