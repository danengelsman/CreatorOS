import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  PaperPlaneRight as Send, 
  CaretRight as ChevronRight, 
  Sparkle as Sparkles, 
  Target, 
  Lightning as Zap, 
  CheckCircle as CheckCircle2,
  CircleNotch as Loader2,
  User,
  Robot
} from '@phosphor-icons/react';
import BrandIcon from './BrandIcon';
import { cn } from '../lib/utils';
import { db, serverTimestamp, handleFirestoreError, OperationType, authorizedFetch } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';
import Confetti from './Confetti';

interface OnboardingProps {
  onComplete: (targetTab?: string) => void;
  user: any;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface Summary {
  niche: string;
  audience: string;
  vibe: string;
}

export default function Onboarding({ onComplete, user }: OnboardingProps) {
  const [phase, setPhase] = useState<'welcome' | 'interview' | 'success' | 'generating'>('welcome');
  const [messages, setMessages] = useState<Message[]>([
    { 
      role: 'assistant', 
      content: "Welcome! Let's build your perfect Creator Profile together. To start, what topic or niche excites you the most for your channel?" 
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isAiTyping, setIsAiTyping] = useState(false);
  const [summary, setSummary] = useState<Summary | null>(null);
  
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Automatically scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isAiTyping]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isAiTyping) return;

    const userText = inputValue.trim();
    setInputValue('');
    
    // Add user message
    const updatedMessages: Message[] = [...messages, { role: 'user', content: userText }];
    setMessages(updatedMessages);
    setIsAiTyping(true);

    try {
      const data = await authorizedFetch('/api/onboarding/chat', {
        method: 'POST',
        body: JSON.stringify({ messages: updatedMessages })
      });

      // Add AI reply
      setMessages(prev => [...prev, { role: 'assistant', content: data.message }]);
      
      if (data.isComplete) {
        setSummary(data.summary || {
          niche: userText,
          audience: "Content Creators",
          vibe: "Friendly & Encouraging"
        });
        // Transition after a brief delay so they see the final message
        setTimeout(() => {
          setPhase('success');
        }, 2200);
      }
    } catch (error) {
      console.error('Error during onboarding chat:', error);
    } finally {
      setIsAiTyping(false);
    }
  };

