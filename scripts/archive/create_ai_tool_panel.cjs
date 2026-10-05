const fs = require('fs');

const code = `import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  CircleNotch as Loader2, 
  Sparkle as Sparkles, 
  RefreshCw, 
  CheckCircle as CheckCircle2,
  TrendUp,
  Plus,
  Settings,
  CaretRight as ChevronRight,
  Search,
  Play,
  DownloadSimple as Download,
  LockKey
} from '@phosphor-icons/react';
import { cn } from '../lib/utils';
import { generateSmartSuggestions, optimizeSearchTerms } from '../services/gemini';
import BrandIcon from './BrandIcon';
import { PLATFORMS } from './ContentEditorView';

export interface AIToolPanelProps {
  brand: any;
  allProjects: any[];
  body: string;
  setBody: React.Dispatch<React.SetStateAction<string>>;
  setTitle: (t: string) => void;
  showToast: (msg: string) => void;
  setIsPolishing: (b: boolean) => void;
  isPolishing: boolean;
  platform: string;
  onFormat: (platformId: string, label: string, isPro?: boolean) => void;
  setActiveTab: (tab: string) => void;
  videoHistory: any[];
  onSelectVideo: (video: any) => void;
  isScoring: boolean;
  scoreData: any;
}

export default function AIToolPanel({
  brand,
  allProjects,
  body,
  setBody,
  setTitle,
  showToast,
  setIsPolishing,
  isPolishing,
  platform,
  onFormat,
  setActiveTab,
  videoHistory,
  onSelectVideo,
  isScoring,
  scoreData
}: AIToolPanelProps) {
  const [isAnalyzingSuggestions, setIsAnalyzingSuggestions] = useState(false);
  const [suggestionsData, setSuggestionsData] = useState<any>(null);
  const [activeSuggestionTab, setActiveSuggestionTab] = useState<'trending' | 'angles'>('trending');
  
  const [showContextSettings, setShowContextSettings] = useState(false);
  const [contentTone, setContentTone] = useState('Professional');
  const [contentAudience, setContentAudience] = useState('');
  const [contentGoal, setContentGoal] = useState('Engagement');

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

  const handleOptimizeSearch = async () => {
    if (!body) {
      showToast("Please add some content first to optimize.");
      return;
    }
    setIsPolishing(true);
    showToast("Generating optimized search terms...");
    try {
      const terms = await optimizeSearchTerms(body, contentTone, contentAudience, contentGoal);
      setBody(prev => \`\${prev}\\n\\nSearch Optimization:\\n\${terms}\`);
      showToast("Search terms appended to content");
    } catch (error: any) {
      console.error('Optimization failed:', error);
      showToast(error.message || 'Optimization failed');
    } finally {
      setIsPolishing(false);
    }
  };

  return (
    <div className="lg:col-span-4 space-y-8">
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
              <div className="bg-[var(--bg-secondary)] border border-[var(--separator)] p-3 rounded-xl shadow-inner text-[13px] leading-relaxed text-[var(--label-secondary)] font-medium">
                <span className="font-bold text-[var(--label-primary)] flex items-center gap-1 mb-1">
                  <Sparkles size={14} className="text-[var(--accent)]" /> Niche Footprint Analysis
                </span>
                {suggestionsData.analysis}
              </div>
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
                            setBody(\`\${t.angle}\\n\\n[Topic Context / Target Justification]:\\n\${t.justification}\`);
                            showToast(\`Loaded "\${t.topic}" into editor\`);
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
                  suggestionsData.newAngles?.map((t: any, idx: number) => (
                    <div
                      key={idx}
                      className="bg-[var(--bg-secondary)] border border-[var(--separator)] p-3.5 rounded-xl hover:border-[var(--accent)]/50 transition-all space-y-2 group"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-bold text-[14px] text-[var(--label-primary)] leading-tight">{t.hook}</h4>
                        <button
                          onClick={() => {
                            setBody(prev => (prev ? prev + '\\n\\n' + t.script_outline : t.script_outline));
                            showToast(\`Loaded angle into editor\`);
                          }}
                          className="p-1.5 rounded-lg bg-[var(--bg-primary)] hover:bg-[var(--accent)] hover:text-white transition-colors border border-[var(--separator)] shadow-sm shrink-0 cursor-pointer"
                          title="Adopt Angle"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                      <p className="text-[12px] text-[var(--label-secondary)] leading-relaxed mt-1"><span className="font-semibold text-[var(--label-primary)]">Why it works:</span> {t.psychology}</p>
                      <div className="text-[11px] text-[var(--label-tertiary)] font-medium mt-2 p-2 bg-[var(--bg-primary)] rounded-md border border-[var(--separator)] whitespace-pre-wrap">{t.script_outline}</div>
                    </div>
                  ))
                )}
                <div className="pt-2 text-center">
                  <button onClick={handleGenerateSuggestions} className="text-[12px] font-bold text-[var(--accent)] hover:underline cursor-pointer">
                    Re-Analyze Performance
                  </button>
                </div>
              </div>
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
            <div key={p.id} onClick={() => onFormat(p.id, p.label, false)} className={cn("p-4 flex items-center justify-between active:bg-[var(--separator)] cursor-pointer transition-colors", p.id === platform ? "bg-[var(--bg-primary)] text-[var(--accent)]" : "text-[var(--label-primary)]")}>
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
              <div key={item.id} onClick={() => onSelectVideo(item)} className="p-3 flex items-center gap-3 hover:bg-[var(--bg-secondary)] transition-colors cursor-pointer group">
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
  );
}
`;
fs.writeFileSync('src/components/AIToolPanel.tsx', code);
console.log('Created AIToolPanel.tsx');
