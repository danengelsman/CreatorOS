import React, { useState } from 'react';
import { Lightning as Zap, Palette, PenNib as PenTool, Compass, Chat as MessageSquare, CaretRight as ChevronRight, CaretDown, MagnifyingGlass as Search, Question as HelpCircle, Sparkle as Sparkles, ShieldCheck, Layout, PaperPlaneRight as Send, X, Plus } from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { db, serverTimestamp, handleFirestoreError, OperationType } from '../firebase';
import { collection, addDoc } from 'firebase/firestore';

const APP_VERSION = '1.2.0';

const HELP_SECTIONS = [
  { id: 'getting-started', title: 'Getting Started', icon: Zap, description: 'Learn the fundamentals and OS setup.' },
  { id: 'branding', title: 'Branding Engine', icon: Palette, description: 'Define your digital DNA and style guide.' },
  { id: 'studio-workflow', title: 'Content Studio', icon: PenTool, description: 'Write, polish, and repurpose content.' },
  { id: 'scene-planner', title: 'Scene Planner', icon: Layout, description: 'Segment scripts into timed visual beats.' },
  { id: 'retention-lab', title: 'Retention Lab', icon: Zap, description: 'Diagnose and optimize your video hooks.' },
  { id: 'video-studio', title: 'Video Studio', icon: Compass, description: 'AI video generation and playback.' },
  { id: 'first-dollar', title: 'First Dollar', icon: Sparkles, description: 'Track your monetization journey.' }
];

const FAQS = [
  { id: 'faq-1', question: 'How do I generate a new brand identity?', answer: 'Navigate to the Brand tab and enter a brief description of your desired style. The AI will generate a complete identity guide.' },
  { id: 'faq-2', question: 'What is the Retention Lab?', answer: 'The Retention Lab analyzes your intro script and gives a retention score, drop-off heatmap, and 5 optimized hook rewrites to maximize first 5-second hold.' },
  { id: 'faq-3', question: 'How do I use the Scene Planner?', answer: 'In the Create tab, go to Scene Planner. Paste your script, and it will divide it into visual beats with stock queries and AI image prompts.' },
  { id: 'faq-4', question: 'How do I contact support?', answer: 'Use the Account Support section at the bottom of this page to submit a new support ticket.' }
];