  const handleBuildBrandKit = async () => {
    setPhase('generating');
    try {
      // 1. Call `/api/onboarding/generate-brand` with the gathered info
      const kit = await authorizedFetch('/api/onboarding/generate-brand', {
        method: 'POST',
        body: JSON.stringify({
          niche: summary?.niche || '',
          audience: summary?.audience || '',
          vibe: summary?.vibe || ''
        })
      });

      // 2. Save the brand kit to Firestore
      const brandRef = doc(db, 'projects', `brand_${user.uid}`);
      await setDoc(brandRef, {
        userId: user.uid,
        name: kit.name || 'Untitled Brand',
        type: 'brand_kit',
        data: kit,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }).catch(err => handleFirestoreError(err, OperationType.WRITE, `projects/brand_${user.uid}`));

      // 3. Save onboardingAnswers to User document in Firestore
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, {
        onboardingAnswers: {
          niche: summary?.niche || '',
          audience: summary?.audience || '',
          vibe: summary?.vibe || '',
          summary: kit.tagline || ''
        },
        updatedAt: serverTimestamp()
      }, { merge: true }).catch(err => handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}`));

      // 4. Complete Onboarding
      onComplete('brand');
    } catch (error) {
      console.error("Error generating brand kit during onboarding:", error);
      setPhase('success');
    }
  };

  // Progress calculations based on user replies
  const userMessagesCount = messages.filter(m => m.role === 'user').length;
  const progressPercent = Math.min(100, Math.round((userMessagesCount / 3) * 100));

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-12 overflow-hidden">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-3xl"
      />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 30 }}
        transition={{ type: "spring", damping: 26, stiffness: 190 }}
        className="relative w-full max-w-4xl bg-[var(--bg-secondary)] rounded-[40px] shadow-2xl overflow-hidden flex flex-col md:flex-row h-full max-h-[680px] border border-white/10"
      >
        
        {/* Left Side: Visual Guide / Status Panel */}
        <div className="hidden md:flex md:w-[35%] relative bg-black/40 flex-col justify-between p-10 border-r border-white/5 overflow-hidden">
          {/* Subtle decorative glow */}
          <div className="absolute -top-24 -left-24 w-48 h-48 bg-[var(--accent)] rounded-full filter blur-[100px] opacity-20 pointer-events-none" />
          
          <div className="z-10 space-y-6">
            <div className="p-3.5 bg-white/10 backdrop-blur-xl rounded-2xl border border-white/10 w-fit">
              <BrandIcon size={32} className="text-white animate-pulse" />
            </div>
            
            <div className="space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/40 block">
                Creator Profile
              </span>
              <h3 className="text-xl font-serif font-semibold text-white tracking-tight">
                Architect Your Identity
              </h3>
              <p className="text-sm text-white/50 leading-relaxed font-medium">
                We're tailoring a unique channel voice, customized color palette, templates, and script generators just for you.
              </p>
            </div>
          </div>

          <div className="z-10 space-y-4">
            <div className="flex justify-between items-end">
              <span className="text-xs font-semibold text-white/40">Profile Setup</span>
              <span className="text-xs font-bold text-white/80">{progressPercent}% Done</span>
            </div>
            <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-[var(--accent)]"
                initial={{ width: '0%' }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
            </div>
            
            <div className="flex gap-2">
              <div className={cn("w-2 h-2 rounded-full transition-colors duration-500", phase === 'welcome' ? "bg-white" : "bg-white/20")} />
              <div className={cn("w-2 h-2 rounded-full transition-colors duration-500", phase === 'interview' ? "bg-white" : "bg-white/20")} />
              <div className={cn("w-2 h-2 rounded-full transition-colors duration-500", phase === 'success' || phase === 'generating' ? "bg-white" : "bg-white/20")} />
            </div>
          </div>
        </div>

        {/* Right Side: Interactive Panel */}
        <div className="flex-1 flex flex-col min-w-0 bg-[var(--bg-secondary)] relative h-full overflow-y-auto">
          
          <AnimatePresence mode="wait">
            
            {/* WELCOME PHASE */}
            {phase === 'welcome' && (
              <motion.div
                key="welcome"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.4 }}
                className="flex-1 flex flex-col p-8 sm:p-14 space-y-8"
              >
                <div className="space-y-4">
                  <h1 className="font-serif text-[42px] sm:text-[48px] font-semibold tracking-[-0.025em] leading-[1.1] text-balance">
                    Let's Build Your Channel Style
                  </h1>
                  <p className="text-[18px] sm:text-[20px] text-[var(--label-secondary)] leading-relaxed font-medium">
                    Skip the blank-page paralysis. Speak with our AI Brand Architect to discover your ideal niche, audience, and creative style in seconds.
                  </p>
                </div>

                <div className="pt-4">
                  <button 
                    onClick={() => setPhase('interview')}
                    className="ios-button ios-button-filled w-full h-14 text-[17px] font-semibold"
                  >
                    Let's Begin!
                    <ChevronRight size={22} strokeWidth={2} />
                  </button>
                  
                  <button 
                    onClick={() => onComplete()}
                    className="ios-button ios-button-tinted w-full h-14 mt-3 text-[15px] font-medium text-[var(--label-secondary)] border-0 bg-transparent"
                  >
                    Set up manually later
                  </button>
                </div>
              </motion.div>
            )}

            {/* INTERVIEW CHAT PHASE */}
            {phase === 'interview' && (
              <motion.div
                key="interview"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.4 }}
                className="flex-1 flex flex-col h-full overflow-hidden"
              >
                {/* Header of Chat */}
                <div className="px-6 py-4 border-b border-[var(--separator)] flex items-center gap-3 bg-[var(--bg-tertiary)]/50 backdrop-blur-md">
                  <div className="w-10 h-10 bg-[var(--accent)]/10 rounded-xl flex items-center justify-center text-[var(--accent)]">
                    <Robot size={22} weight="duotone" />
                  </div>
                  <div>
                    <h4 className="text-[15px] font-semibold">AI Brand Architect</h4>
                    <span className="text-[11px] font-medium text-[var(--label-secondary)] block">Online • Creator Interview</span>
                  </div>
                </div>

                {/* Chat Area */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                  {messages.map((msg, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                      className={cn(
                        "flex w-full",
                        msg.role === 'user' ? "justify-end" : "justify-start"
                      )}
                    >
                      <div className={cn(
                        "max-w-[85%] rounded-[22px] px-5 py-3.5 text-[15px] leading-relaxed font-medium shadow-sm",
                        msg.role === 'user'
                          ? "bg-[var(--accent)] text-white rounded-br-[4px]"
                          : "bg-[var(--bg-tertiary)] text-[var(--label-primary)] rounded-bl-[4px]"
                      )}>
                        {msg.content}
                      </div>
                    </motion.div>
                  ))}

                  {isAiTyping && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex justify-start"
                    >
                      <div className="bg-[var(--bg-tertiary)] text-[var(--label-secondary)] rounded-[22px] rounded-bl-[4px] px-5 py-3.5 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-[var(--label-secondary)] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-1.5 h-1.5 bg-[var(--label-secondary)] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-1.5 h-1.5 bg-[var(--label-secondary)] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </motion.div>
                  )}
                  
                  <div ref={chatEndRef} />
                </div>

                {/* Input Bar */}
                <div className="p-4 border-t border-[var(--separator)] bg-[var(--bg-tertiary)]/30 backdrop-blur-md flex gap-2 items-center">
                  <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSendMessage();
                    }}
                    placeholder="Type your response here..."
                    disabled={isAiTyping}
                    className="flex-1 bg-[var(--bg-secondary)] border border-[var(--separator)] rounded-2xl px-4 py-3 text-[15px] focus:outline-none focus:border-[var(--accent)] transition-colors text-[var(--label-primary)] disabled:opacity-60"
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={!inputValue.trim() || isAiTyping}
                    className="w-12 h-12 bg-[var(--accent)] text-white rounded-2xl flex items-center justify-center hover:opacity-90 active:scale-95 transition-all disabled:opacity-40 disabled:scale-100 flex-shrink-0"
                  >
                    <Send size={18} weight="bold" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* SUCCESS PHASE */}
            {phase === 'success' && (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.4 }}
                className="flex-1 flex flex-col p-8 sm:p-14 space-y-8"
              >
                <Confetti count={100} />
                <div className="space-y-3">
                  <div className="w-14 h-14 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mb-2">
                    <CheckCircle2 size={32} weight="duotone" />
                  </div>
                  <h2 className="font-serif text-[36px] sm:text-[40px] font-semibold tracking-[-0.020em] leading-tight">
                    Your Profile is Ready!
                  </h2>
                  <p className="text-[16px] text-[var(--label-secondary)] leading-relaxed font-medium">
                    We've gathered all details to construct your personalized Channel Style profile. Here's a summary of what we've discovered:
                  </p>
                </div>

                <div className="bg-[var(--bg-tertiary)] rounded-2xl border border-[var(--separator)] p-6 space-y-4">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--label-secondary)]">
                      Niche / Topic
                    </span>
                    <p className="text-[16px] font-semibold mt-0.5 text-[var(--label-primary)]">
                      {summary?.niche}
                    </p>
                  </div>
                  <div className="border-t border-[var(--separator)] pt-4">
                    <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--label-secondary)]">
                      Dream Viewers
                    </span>
                    <p className="text-[16px] font-semibold mt-0.5 text-[var(--label-primary)]">
                      {summary?.audience}
                    </p>
                  </div>
                  <div className="border-t border-[var(--separator)] pt-4">
                    <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--label-secondary)]">
                      Channel Vibe
                    </span>
                    <p className="text-[16px] font-semibold mt-0.5 text-[var(--label-primary)]">
                      {summary?.vibe}
                    </p>
                  </div>
                </div>

                <div className="pt-2">
                  <button 
                    onClick={handleBuildBrandKit}
                    className="ios-button ios-button-filled w-full h-14 text-[17px] font-semibold"
                  >
                    Build My Channel Style
                    <Sparkles size={20} weight="fill" className="ml-2" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* GENERATING LOAD SCREEN */}
            {phase === 'generating' && (
              <motion.div
                key="generating"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex-1 flex flex-col items-center p-8 sm:p-14 space-y-6"
              >
                <div className="relative">
                  <div className="absolute inset-0 bg-[var(--accent)] rounded-full filter blur-xl opacity-25 animate-pulse" />
                  <Loader2 size={48} className="text-[var(--accent)] animate-spin relative z-10" />
                </div>
                
                <div className="text-center space-y-2">
                  <h3 className="font-serif text-2xl font-semibold tracking-tight text-[var(--label-primary)]">
                    Architecting Your Channel Style
                  </h3>
                  <p className="text-[15px] text-[var(--label-secondary)] max-w-sm mx-auto font-medium leading-relaxed">
                    Analyzing niche patterns, compiling target palettes, drafting custom script hooks and choosing matching typography...
                  </p>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
