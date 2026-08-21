import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { FilmScript, Sparkle, Clock, Copy, Check, VideoCamera, Image as ImageIcon, TextAa, Warning, ArrowRight, ListChecks, Export } from '@phosphor-icons/react';
import { cn } from '../lib/utils';
import { generateScenePlan } from '../services/gemini';

interface ScenePlannerProps {
  initialScript?: string;
  initialTitle?: string;
  showToast: (msg: string) => void;
  onSendToVideoStudio?: (prompt: string) => void;
  brand?: any;
}

export default function ScenePlanner({ initialScript = '', initialTitle = '', showToast, onSendToVideoStudio, brand }: ScenePlannerProps) {
  const [scriptText, setScriptText] = useState(initialScript);
  const [titleText, setTitleText] = useState(initialTitle);
  const [isGenerating, setIsGenerating] = useState(false);
  const [scenePlan, setScenePlan] = useState<any | null>(null);
  const [copiedBeatId, setCopiedBeatId] = useState<string | null>(null);
  const [copiedJson, setCopiedJson] = useState(false);
  const [error, setError] = useState('');

  const handleGeneratePlan = async () => {
    if (!scriptText.trim()) {
      showToast('Please enter or paste a video script first.');
      return;
    }
    setError('');
    setIsGenerating(true);
    try {
      const plan = await generateScenePlan(scriptText, titleText, brand);
      setScenePlan(plan?.video_plan || plan);
      showToast('Scene plan generated successfully!');
    } catch (err: any) {
      console.error('Failed to generate scene plan:', err);
      showToast(err.message || 'Failed to generate scene plan. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = (text: string, id?: string) => {
    navigator.clipboard.writeText(text);
    if (id) {
      setCopiedBeatId(id);
      setTimeout(() => setCopiedBeatId(null), 2000);
    } else {
      setCopiedJson(true);
      setTimeout(() => setCopiedJson(false), 2000);
    }
    showToast('Copied to clipboard');
  };

  const copyToMarkdownTable = () => {
    if (!scenePlan) return;
    
    let md = `| Section | Duration | Narration | Visual Type | Visual Detail |\n`;
    md += `| :--- | :--- | :--- | :--- | :--- |\n`;
    
    scenePlan.sections?.forEach((section: any) => {
      section.beats?.forEach((beat: any) => {
        const visual = beat.visual;
        const visualDetail = visual.type === 'stock_video' ? visual.stock_query : 
                             visual.type === 'title_card' ? visual.title_card_text : 
                             visual.ai_image_prompt;
                             
        md += `| ${section.section_label} | ${beat.est_seconds}s | ${beat.narration.replace(/\n/g, ' ')} | ${visual.type} | ${visualDetail} |\n`;
      });
    });
    
    navigator.clipboard.writeText(md);
    showToast('Markdown table copied to clipboard!');
  };

  const formatTotalTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const getVisualBadgeColor = (type: string) => {
    switch (type) {
      case 'stock_video':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'title_card':
        return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
      case 'ai_image':
        return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      case 'stock_photo':
        return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
      default:
        return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }
  };

  const getVisualIcon = (type: string) => {
    switch (type) {
      case 'stock_video':
        return <VideoCamera size={14} weight="fill" />;
      case 'title_card':
        return <TextAa size={14} weight="bold" />;
      case 'ai_image':
        return <Sparkle size={14} weight="fill" />;
      default:
        return <ImageIcon size={14} weight="fill" />;
    }
  };

  return (
    <div className="space-y-6 w-full">
      {/* Input Form */}
      <div className="bg-[var(--bg-tertiary)] p-5 rounded-2xl ios-card space-y-4">
        <div className="flex items-center justify-between border-b border-[var(--separator)] pb-3">
          <div className="flex items-center gap-2.5">
            <FilmScript size={22} className="text-[var(--accent)]" weight="fill" />
            <div>
              <h3 className="font-semibold text-[16px] text-[var(--label-primary)]">Vertano Scene Planner</h3>
              <p className="text-[12px] text-[var(--label-tertiary)]">Segment scripts into timed visual beats & camera shot lists for YouTube</p>
            </div>
          </div>
          {scenePlan && (
            <div className="flex items-center gap-2">
              <button
                onClick={copyToMarkdownTable}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--bg-secondary)] text-[12px] font-semibold text-[var(--label-secondary)] hover:text-[var(--label-primary)] transition-colors border border-[var(--separator)]"
              >
                <Export size={14} />
                <span>Export Markdown Table</span>
              </button>
              <button
                onClick={() => copyToClipboard(JSON.stringify({ video_plan: scenePlan }, null, 2))}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--bg-secondary)] text-[12px] font-semibold text-[var(--label-secondary)] hover:text-[var(--label-primary)] transition-colors border border-[var(--separator)]"
              >
                {copiedJson ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                <span>{copiedJson ? 'Copied JSON' : 'Export JSON'}</span>
              </button>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-[12px] font-semibold text-[var(--label-secondary)] mb-1 block">Video Working Title</label>
            <input
              type="text"
              value={titleText}
              onChange={(e) => setTitleText(e.target.value)}
              placeholder="E.g., 5 Daily Habits That Changed My Life"
              className="w-full bg-[var(--bg-secondary)] border border-[var(--separator)] rounded-xl px-3 py-2 text-[13px] font-medium text-[var(--label-primary)] outline-none focus:border-[var(--accent)]"
            />
          </div>

          <div>
            <label className="text-[12px] font-semibold text-[var(--label-secondary)] mb-1 block">Finished Script</label>
            <textarea
              value={scriptText}
              onChange={(e) => setScriptText(e.target.value)}
              placeholder="Paste your full YouTube script here..."
              className="w-full h-36 bg-[var(--bg-secondary)] border border-[var(--separator)] rounded-xl p-3 text-[13px] font-medium text-[var(--label-primary)] outline-none focus:border-[var(--accent)] resize-none"
            />
          </div>

          <div className="flex justify-end pt-1">
            <button
              onClick={handleGeneratePlan}
              disabled={isGenerating || !scriptText.trim()}
              className="ios-button ios-button-tinted w-full md:w-auto"
            >
              {isGenerating ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Planning Shot Beats...</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <ListChecks size={18} weight="bold" />
                  <span>Segment Script into Visual Beats</span>
                </div>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Generated Shot List */}
      {scenePlan && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Summary Overview Bar */}
          <div className="bg-[var(--bg-tertiary)] p-4 rounded-2xl border border-[var(--separator)] grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <span className="text-[11px] font-medium text-[var(--label-tertiary)] uppercase tracking-wider block">Estimated Duration</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Clock size={16} className="text-[var(--accent)]" />
                <span className="text-[16px] font-bold text-[var(--label-primary)]">
                  {formatTotalTime(scenePlan.target_length_seconds_estimate || 0)}
                </span>
              </div>
            </div>

            <div>
              <span className="text-[11px] font-medium text-[var(--label-tertiary)] uppercase tracking-wider block">Target Pace</span>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={cn(
                  "px-2 py-0.5 rounded-full text-[11px] font-bold uppercase border",
                  scenePlan.length_flag === 'ok' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                  scenePlan.length_flag === 'under' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                  'bg-rose-500/10 text-rose-500 border-rose-500/20'
                )}>
                  {scenePlan.length_flag || 'ok'} target
                </span>
              </div>
            </div>

            <div>
              <span className="text-[11px] font-medium text-[var(--label-tertiary)] uppercase tracking-wider block">Speech Rate</span>
              <span className="text-[14px] font-semibold text-[var(--label-primary)] mt-0.5 block">
                {scenePlan.wpm_assumed || 150} WPM Assumed
              </span>
            </div>

            <div>
              <span className="text-[11px] font-medium text-[var(--label-tertiary)] uppercase tracking-wider block">Total Sections</span>
              <span className="text-[14px] font-semibold text-[var(--label-primary)] mt-0.5 block">
                {scenePlan.sections?.length || 0} Sections
              </span>
            </div>
          </div>

          {/* Sections and Beats list */}
          <div className="space-y-5">
            {scenePlan.sections?.map((section: any, idx: number) => (
              <div key={section.section_id || idx} className="bg-[var(--bg-tertiary)] rounded-2xl p-5 border border-[var(--separator)] space-y-3">
                <div className="flex items-center justify-between border-b border-[var(--separator)] pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[var(--accent)]" />
                    <h4 className="font-bold text-[15px] text-[var(--label-primary)]">{section.section_label || section.section_type}</h4>
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-[var(--bg-secondary)] text-[var(--label-secondary)] uppercase">
                      {section.section_type}
                    </span>
                  </div>
                  <span className="text-[12px] font-medium text-[var(--label-tertiary)]">
                    {section.beats?.length || 0} visual beats
                  </span>
                </div>

                <div className="space-y-3 pt-1">
                  {section.beats?.map((beat: any) => (
                    <div
                      key={beat.beat_id}
                      className="bg-[var(--bg-secondary)] p-4 rounded-xl border border-[var(--separator)] space-y-2.5 hover:border-[var(--accent)]/30 transition-all"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-[var(--bg-tertiary)] text-[var(--label-secondary)] border border-[var(--separator)]">
                            Beat #{beat.beat_id}
                          </span>
                          <span className="text-[11px] font-semibold text-[var(--label-tertiary)] flex items-center gap-1">
                            <Clock size={12} /> {beat.est_seconds}s
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border",
                            getVisualBadgeColor(beat.visual?.type)
                          )}>
                            {getVisualIcon(beat.visual?.type)}
                            <span>{beat.visual?.type?.replace('_', ' ')}</span>
                          </span>

                          {onSendToVideoStudio && (
                            <button
                              onClick={() => {
                                const prompt = beat.visual?.ai_image_prompt || beat.visual?.stock_query || beat.narration;
                                onSendToVideoStudio(prompt);
                                showToast('Sent beat prompt to Gemini Video Studio');
                              }}
                              className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-[var(--accent)]/10 text-[var(--accent)] hover:bg-[var(--accent)]/20 text-[11px] font-semibold transition-colors"
                              title="Send to Gemini Video Studio"
                            >
                              <span>Studio</span>
                              <ArrowRight size={12} />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Narration */}
                      <p className="text-[13px] font-medium text-[var(--label-primary)] leading-relaxed italic bg-[var(--bg-tertiary)]/50 p-2.5 rounded-lg border border-[var(--separator)]/50">
                        "{beat.narration}"
                      </p>

                      {/* Visual Details */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[12px] pt-1">
                        <div className="bg-[var(--bg-tertiary)] p-2.5 rounded-lg border border-[var(--separator)]/40 space-y-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--label-tertiary)] block">Stock Query (Plan A)</span>
                          <span className="font-semibold text-[var(--label-primary)]">{beat.visual?.stock_query}</span>
                        </div>

                        <div className="bg-[var(--bg-tertiary)] p-2.5 rounded-lg border border-[var(--separator)]/40 space-y-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--label-tertiary)] block">AI Image Prompt (Plan B)</span>
                          <span className="font-semibold text-[var(--label-primary)]">{beat.visual?.ai_image_prompt}</span>
                        </div>
                      </div>

                      {(beat.visual?.title_card_text || beat.on_screen_text) && (
                        <div className="flex flex-wrap gap-2 text-[11px] pt-1">
                          {beat.visual?.title_card_text && (
                            <span className="px-2.5 py-1 rounded-md bg-purple-500/10 text-purple-400 font-semibold border border-purple-500/20">
                              Title Card: "{beat.visual.title_card_text}"
                            </span>
                          )}
                          {beat.on_screen_text && (
                            <span className="px-2.5 py-1 rounded-md bg-blue-500/10 text-blue-400 font-semibold border border-blue-500/20">
                              On-Screen Text: "{beat.on_screen_text}"
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
