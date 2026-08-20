import { apiFetch } from "../firebase";
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Copy, Check, Sparkle, Clock, Star, Tag, CaretLeft, CaretRight, MagicWand, Plus, ThumbsUp, X, ArrowRight, Play } from '@phosphor-icons/react';
import { db, serverTimestamp } from '../firebase';
import { collection, addDoc, query, where, getDocs, orderBy, updateDoc, doc } from 'firebase/firestore';
import { cn } from '../lib/utils';
import ReactMarkdown from 'react-markdown';

const DEFAULT_PLATFORM_TEMPLATES: Record<string, Array<{ title: string; hook: string; description: string }>> = {
  youtube: [
    {
      title: "The 'Why Everyone Is Wrong About X' Video Essay",
      hook: "Everything you've been told about [Topic] is completely wrong—and here is the math to prove it.",
      description: "Structure a deep-dive YouTube video essay dissecting a common misconception. Include 3 evidence points, visual b-roll cues, and an engaging story arc ending with a practical takeaway."
    },
    {
      title: "Beginner's Step-by-Step Blueprint",
      hook: "If I had to start [Skill/Topic] from scratch with $0, this is the exact 4-step plan I'd follow.",
      description: "A high-retention tutorial script template designed for YouTube long-form content. Breaks down actionable milestones, common pitfalls, and exact tools to use."
    },
    {
      title: "Ultimate Tool/Strategy Tier List",
      hook: "I tested 10 different [Tools/Methods] for 30 days—here is the brutal truth.",
      description: "Engaging review & tier-list script prompt. Compares options across S-tier to F-tier, providing objective pros and cons for each entry."
    }
  ],
  tiktok: [
    {
      title: "3-Second Stop-the-Scroll Hook",
      hook: "Stop doing [Mistake] if you want to achieve [Goal] in 2026!",
      description: "Ultra-fast pacing script prompt designed for 15-30s TikToks. Focuses on an immediate visual pattern disrupt, high energy delivery, and a single strong call to action."
    },
    {
      title: "Behind-the-Scenes Secret Workflow",
      hook: "Here's a secret hack that [Industry] experts don't want you to know...",
      description: "Authentic, talking-head style prompt emphasizing relatable storytelling, native text overlay placements, and quick sound bite transitions."
    },
    {
      title: "POV: Day in the Life transformation",
      hook: "POV: You finally stopped making this one habit and everything changed.",
      description: "Short-form video template using rhythmic voiceover over montage b-roll to create high emotional engagement and rapid comments."
    }
  ],
  instagram: [
    {
      title: "High-Aesthetic Carousel & Reel Combo",
      hook: "Save this before you plan your next [Project/Goal].",
      description: "Prompts for a visually polished Reel with matching carousel slides. Combines minimalist text overlays, aesthetic aesthetic cues, and bookmarkable value."
    },
    {
      title: "Myth vs. Reality Showdown",
      hook: "What people think [Topic] takes vs. What it actually takes...",
      description: "Side-by-side comparison script and text overlay prompt tailored for Instagram Reels algorithms."
    }
  ],
  twitter: [
    {
      title: "Viral Breakdown Thread Prompt",
      hook: "How [Person/Company] built a $10M brand using a simple 3-part framework (Breakdown):",
      description: "Curates a multi-tweet thread outline including a viral hook tweet, 5 value nuggets with visual formatting, and a closing newsletter plug."
    },
    {
      title: "Contrarian Industry Insight",
      hook: "Unpopular opinion: [Common Wisdom] is dead. Here's what's replacing it in 2026.",
      description: "Punchy, single-thought thesis prompt designed to spark high retweets, quote tweets, and thoughtful debate."
    }
  ],
  linkedin: [
    {
      title: "The Career Milestone Story",
      hook: "3 years ago, I got turned down for my dream job. Today, I lead a team of 15.",
      description: "Professional storytelling prompt focusing on vulnerability, strategic lessons learned, and actionable career advice."
    },
    {
      title: "Framework & Playbook Guide",
      hook: "I spent 100 hours analyzing [Industry Topic]. Here is the 1-page playbook:",
      description: "Structured, highly shareable text post outline formatted with clean line breaks, bullet points, and high value takeaway."
    }
  ]
};