export default function Support({ user, navigate }: { user: any, navigate?: (path: string) => void }) {
  const [activeSection, setActiveSection] = useState(HELP_SECTIONS[0].id);
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSupportForm, setShowSupportForm] = useState(false);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject || !message) return;
    setIsSubmitting(true);
    setErrorMsg('');
    try {
      await addDoc(collection(db, 'support_tickets'), {
        userId: user.uid,
        subject,
        message,
        status: 'open',
        userData: {
          displayName: user.displayName,
          email: user.email,
          photoURL: user.photoURL,
        },
        createdAt: serverTimestamp(),
      });
      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        setShowSupportForm(false);
      }, 2000);
    } catch (error: any) {
      setErrorMsg(error.message || 'Failed to submit ticket');
      try {
        handleFirestoreError(error, OperationType.WRITE, 'support_tickets');
      } catch(e) {
        // We already captured the message
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 pb-20">
      <div className="flex items-center justify-between px-1 pt-4">
        <h1 className="font-serif text-[36px] font-semibold tracking-[-0.015em] text-[var(--label-primary)]">Support</h1>
        <span className="px-2.5 py-1 rounded-full bg-[var(--bg-tertiary)] border border-[var(--separator)] text-[12px] font-bold text-[var(--label-secondary)] font-mono">
          v{APP_VERSION}
        </span>
      </div>

      {/* Search Bar */}
      <section className="bg-[var(--bg-tertiary)] ios-card p-3 flex items-center gap-3">
        <Search size={18} strokeWidth={1.5} className="text-[var(--label-tertiary)] ml-1" />
        <input 
          type="text" 
          placeholder="Search documentation"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 bg-transparent outline-none text-[17px] placeholder:text-[var(--label-tertiary)]"
        />
      </section>

      {/* Help Sections Inset Grouped List */}
      <section>
        <span className="ios-label">Documentation</span>
        <div className="bg-[var(--bg-tertiary)] ios-card overflow-hidden divide-y divide-[var(--separator)]">
           {HELP_SECTIONS.map((section) => (
             <div 
               key={section.id} 
               onClick={() => {
                 setActiveSection(section.id);
                 if (navigate) navigate(`/help/${section.id}`);
               }}
               className="p-4 flex items-center justify-between ios-card-clickable transition-colors"
             >
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{background: 'color-mix(in srgb, var(--accent) 12%, transparent)', color: 'var(--accent)'}}>
                      <section.icon size={22} strokeWidth={1.5} />
                   </div>
                   <div className="flex flex-col">
                      <span className="font-semibold text-[17px]">{section.title}</span>
                      <span className="text-[13px] text-[var(--label-secondary)]">{section.description}</span>
                   </div>
                </div>
                <ChevronRight size={18} strokeWidth={1.5} className="text-[var(--label-tertiary)]" />
             </div>
           ))}
        </div>
      </section>

      {/* FAQ Section */}
      <section className="pt-4">
        <span className="ios-label">Frequently Asked Questions</span>
        <div className="bg-[var(--bg-tertiary)] ios-card overflow-hidden divide-y divide-[var(--separator)]">
          {FAQS.map((faq) => (
            <div key={faq.id} className="flex flex-col">
              <div 
                onClick={() => setExpandedFaq(expandedFaq === faq.id ? null : faq.id)}
                className="p-4 flex items-center justify-between cursor-pointer active:bg-[var(--separator)] transition-colors"
                style={{ WebkitTapHighlightColor: 'transparent' }}
              >
                <span className="font-semibold text-[17px] pr-4">{faq.question}</span>
                <motion.div
                  animate={{ rotate: expandedFaq === faq.id ? 180 : 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className="flex-shrink-0"
                >
                  <CaretDown size={18} strokeWidth={1.5} className="text-[var(--label-tertiary)]" />
                </motion.div>
              </div>
              <AnimatePresence initial={false}>
                {expandedFaq === faq.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="p-4 pt-0 text-[15px] leading-relaxed text-[var(--label-secondary)]">
                      {faq.answer}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </section>

      {/* Contact Section */}
      <section className="pt-4">
         <span className="ios-label">Account Support</span>
         <div className="bg-[var(--bg-tertiary)] ios-card overflow-hidden">
            <div 
              onClick={() => setShowSupportForm(true)}
              className="p-4 flex items-center justify-between ios-card-clickable transition-colors"
            >
               <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{background: 'color-mix(in srgb, var(--system-orange) 12%, transparent)', color: 'var(--system-orange)'}}>
                     <MessageSquare size={22} strokeWidth={1.5} />
                  </div>
                  <span className="font-semibold text-[17px]">Contact Architect Support</span>
               </div>
               <Plus size={18} strokeWidth={1.5} className="text-[var(--accent)]" />
            </div>
         </div>
      </section>

      {/* Support Modal */}
      <AnimatePresence>
        {showSupportForm && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="w-full max-w-lg bg-[var(--bg-secondary)] rounded-t-[32px] overflow-hidden"
            >
               <div className="px-6 py-4 flex items-center justify-between border-b border-[var(--separator)]">
                 <a onClick={() => setShowSupportForm(false)} className="text-[17px] text-[var(--accent)] cursor-pointer">Cancel</a>
                 <span className="text-[17px] font-bold">New Ticket</span>
                 <button 
                   onClick={handleSubmitTicket}
                   disabled={!subject || !message || isSubmitting}
                   className="text-[17px] font-bold text-[var(--accent)] disabled:opacity-30"
                 >
                   Send
                 </button>
               </div>
               
               <div className="p-4 space-y-4 pb-12">
                  <input 
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Subject"
                    className="ios-input"
                  />
                  <textarea 
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Describe your issue..."
                    className="ios-input h-48 py-4 resize-none"
                  />
                  
                  {isSuccess && (
                    <div className="text-center py-4 text-[var(--system-green)] font-bold animate-fade-up">
                      Ticket Submitted Successfully
                    </div>
                  )}
                  {errorMsg && (
                    <div className="text-center py-2 text-[var(--system-red)] font-semibold animate-fade-up text-[14px]">
                      {errorMsg}
                    </div>
                  )}
               </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
