import React, { useState, useRef, useEffect } from 'react';
import { Lightbulb, ArrowsClockwise as RefreshCw } from '@phosphor-icons/react';
import { Mic, Square, Trash2, Check, Loader2, CheckCircle2 } from 'lucide-react';
import { generateContentIdeas } from '../services/gemini';
import { db, serverTimestamp, handleFirestoreError, OperationType } from '../firebase';
import { doc, updateDoc, collection, addDoc } from 'firebase/firestore';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

export default function VideoIdeas({ brand, setBrand, user, setActiveTab, setSelectedIdea }: { brand: any, setBrand: any, user: any, setActiveTab: any, setSelectedIdea?: any }) {
  const [isGeneratingIdeas, setIsGeneratingIdeas] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Spontaneous voice recording states
  const [isRecording, setIsRecording] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [ideaTitle, setIdeaTitle] = useState('');
  const [platform, setPlatform] = useState('youtube');
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const recognitionRef = useRef<any>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  useEffect(() => {
    // Generate a default title when transcription updates and is currently empty
    if (transcription.trim() && !ideaTitle) {
      const dateStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
      setIdeaTitle(`Spontaneous Idea - ${dateStr}`);
    }
  }, [transcription]);

  const startRecording = () => {
    const SpeechRecognition = typeof window !== 'undefined' ? ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition) : null;
    if (!SpeechRecognition) {
      showToast("Speech recognition is not supported in this browser.");
      return;
    }

    try {
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = 'en-US';

      rec.onstart = () => {
        setIsRecording(true);
        setInterimTranscript('');
        showToast("Recording started... speak your idea");
      };

      rec.onresult = (event: any) => {
        let final = '';
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            final += event.results[i][0].transcript;
          } else {
            interim += event.results[i][0].transcript;
          }
        }
        if (final) {
          setTranscription(prev => prev + (prev ? ' ' : '') + final);
        }
        setInterimTranscript(interim);
      };

      rec.onerror = (event: any) => {
        console.error('Speech recognition error:', event);
        if (event.error === 'not-allowed') {
          showToast("Microphone access was denied.");
        } else {
          showToast(`Microphone error: ${event.error}`);
        }
        setIsRecording(false);
      };

      rec.onend = () => {
        setIsRecording(false);
        setInterimTranscript('');
      };

      rec.start();
      recognitionRef.current = rec;
    } catch (err: any) {
      console.error('Failed to start speech recognition:', err);
      showToast("Failed to initialize microphone dictation.");
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  };

  const clearRecording = () => {
    setTranscription('');
    setInterimTranscript('');
    setIdeaTitle('');
    setIsRecording(false);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }
  };

  const saveTranscribedDraft = async () => {
    if (!user || !transcription.trim()) return;
    setIsSavingDraft(true);
    try {
      const projectRef = collection(db, 'projects');
      await addDoc(projectRef, {
        userId: user.uid,
        name: ideaTitle || 'Untitled Spontaneous Idea',
        type: 'content',
        data: {
          title: ideaTitle || 'Untitled Spontaneous Idea',
          body: transcription,
          platform: platform,
          score: 0
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }).catch(err => handleFirestoreError(err, OperationType.CREATE, 'projects'));

      setSaveSuccess(true);
      showToast('Saved to your project drafts!');
      setTimeout(() => {
        setSaveSuccess(false);
        clearRecording();
      }, 1500);
    } catch (error: any) {
      console.error('Error saving voice draft:', error);
      showToast('Failed to save draft: ' + error.message);
    } finally {
      setIsSavingDraft(false);
    }
  };

  const handleGenerateIdeas = async () => {
    if (!user || !brand) return;
    setIsGeneratingIdeas(true);
    setErrorMsg('');
    
    try {
      const ideas = await generateContentIdeas(brand);
      const updatedBrand = { ...brand, content_ideas: [...ideas, ...(brand.content_ideas || [])] };
      
      const brandRef = doc(db, 'projects', `brand_${user.uid}`);
      await updateDoc(brandRef, {
        data: updatedBrand,
        updatedAt: serverTimestamp()
      }).catch(err => handleFirestoreError(err, OperationType.WRITE, `projects/brand_${user.uid}`));
      
      setBrand(updatedBrand);
    } catch (error: any) {
      console.error(error);
      setErrorMsg(error.message || 'An error occurred while generating ideas.');
    } finally {
      setIsGeneratingIdeas(false);
    }
  };

  if (!brand) {
    return (
      <div className="max-w-2xl mx-auto flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div className="w-20 h-20 bg-[var(--bg-secondary)] rounded-full flex items-center justify-center mb-6 shadow-inner">
          <Lightbulb size={32} className="text-[var(--label-tertiary)]" />
        </div>
        <h2 className="font-serif text-[32px] font-semibold tracking-[-0.015em] mb-4">You need a Brand Kit first</h2>
        <p className="text-[17px] text-[var(--label-secondary)] mb-8 max-w-md">
          To generate highly targeted video ideas, you'll need to define your channel's brand style and personality.
        </p>
        <button 
          onClick={() => setActiveTab('brand')}
          className="ios-button ios-button-filled px-8"
        >
          Create Brand Kit
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-20 pt-4 relative">
      <div className="flex flex-col gap-2">
        <h1 className="font-serif text-[36px] font-semibold tracking-[-0.015em] text-[var(--label-primary)]">Video Ideas</h1>
        <p className="text-[17px] text-[var(--label-secondary)]">Brainstorm concepts tailored to your brand's unique style.</p>
      </div>

      {/* Spontaneous Voice Capture Card */}
      <div className="bg-[var(--bg-tertiary)] ios-card p-6 border border-[var(--separator)] shadow-sm relative overflow-hidden">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-8 h-8 rounded-lg bg-[var(--accent)]/10 flex items-center justify-center">
            <Mic className="text-[var(--accent)]" size={18} />
          </div>
          <div>
            <h2 className="font-bold text-[17px] text-[var(--label-primary)]">Record Spontaneous Idea</h2>
            <p className="text-[13px] text-[var(--label-secondary)] font-medium">Speak your thoughts. We'll transcribe them into an editable draft project.</p>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center py-4">
          {!isRecording && !transcription && (
            <div className="text-center space-y-4 max-w-sm">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={startRecording}
                className="w-16 h-16 rounded-full bg-[var(--accent)] text-white flex items-center justify-center shadow-lg cursor-pointer mx-auto transition-colors hover:bg-[var(--accent)]/90"
              >
                <Mic size={28} />
              </motion.button>
              <p className="text-[14px] text-[var(--label-secondary)] font-semibold">
                Tap the microphone to start recording
              </p>
            </div>
          )}

          {isRecording && (
            <div className="w-full text-center space-y-5">
              <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
                <motion.div
                  animate={{
                    scale: [1, 1.4, 1],
                    opacity: [0.4, 0, 0.4]
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                  className="absolute inset-0 rounded-full bg-red-500/25"
                />
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={stopRecording}
                  className="relative w-16 h-16 rounded-full bg-red-500 text-white flex items-center justify-center shadow-lg cursor-pointer transition-colors hover:bg-red-600"
                >
                  <Square size={24} fill="white" />
                </motion.button>
              </div>

              <div className="space-y-1">
                <p className="text-[14px] text-red-500 font-bold uppercase tracking-wider flex items-center justify-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  Recording spontaneous idea...
                </p>
                <p className="text-[12px] text-[var(--label-tertiary)] font-medium">Click the stop button when done dictating</p>
              </div>

              {/* Real-time sound wave visualizer */}
              <div className="flex items-center justify-center gap-1.5 h-6">
                {[...Array(8)].map((_, i) => (
                  <motion.div
                    key={i}
                    animate={{
                      height: [8, 22, 8]
                    }}
                    transition={{
                      duration: 0.4 + i * 0.08,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                    className="w-1 rounded bg-[var(--accent)]"
                  />
                ))}
              </div>

              {/* Interim Real-time Transcription Stream */}
              <div className="bg-[var(--bg-secondary)] border border-[var(--separator)] rounded-xl p-4 min-h-[90px] max-h-[160px] overflow-y-auto text-left shadow-inner">
                <p className="text-[15px] text-[var(--label-primary)] leading-relaxed font-semibold">
                  {transcription}
                  <span className="text-[var(--accent)]"> {interimTranscript}</span>
                  {!transcription && !interimTranscript && (
                    <span className="text-[var(--label-tertiary)] italic font-medium">Start speaking to dictate...</span>
                  )}
                </p>
              </div>
            </div>
          )}

          {!isRecording && transcription && (
            <div className="w-full space-y-4">
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2 space-y-1.5">
                    <label className="text-[11px] font-bold text-[var(--label-secondary)] uppercase tracking-wider">Draft Title</label>
                    <input
                      type="text"
                      value={ideaTitle}
                      onChange={(e) => setIdeaTitle(e.target.value)}
                      placeholder="e.g. My Spontaneous Vlog Concept"
                      className="w-full bg-[var(--bg-secondary)] border border-[var(--separator)] rounded-xl px-4 py-2.5 text-[15px] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] font-semibold"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-[var(--label-secondary)] uppercase tracking-wider">Target Platform</label>
                    <select
                      value={platform}
                      onChange={(e) => setPlatform(e.target.value)}
                      className="w-full bg-[var(--bg-secondary)] border border-[var(--separator)] rounded-xl px-4 py-2.5 text-[15px] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] font-semibold"
                    >
                      <option value="youtube">YouTube</option>
                      <option value="tiktok">TikTok</option>
                      <option value="instagram">Instagram</option>
                      <option value="twitter">X (Twitter)</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-[var(--label-secondary)] uppercase tracking-wider">Transcribed Audio Content (Editable)</label>
                  <textarea
                    value={transcription}
                    onChange={(e) => setTranscription(e.target.value)}
                    rows={4}
                    className="w-full bg-[var(--bg-secondary)] border border-[var(--separator)] rounded-xl p-4 text-[15px] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] leading-relaxed font-semibold"
                    placeholder="Review and edit the voice transcript..."
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 justify-end pt-2">
                <button
                  onClick={clearRecording}
                  disabled={isSavingDraft}
                  className="ios-button px-5 py-2.5 bg-transparent border border-[var(--separator)] text-[var(--label-secondary)] hover:text-[var(--label-primary)] flex items-center"
                >
                  <Trash2 size={16} className="mr-1.5" />
                  Discard
                </button>
                <button
                  onClick={saveTranscribedDraft}
                  disabled={isSavingDraft || !transcription.trim()}
                  className="ios-button ios-button-filled px-6 py-2.5 flex items-center justify-center gap-1.5"
                >
                  {isSavingDraft ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Saving Draft...
                    </>
                  ) : (
                    <>
                      <Check size={16} />
                      Save to Project Drafts
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="pt-4">
        <div className="flex items-center justify-between mb-4">
          <span className="ios-label px-0">Your Ideas</span>
          {!brand.content_ideas && (
            <a
              onClick={handleGenerateIdeas}
              className="text-[14px] font-semibold text-[var(--accent)] active:opacity-40 cursor-pointer"
            >
              {isGeneratingIdeas ? 'Brainstorming...' : 'Brainstorm Ideas'}
            </a>
          )}
        </div>
        
        {brand.content_ideas ? (
          <div className="space-y-4">
            {brand.content_ideas.map((idea: any, i: number) => (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                key={i} 
                onClick={() => {
                  if (setSelectedIdea) {
                    setSelectedIdea(idea);
                    setActiveTab('create');
                  }
                }}
                className="bg-[var(--bg-tertiary)] ios-card p-6 border border-[var(--separator)] shadow-sm hover:shadow-md transition-shadow cursor-pointer"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-[var(--bg-secondary)] flex-shrink-0 mt-1 border border-[var(--separator)]">
                    <Lightbulb size={24} className="text-[var(--accent)]" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-[19px] mb-2 leading-tight tracking-tight">{idea.title}</h3>
                    <div className="inline-block px-3 py-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-medium text-[13px] rounded-lg mb-3">
                      Hook: "{idea.hook}"
                    </div>
                    <p className="text-[15px] text-[var(--label-secondary)] leading-relaxed font-medium">
                      {idea.description}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
            <div className="flex justify-end pt-4">
              <a
                onClick={handleGenerateIdeas}
                className="flex items-center gap-2 text-[14px] font-semibold text-[var(--label-secondary)] hover:text-[var(--label-primary)] transition-colors cursor-pointer"
              >
                <RefreshCw size={16} className={cn(isGeneratingIdeas && "animate-spin")} />
                Generate Fresh Ideas
              </a>
            </div>
          </div>
        ) : (
          <div className="bg-[var(--bg-tertiary)] ios-card p-12 text-center flex flex-col items-center justify-center border border-[var(--separator)]">
            <div className="w-20 h-20 bg-[var(--bg-secondary)] rounded-2xl flex items-center justify-center mb-6 shadow-sm border border-[var(--separator)]">
              <Lightbulb size={32} className="text-[var(--accent)]" />
            </div>
            <h3 className="font-serif text-[24px] font-semibold tracking-[-0.01em] mb-2">Ready to Brainstorm?</h3>
            <p className="text-[15px] text-[var(--label-secondary)] max-w-sm mx-auto mb-8 font-medium leading-relaxed">
              We'll use your brand kit to generate 5 to 10 tailored video concepts that match your channel's unique style and personality.
            </p>
            <button
              onClick={handleGenerateIdeas}
              disabled={isGeneratingIdeas}
              className="ios-button ios-button-filled px-8 h-12 text-[16px]"
            >
              {isGeneratingIdeas ? (
                <>
                  <RefreshCw size={20} className="animate-spin mr-2" />
                  Brainstorming Ideas...
                </>
              ) : (
                <>
                  <Lightbulb size={20} className="mr-2" />
                  Generate Ideas
                </>
              )}
            </button>
          </div>
        )}
      </div>

      <AnimatePresence>
        {saveSuccess && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] pointer-events-none"
          >
            <div className="bg-emerald-500 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3">
              <CheckCircle2 size={20} strokeWidth={1.5} />
              <span className="font-bold tracking-tight">Saved to CreatorOS Projects</span>
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
      </AnimatePresence>
    </div>
  );
}