export default function PerfectPromptCopilot({ user }: { user: any }) {
  const [activeTab, setActiveTab] = useState<'generator' | 'templates' | 'history'>('generator');
  const [generatorInput, setGeneratorInput] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-6 pb-20">
      {toastMessage && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] bg-[var(--accent)] text-white text-[13px] font-bold px-4 py-2.5 rounded-full shadow-lg flex items-center gap-2"
        >
          <Check size={16} weight="bold" />
          {toastMessage}
        </motion.div>
      )}

      <div className="space-y-4 pt-10 px-4">
        <h1 className="font-serif text-[36px] font-semibold tracking-[-0.015em] text-[var(--label-primary)]">
          Perfect Prompt
        </h1>
        <p className="text-[17px] text-[var(--label-secondary)]">
          Your AI co-pilot for content strategy and viral copywriting.
        </p>
      </div>

      <div className="flex px-4 gap-2 border-b border-[var(--separator)] overflow-x-auto hide-scrollbar">
        {(['generator', 'templates', 'history'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-4 py-3 font-semibold text-[15px] capitalize transition-colors relative whitespace-nowrap cursor-pointer",
              activeTab === tab ? "text-[var(--label-primary)]" : "text-[var(--label-secondary)] hover:text-[var(--label-primary)]"
            )}
          >
            {tab}
            {activeTab === tab && (
              <motion.div
                layoutId="copilot-tab-indicator"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--accent)]"
              />
            )}
          </button>
        ))}
      </div>

      <div className="px-4">
        {activeTab === 'generator' && (
          <GeneratorView 
            user={user} 
            input={generatorInput} 
            setInput={setGeneratorInput} 
          />
        )}
        {activeTab === 'templates' && (
          <TemplatesView 
            user={user} 
            onSelect={(text, autoSwitch = false) => { 
              setGeneratorInput(text);
              if (autoSwitch) {
                setActiveTab('generator');
                showToast("Template loaded into Prompt Generator!");
              } else {
                showToast("Template copied to Generator!");
              }
            }} 
          />
        )}
        {activeTab === 'history' && <HistoryView user={user} />}
      </div>
    </div>
  );
}

function GeneratorView({ user, input, setInput }: { user: any, input: string, setInput: (v: string) => void }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState('');
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    if (!input.trim() || !user) return;
    setIsGenerating(true);
    setResult('');
    
    try {
      const response = await apiFetch('/api/gemini/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: "gemini-2.5-flash",
          contents: `Act as a World-Class Content Strategist and Viral Copywriter. 
          Take the following rough idea and output a highly detailed, markdown-formatted prompt that includes:
          - Target Audience
          - Tone of Voice
          - Hook Structures
          - Pacing
          - Platform-specific Best Practices
          
          Idea: "${input}"`
        })
      });
      
      if (!response.ok) {
        const errText = await response.text();
        try {
          throw new Error(JSON.parse(errText).error || 'API Error');
        } catch(e) {
          throw new Error(errText);
        }
      }
      const data = await response.json();
      const generatedText = data.text || '';
      setResult(generatedText);
      
      // Save to history
      await addDoc(collection(db, 'prompts'), {
        userId: user.uid,
        input,
        result: generatedText,
        rating: 0,
        tag: '',
        timestamp: serverTimestamp()
      });
      
    } catch (err: any) {
      console.error(err);
      setResult(err.message || "Error generating prompt. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="bg-[var(--bg-tertiary)] ios-card p-6 space-y-4">
        <span className="ios-label px-0">Rough Idea</span>
        <textarea 
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="e.g., A video about productivity hacks for busy parents..."
          className="ios-input h-32 py-4 resize-none"
        />
        <button 
          onClick={handleGenerate}
          disabled={isGenerating || !input.trim()}
          className="ios-button ios-button-filled w-full cursor-pointer"
        >
          {isGenerating ? <Sparkle className="animate-spin" size={20} /> : <MagicWand size={20} />}
          {isGenerating ? "Optimizing..." : "Generate Perfect Prompt"}
        </button>
      </div>

      {isGenerating && (
        <div className="bg-[var(--bg-tertiary)] ios-card p-6 space-y-4 animate-pulse">
          <div className="h-6 bg-[var(--bg-secondary)] rounded w-1/3 mb-6"></div>
          <div className="h-4 bg-[var(--bg-secondary)] rounded w-full"></div>
          <div className="h-4 bg-[var(--bg-secondary)] rounded w-5/6"></div>
          <div className="h-4 bg-[var(--bg-secondary)] rounded w-4/6"></div>
          <div className="h-4 bg-[var(--bg-secondary)] rounded w-full mt-4"></div>
          <div className="h-4 bg-[var(--bg-secondary)] rounded w-3/4"></div>
        </div>
      )}

      {!isGenerating && result && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }} 
          animate={{ opacity: 1, y: 0 }}
          className="bg-[var(--bg-tertiary)] ios-card p-6 space-y-4"
        >
          <div className="flex justify-between items-center border-b border-[var(--separator)] pb-4">
            <span className="ios-label px-0 mb-0">Optimized Prompt</span>
            <button 
              onClick={copyToClipboard}
              className="ios-button ios-button-tinted h-8 text-[13px] px-3 cursor-pointer"
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
              {copied ? 'Copied!' : 'Copy to Clipboard'}
            </button>
          </div>
          <div className="prose prose-sm dark:prose-invert max-w-none markdown-body text-[var(--label-primary)]">
            <ReactMarkdown>{result}</ReactMarkdown>
          </div>
        </motion.div>
      )}
    </div>
  );
}

