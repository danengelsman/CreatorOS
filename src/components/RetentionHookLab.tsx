import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkle, Lightning, Gauge, ArrowRight, Copy, Check, Eye, WarningCircle, TrendUp, Play, FilmScript, Target, Waves } from '@phosphor-icons/react';
import { cn } from '../lib/utils';
import { analyzeAndOptimizeRetention } from '../services/gemini';

interface RetentionHookLabProps {
  initialText?: string;
  showToast: (msg: string) => void;
  onApplyHookToEditor?: (hookText: string) => void;
  onSendToScenePlanner?: (hookText: string) => void;
  brand?: any;
}

export default function RetentionHookLab({ initialText = '', showToast, onApplyHookToEditor, onSendToScenePlanner, brand }: RetentionHookLabProps) {
  const [inputText, setInputText] = useState(initialText);
  const [platform, setPlatform] = useState<'youtube' | 'tiktok' | 'reels'>('youtube');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [error, setError] = useState('');
  const [copiedHookIndex, setCopiedHookIndex] = useState<number | null>(null);

  const handleAnalyze = async () => {
    if (!inputText.trim()) {
      setError('Please provide a hook or intro to analyze.');
      return;
    }
    setError('');
    setIsAnalyzing(true);
    try {
      const data = await analyzeAndOptimizeRetention(inputText, platform, brand);
      setResult(data?.retention_analysis || data);
      showToast('Retention analysis complete!');
    } catch (err: any) {
      console.error('Retention Analysis failed:', err);
      showToast(err.message || 'Failed to analyze retention. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const copyHook = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedHookIndex(index);
    setTimeout(() => setCopiedHookIndex(null), 2000);
    showToast('Hook copied to clipboard!');
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-500 border-emerald-500/30 bg-emerald-500/10';
    if (score >= 60) return 'text-amber-500 border-amber-500/30 bg-amber-500/10';
    return 'text-rose-500 border-rose-500/30 bg-rose-500/10';
  };

  return (
    <div className="space-y-6 w-full max-w-6xl mx-auto">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[var(--accent)]/15 via-[var(--bg-tertiary)] to-[var(--bg-tertiary)] p-6 rounded-3xl border border-[var(--accent)]/20 shadow-sm relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[12px] font-extrabold uppercase tracking-widest text-[var(--accent)]">
                Vertano Retention Lab
              </span>
              <span className="text-[12px] text-[var(--separator)] px-1">&bull;</span>
              <span className="text-[12px] font-semibold text-[var(--label-tertiary)] flex items-center gap-1">
                <Lightning size={14} className="text-amber-400" weight="fill" /> Algorithmic First 5s Optimizer
              </span>
            </div>
            <h2 className="text-2xl font-bold text-[var(--label-primary)]">Viral Hook & Viewer Retention Engine</h2>
            <p className="text-[13px] text-[var(--label-secondary)] max-w-2xl">
              80% of video drop-off occurs in seconds 1–5. Test your intro, diagnose retention risk, and instantly unlock 5 high-converting pattern-disrupt hooks.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-[var(--bg-secondary)] p-1.5 rounded-2xl border border-[var(--separator)]">
            {(['youtube', 'tiktok', 'reels'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPlatform(p)}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-[12px] font-bold capitalize transition-all",
                  platform === p
                    ? "bg-[var(--accent)] text-white shadow-sm"
                    : "text-[var(--label-secondary)] hover:text-[var(--label-primary)]"
                )}
              >
                {p === 'youtube' ? 'YouTube' : p === 'tiktok' ? 'TikTok' : 'Reels'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Input Section */}
      <div className="bg-[var(--bg-tertiary)] p-5 rounded-2xl border border-[var(--separator)] space-y-4 shadow-sm">
        <label className="text-[13px] font-bold text-[var(--label-primary)] flex items-center justify-between">
          <span>Draft Hook or Video Script</span>
          <span className="text-[11px] text-[var(--label-tertiary)] font-normal">Paste your intro or spoken opening lines</span>
        </label>

        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="E.g., Hey guys welcome back to my channel! Today I'm going to talk about 5 simple ways to save money when you're starting out..."
          className="w-full h-32 bg-[var(--bg-secondary)] border border-[var(--separator)] rounded-xl p-3.5 text-[13px] font-medium text-[var(--label-primary)] outline-none focus:border-[var(--accent)] transition-colors resize-none leading-relaxed"
        />

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pt-1 gap-4">
          <div className="text-[12px] text-[var(--label-tertiary)] flex items-center gap-1.5">
            <Target size={15} className="text-[var(--accent)] shrink-0" />
            <span>Target: Maintain &gt;70% viewer retention past 0:05</span>
          </div>

          <button
            onClick={handleAnalyze}
            disabled={isAnalyzing || !inputText.trim()}
            className="ios-button ios-button-filled h-10 px-6 font-semibold w-full sm:w-auto"
          >
            {isAnalyzing ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0" />
                <span className="whitespace-nowrap">Simulating Attention...</span>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2">
                <Sparkle size={18} weight="fill" className="shrink-0" />
                <span className="whitespace-nowrap">Diagnose & Optimize</span>
              </div>
            )}
          </button>
        </div>
      </div>

      {/* Analysis & Optimization Results */}
      {result && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Top Score Banner */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            {/* Score Box */}
            <div className="md:col-span-4 bg-[var(--bg-tertiary)] p-5 rounded-2xl border border-[var(--separator)] flex flex-col justify-between items-center text-center space-y-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--label-tertiary)]">Predicted 0–5s Retention</span>
              
              <div className="relative flex items-center justify-center">
                <div className={cn(
                  "w-28 h-28 rounded-full border-4 flex flex-col items-center justify-center shadow-inner",
                  getScoreColor(result.retention_score || 50)
                )}>
                  <span className="text-3xl font-extrabold tracking-tight">{result.retention_score || 0}%</span>
                  <span className="text-[10px] font-semibold uppercase opacity-80 mt-0.5">Hold Rate</span>
                </div>
              </div>

              <div className={cn(
                "px-3 py-1 rounded-full text-[12px] font-bold border",
                getScoreColor(result.retention_score || 50)
              )}>
                {result.verdict || 'Analysis Complete'}
              </div>
            </div>

            {/* Critique & Drop-off Causes */}
            <div className="md:col-span-8 bg-[var(--bg-tertiary)] p-5 rounded-2xl border border-[var(--separator)] space-y-4 flex flex-col justify-between">
              <div>
                <h3 className="font-bold text-[15px] text-[var(--label-primary)] flex items-center gap-2 mb-1.5">
                  <Eye size={18} className="text-[var(--accent)]" />
                  <span>Viewer First Impression Analysis</span>
                </h3>
                <p className="text-[13px] font-medium text-[var(--label-secondary)] leading-relaxed">
                  "{result.summary_critique}"
                </p>
              </div>

              {result.dropoff_reasons && result.dropoff_reasons.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-[var(--separator)]">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--label-tertiary)] flex items-center gap-1">
                    <WarningCircle size={14} className="text-rose-500" /> Retention Leak Causes:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {result.dropoff_reasons.map((reason: string, i: number) => (
                      <span key={i} className="text-[12px] font-semibold px-3 py-1 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20">
                        {reason}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 5-Second Heatmap & Pattern Disrupt Sequence */}
          {result.first_5s_heatmap && (
            <div className="bg-[var(--bg-tertiary)] p-5 rounded-2xl border border-[var(--separator)] space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-[15px] text-[var(--label-primary)] flex items-center gap-2">
                    <Waves size={18} className="text-[var(--accent)]" />
                    <span>Second-by-Second Viewer Attention Heatmap</span>
                  </h3>
                  <p className="text-[12px] text-[var(--label-tertiary)] mt-0.5">Predicted viewer mindset and required visual pattern disrupt for every second</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 pt-2">
                {result.first_5s_heatmap.map((item: any, idx: number) => (
                  <div key={idx} className="bg-[var(--bg-secondary)] p-3.5 rounded-xl border border-[var(--separator)] space-y-2 flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-extrabold px-2 py-0.5 rounded bg-[var(--bg-tertiary)] text-[var(--accent)] border border-[var(--separator)]">
                        0:0{item.second}
                      </span>
                      <span className={cn(
                        "text-[11px] font-bold",
                        item.attention_level >= 75 ? "text-emerald-400" : item.attention_level >= 50 ? "text-amber-400" : "text-rose-400"
                      )}>
                        {item.attention_level}% Hold
                      </span>
                    </div>

                    <div className="space-y-1 my-1">
                      <span className="text-[10px] font-semibold text-[var(--label-tertiary)] uppercase block">Viewer Mindset</span>
                      <p className="text-[11px] font-medium text-[var(--label-secondary)] italic">
                        "{item.viewer_thought}"
                      </p>
                    </div>

                    <div className="bg-[var(--bg-tertiary)] p-2 rounded-lg border border-[var(--separator)]/50 space-y-0.5">
                      <span className="text-[9px] font-bold text-[var(--accent)] uppercase tracking-wider block">Visual Disrupt</span>
                      <p className="text-[10px] font-semibold text-[var(--label-primary)] leading-tight">
                        {item.visual_pattern_disrupt}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 5 High-Converting Viral Hook Rewrites */}
          {result.optimized_hooks && result.optimized_hooks.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-[18px] text-[var(--label-primary)] flex items-center gap-2">
                    <Lightning size={20} className="text-amber-400" weight="fill" />
                    <span>5 High-Converting Viral Hook Rewrites</span>
                  </h3>
                  <p className="text-[12px] text-[var(--label-tertiary)]">Tested pattern disrupt hooks designed to double your first-5-second retention hold</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {result.optimized_hooks.map((hook: any, index: number) => (
                  <div
                    key={index}
                    className="bg-[var(--bg-tertiary)] p-5 rounded-2xl border border-[var(--separator)] space-y-3.5 hover:border-[var(--accent)]/40 transition-all shadow-sm"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--separator)] pb-3">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-[var(--accent)]" />
                        <h4 className="font-bold text-[15px] text-[var(--label-primary)]">{hook.angle_name}</h4>
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          {hook.ctr_boost_estimate}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[12px] font-bold text-[var(--label-tertiary)] flex items-center gap-1">
                          <Gauge size={14} className="text-[var(--accent)]" /> Predicted Retention: <strong className="text-[var(--label-primary)]">{hook.predicted_retention}%</strong>
                        </span>
                      </div>
                    </div>

                    {/* Spoken Hook Text */}
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--label-tertiary)] block mb-1">Spoken Hook Script</span>
                      <p className="text-[14px] font-semibold text-[var(--label-primary)] leading-relaxed bg-[var(--bg-secondary)] p-3.5 rounded-xl border border-[var(--separator)]">
                        "{hook.hook_text}"
                      </p>
                    </div>

                    {/* Visual Pattern Disrupt */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                      <div className="bg-[var(--accent)]/10 px-3 py-2 rounded-xl border border-[var(--accent)]/20 flex items-center gap-2 text-[12px]">
                        <FilmScript size={16} className="text-[var(--accent)]" />
                        <span className="font-semibold text-[var(--label-primary)]">
                          Visual Pattern Disrupt: <span className="font-normal text-[var(--label-secondary)]">{hook.visual_cue}</span>
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => copyHook(hook.hook_text, index)}
                          className="ios-button ios-button-gray h-9 px-4 font-semibold text-[13px]"
                        >
                          {copiedHookIndex === index ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                          <span>{copiedHookIndex === index ? 'Copied' : 'Copy'}</span>
                        </button>

                        {onApplyHookToEditor && (
                          <button
                            onClick={() => {
                              onApplyHookToEditor(hook.hook_text);
                              showToast('Applied hook to Content Studio');
                            }}
                            className="ios-button ios-button-filled h-9 px-4 font-semibold text-[13px]"
                          >
                            <span>Apply to Editor</span>
                            <ArrowRight size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Mid-Video Pacing Guidelines */}
          {result.mid_video_pacing_tips && result.mid_video_pacing_tips.length > 0 && (
            <div className="bg-[var(--bg-tertiary)] p-5 rounded-2xl border border-[var(--separator)] space-y-3">
              <h3 className="font-bold text-[15px] text-[var(--label-primary)] flex items-center gap-2">
                <TrendUp size={18} className="text-emerald-400" />
                <span>Algorithmic Mid-Video Retention Rules</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {result.mid_video_pacing_tips.map((tip: string, i: number) => (
                  <div key={i} className="bg-[var(--bg-secondary)] p-3.5 rounded-xl border border-[var(--separator)] text-[12px] font-medium text-[var(--label-secondary)] leading-relaxed">
                    <strong className="text-[var(--label-primary)] block mb-1">Rule #{i + 1}</strong>
                    {tip}
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