const PLATFORMS = [
  { id: 'youtube', name: 'YouTube', color: '#ff0000', bgClass: 'bg-red-500/10' },
  { id: 'tiktok', name: 'TikTok', color: '#00f2fe', bgClass: 'bg-cyan-500/10' },
  { id: 'instagram', name: 'Instagram', color: '#e1306c', bgClass: 'bg-pink-500/10' },
  { id: 'twitter', name: 'Twitter', color: '#1da1f2', bgClass: 'bg-blue-500/10' },
  { id: 'linkedin', name: 'LinkedIn', color: '#0077b5', bgClass: 'bg-sky-500/10' }
];

function TemplatesView({ user, onSelect }: { user: any, onSelect: (text: string, autoSwitch?: boolean) => void }) {
  const [platform, setPlatform] = useState(PLATFORMS[0]);
  const [page, setPage] = useState(1);
  const [templates, setTemplates] = useState<any[]>(DEFAULT_PLATFORM_TEMPLATES['youtube']);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModalTemplate, setSelectedModalTemplate] = useState<any | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  useEffect(() => {
    loadTemplates(platform.id, page);
  }, [platform.id, page]);

  const loadTemplates = async (platId: string, pageNum: number) => {
    // Start with curated defaults
    const defaults = DEFAULT_PLATFORM_TEMPLATES[platId] || [];
    setTemplates(defaults);

    if (!user) return;
    setIsLoading(true);

    try {
      const q = query(
        collection(db, 'prompt_templates'),
        where('userId', '==', user.uid)
      );
      const snap = await getDocs(q);
      const match = snap.docs.find(d => d.data().platform === platId && d.data().page === pageNum);
      
      if (match && Array.isArray(match.data().templates) && match.data().templates.length > 0) {
        setTemplates(match.data().templates);
      } else if (pageNum > 1) {
        await generateAndSaveTemplates(platId, pageNum);
      }
    } catch (err) {
      console.error("Template fetch notice:", err);
      // Keep curated defaults
    } finally {
      setIsLoading(false);
    }
  };

  const generateAndSaveTemplates = async (platId: string, pageNum: number) => {
    try {
      const response = await apiFetch('/api/gemini/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: "gemini-2.5-flash",
          contents: `Generate 5 unique, highly engaging content prompt templates for ${platId}. Page ${pageNum}.
          Output JSON strictly: { "templates": [{ "title": "...", "hook": "...", "description": "..." }] }`,
          config: {
            responseMimeType: "application/json",
          }
        })
      });
      
      if (!response.ok) {
        const errText = await response.text();
        try {
          throw new Error(JSON.parse(errText).error || 'API Error');
        } catch(e) {
          throw new Error(errText);
        }
      }
      const data = await response.json();
      let rawText = data.text || '';
      rawText = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      
      const parsed = JSON.parse(rawText);
      const newTemplates = Array.isArray(parsed.templates) ? parsed.templates : (Array.isArray(parsed) ? parsed : []);
      
      if (newTemplates.length > 0) {
        setTemplates(newTemplates);
        await addDoc(collection(db, 'prompt_templates'), {
          userId: user.uid,
          platform: platId,
          page: pageNum,
          templates: newTemplates,
          timestamp: serverTimestamp()
        });
      }
    } catch (err) {
      console.error("Failed to generate custom templates:", err);
      // Fallback remains safely set
    }
  };

  const handleCopy = (tpl: any, index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const promptText = `${tpl.title}\n\nHook: ${tpl.hook}\n\n${tpl.description}`;
    navigator.clipboard.writeText(promptText);
    setCopiedId(index);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className={cn("space-y-6 transition-colors duration-500 rounded-3xl p-4 -mx-4", platform.bgClass)}>
      {/* Platform Tabs */}
      <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-2">
        {PLATFORMS.map(p => (
          <button
            key={p.id}
            onClick={() => { setPlatform(p); setPage(1); }}
            className={cn(
              "px-4 py-2 rounded-full font-medium text-[14px] whitespace-nowrap transition-colors border cursor-pointer",
              platform.id === p.id 
                ? "bg-[var(--label-primary)] text-[var(--bg-primary)] border-[var(--label-primary)]" 
                : "bg-transparent border-[var(--separator)] text-[var(--label-secondary)] hover:text-[var(--label-primary)]"
            )}
          >
            {p.name}
          </button>
        ))}
      </div>

      {/* Templates List */}
      <div className="space-y-4">
        {isLoading ? (
          Array(3).fill(0).map((_, i) => (
            <div key={i} className="bg-[var(--bg-tertiary)]/80 ios-card p-5 animate-pulse">
              <div className="h-5 bg-[var(--bg-secondary)] rounded w-1/2 mb-3"></div>
              <div className="h-4 bg-[var(--bg-secondary)] rounded w-full mb-2"></div>
              <div className="h-4 bg-[var(--bg-secondary)] rounded w-3/4"></div>
            </div>
          ))
        ) : templates.length === 0 ? (
          <div className="text-center p-8 text-[var(--label-secondary)] bg-[var(--bg-tertiary)] rounded-2xl">
            No templates available for this page.
          </div>
        ) : (
          templates.map((tpl, i) => (
            <div 
              key={i} 
              onClick={() => setSelectedModalTemplate(tpl)}
              className="bg-[var(--bg-tertiary)] ios-card p-5 ios-card-clickable cursor-pointer hover:border-[var(--accent)] transition-all group relative"
            >
              <div className="flex justify-between items-start gap-4 mb-2">
                <h3 className="font-semibold text-[17px] text-[var(--label-primary)] group-hover:text-[var(--accent)] transition-colors">
                  {tpl.title}
                </h3>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={(e) => handleCopy(tpl, i, e)}
                    className="p-1.5 rounded-lg bg-[var(--bg-secondary)] hover:bg-[var(--separator)] text-[var(--label-secondary)] hover:text-[var(--label-primary)] transition-colors"
                    title="Copy Prompt"
                  >
                    {copiedId === i ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelect(`${tpl.title}\n\nHook: ${tpl.hook}\n\n${tpl.description}`, true);
                    }}
                    className="ios-button ios-button-tinted text-[12px] h-7 px-2.5 font-bold flex items-center gap-1"
                    title="Use in Generator"
                  >
                    Use <ArrowRight size={12} weight="bold" />
                  </button>
                </div>
              </div>

              {tpl.hook && (
                <p className="text-[14px] text-[var(--accent)] font-semibold mb-2 bg-[var(--accent)]/10 p-2.5 rounded-lg border border-[var(--accent)]/20">
                  "{tpl.hook}"
                </p>
              )}
              <p className="text-[14px] text-[var(--label-secondary)] leading-relaxed line-clamp-3">
                {tpl.description}
              </p>
            </div>
          ))
        )}
      </div>

      {/* Pagination Controls */}
      <div className="flex justify-between items-center pt-2">
        <button 
          onClick={() => setPage(p => Math.max(1, p - 1))}
          disabled={page === 1 || isLoading}
          className="ios-button ios-button-gray h-10 px-4 disabled:opacity-50 cursor-pointer"
        >
          <CaretLeft size={16} /> Previous
        </button>
        <span className="text-[13px] font-medium text-[var(--label-secondary)]">Page {page}</span>
        <button 
          onClick={() => setPage(p => p + 1)}
          disabled={isLoading}
          className="ios-button ios-button-gray h-10 px-4 cursor-pointer"
        >
          Next <CaretRight size={16} />
        </button>
      </div>

      {/* Template Detail Modal */}
      <AnimatePresence>
        {selectedModalTemplate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setSelectedModalTemplate(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[var(--bg-tertiary)] border border-[var(--separator)] rounded-2xl p-6 max-w-lg w-full space-y-5 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-start gap-3 border-b border-[var(--separator)] pb-3">
                <div>
                  <span className="text-[10px] uppercase tracking-wider font-bold text-[var(--accent)] block">
                    {platform.name} Template
                  </span>
                  <h2 className="font-serif text-[20px] font-bold text-[var(--label-primary)]">
                    {selectedModalTemplate.title}
                  </h2>
                </div>
                <button
                  onClick={() => setSelectedModalTemplate(null)}
                  className="p-1.5 rounded-full hover:bg-[var(--bg-secondary)] text-[var(--label-secondary)]"
                >
                  <X size={18} weight="bold" />
                </button>
              </div>

              {selectedModalTemplate.hook && (
                <div className="space-y-1">
                  <span className="text-[11px] font-bold uppercase text-[var(--label-tertiary)]">Hook Concept</span>
                  <p className="text-[15px] font-semibold text-[var(--label-primary)] bg-[var(--bg-secondary)] p-3 rounded-xl border border-[var(--separator)]">
                    "{selectedModalTemplate.hook}"
                  </p>
                </div>
              )}

              <div className="space-y-1">
                <span className="text-[11px] font-bold uppercase text-[var(--label-tertiary)]">Structure & Directions</span>
                <p className="text-[14px] text-[var(--label-secondary)] leading-relaxed whitespace-pre-wrap bg-[var(--bg-secondary)]/50 p-3 rounded-xl border border-[var(--separator)]">
                  {selectedModalTemplate.description}
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-2 border-t border-[var(--separator)]">
                <button
                  onClick={(e) => {
                    handleCopy(selectedModalTemplate, -1, e);
                  }}
                  className="ios-button ios-button-tinted text-[13px] px-4 py-2"
                >
                  <Copy size={16} /> Copy Text
                </button>
                <button
                  onClick={() => {
                    const fullText = `${selectedModalTemplate.title}\n\nHook: ${selectedModalTemplate.hook}\n\n${selectedModalTemplate.description}`;
                    onSelect(fullText, true);
                    setSelectedModalTemplate(null);
                  }}
                  className="ios-button ios-button-filled text-[13px] px-4 py-2"
                >
                  <Sparkle size={16} /> Load into Generator
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const TAGS = ['Hook', 'Body', 'Call-to-Action'];

function HistoryView({ user }: { user: any }) {
  const [history, setHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'Recent' | 'Highest Rated'>('Recent');
  const [filterTag, setFilterTag] = useState<string>('');

  useEffect(() => {
    if (user) loadHistory();
  }, [user]);

  const loadHistory = async () => {
    setIsLoading(true);
    try {
      const q = query(
        collection(db, 'prompts'), 
        where('userId', '==', user.uid)
      );
      const snap = await getDocs(q);
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      docs.sort((a: any, b: any) => (b.timestamp?.toMillis?.() || 0) - (a.timestamp?.toMillis?.() || 0));
      setHistory(docs);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const updateTag = async (id: string, tag: string) => {
    await updateDoc(doc(db, 'prompts', id), { tag });
    setHistory(history.map(h => h.id === id ? { ...h, tag } : h));
  };

  const updateRating = async (id: string, rating: number) => {
    await updateDoc(doc(db, 'prompts', id), { rating });
    setHistory(history.map(h => h.id === id ? { ...h, rating } : h));
  };

  let displayed = history;
  if (filterTag) {
    displayed = displayed.filter(h => h.tag === filterTag);
  }
  if (sortBy === 'Highest Rated') {
    displayed = [...displayed].sort((a, b) => (b.rating || 0) - (a.rating || 0));
  } else {
    displayed = [...displayed].sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4 items-start sm:items-center">
        <div className="flex gap-2">
          {['Recent', 'Highest Rated'].map(sort => (
            <button
              key={sort}
              onClick={() => setSortBy(sort as any)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-[13px] font-medium border transition-colors cursor-pointer",
                sortBy === sort 
                  ? "bg-[var(--label-primary)] text-[var(--bg-primary)] border-[var(--label-primary)]" 
                  : "bg-transparent border-[var(--separator)] text-[var(--label-secondary)]"
              )}
            >
              {sort}
            </button>
          ))}
        </div>
        <div className="flex gap-2 items-center">
          <Tag size={16} className="text-[var(--label-tertiary)]" />
          <select 
            value={filterTag} 
            onChange={(e) => setFilterTag(e.target.value)}
            className="bg-transparent border border-[var(--separator)] rounded-lg text-[13px] px-2 py-1.5 outline-none"
          >
            <option value="">All Tags</option>
            {TAGS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>

      <div className="space-y-4">
        {isLoading ? (
          <div className="flex justify-center p-8"><Sparkle className="animate-spin text-[var(--label-tertiary)]" size={24} /></div>
        ) : displayed.length === 0 ? (
          <div className="text-center p-8 text-[var(--label-secondary)] text-[15px] bg-[var(--bg-tertiary)] rounded-2xl">No prompts found.</div>
        ) : (
          displayed.map((item) => (
            <div key={item.id} className="bg-[var(--bg-tertiary)] ios-card p-5 space-y-4">
              <div className="flex justify-between items-start gap-4">
                <div className="text-[15px] font-medium line-clamp-2">"{item.input}"</div>
                <div className="flex gap-1">
                  {[1,2,3,4,5].map(star => (
                    <Star 
                      key={star} 
                      weight={star <= (item.rating || 0) ? "fill" : "regular"}
                      className={star <= (item.rating || 0) ? "text-yellow-500" : "text-[var(--separator)]"}
                      size={16}
                      onClick={() => updateRating(item.id, star)}
                      style={{ cursor: 'pointer' }}
                    />
                  ))}
                </div>
              </div>
              
              <div className="bg-[var(--bg-secondary)] p-3 rounded-lg max-h-32 overflow-y-auto text-[13px] text-[var(--label-secondary)] font-mono">
                {(item.result || '').substring(0, 150)}...
              </div>
              
              <div className="flex justify-between items-center">
                <div className="flex gap-2">
                  {TAGS.map(t => (
                    <button
                      key={t}
                      onClick={() => updateTag(item.id, item.tag === t ? '' : t)}
                      className={cn(
                        "text-[11px] font-semibold px-2 py-1 rounded-md transition-colors cursor-pointer",
                        item.tag === t 
                          ? "bg-[var(--accent)] text-white" 
                          : "bg-[var(--bg-secondary)] text-[var(--label-secondary)] hover:bg-[var(--separator)]"
                      )}
                    >
                      {t}
                    </button>
                  ))}
                </div>
                <span className="text-[11px] text-[var(--label-tertiary)]">
                  {item.timestamp?.toDate ? item.timestamp.toDate().toLocaleDateString() : 'Just now'}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

