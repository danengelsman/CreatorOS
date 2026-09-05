import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { VideoCamera, Clock, User, Sparkle, Image as ImageIcon, TextAa, ClockCounterClockwise, Lightning } from '@phosphor-icons/react';
import { cn } from '../lib/utils';

export interface VideoScriptEditorProps {
  showSettings: boolean;
  videoStyle: 'faceless' | 'avatar' | 'upload';
  setVideoStyle: (s: 'faceless' | 'avatar' | 'upload') => void;
  videoAspect: '9:16' | '16:9';
  setVideoAspect: (s: '9:16' | '16:9') => void;
  videoLength: string;
  setVideoLength: (s: string) => void;
  avatarGender: string;
  setAvatarGender: (s: string) => void;
  avatarClothing: string;
  setAvatarClothing: (s: string) => void;
  backgroundStyle: string;
  setBackgroundStyle: (s: string) => void;
  textOverlay: string;
  setTextOverlay: (s: string) => void;
  ttsScript: string;
  setTtsScript: (s: string) => void;
  editedPrompt: string;
  setEditedPrompt: (s: string) => void;
  isPromptCustomized: boolean;
  setIsPromptCustomized: (b: boolean) => void;
}

export default function VideoScriptEditor({
  showSettings,
  videoStyle, setVideoStyle,
  videoAspect, setVideoAspect,
  videoLength, setVideoLength,
  avatarGender, setAvatarGender,
  avatarClothing, setAvatarClothing,
  backgroundStyle, setBackgroundStyle,
  textOverlay, setTextOverlay,
  ttsScript, setTtsScript,
  editedPrompt, setEditedPrompt,
  isPromptCustomized, setIsPromptCustomized
}: VideoScriptEditorProps) {
  return (
    <>
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="py-4 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Styling Row 1 */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[13px] font-semibold text-[var(--label-secondary)] flex items-center gap-2">
                      <VideoCamera size={16} /> Video Style
                    </label>
                    <div className="flex items-center bg-[var(--bg-secondary)] p-1 rounded-xl">
                        <button onClick={() => setVideoStyle('faceless')} className={cn("flex-1 py-1.5 rounded-[8px] text-[13px] font-semibold transition-all", videoStyle === 'faceless' ? "bg-[var(--bg-primary)] ios-elevated text-[var(--accent)]" : "text-[var(--label-secondary)] hover:text-[var(--label-primary)]")}>Faceless</button>
                        <button onClick={() => setVideoStyle('avatar')} className={cn("flex-1 py-1.5 rounded-[8px] text-[13px] font-semibold transition-all", videoStyle === 'avatar' ? "bg-[var(--bg-primary)] ios-elevated text-[var(--accent)]" : "text-[var(--label-secondary)] hover:text-[var(--label-primary)]")}>AI Avatar</button>
                        <button onClick={() => setVideoStyle('upload')} className={cn("flex-1 py-1.5 rounded-[8px] text-[13px] font-semibold transition-all", videoStyle === 'upload' ? "bg-[var(--bg-primary)] ios-elevated text-[var(--accent)]" : "text-[var(--label-secondary)] hover:text-[var(--label-primary)]")}>Upload</button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[13px] font-semibold text-[var(--label-secondary)] flex items-center gap-2">
                      <Clock size={16} /> Duration & Format
                    </label>
                    <div className="flex gap-2">
                      <select value={videoLength} onChange={e => setVideoLength(e.target.value)} className="flex-1 bg-[var(--bg-secondary)] border-none rounded-xl text-[13px] font-medium p-2 outline-none">
                        <option>Short (5s)</option>
                        <option>Long (10s)</option>
                      </select>
                      <select value={videoAspect} onChange={e => setVideoAspect(e.target.value as any)} className="w-24 bg-[var(--bg-secondary)] border-none rounded-xl text-[13px] font-medium p-2 outline-none">
                        <option value="9:16">9:16</option>
                        <option value="16:9">16:9</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[13px] font-semibold text-[var(--label-secondary)] flex items-center gap-2">
                      <ImageIcon size={16} /> Environment / Background
                    </label>
                    <input type="text" value={backgroundStyle} onChange={e => setBackgroundStyle(e.target.value)} className="w-full bg-[var(--bg-secondary)] border-none rounded-xl text-[13px] font-medium p-2 outline-none placeholder:text-[var(--label-tertiary)]" placeholder="E.g., Modern office, Cyberpunk city..." />
                  </div>
                </div>

                {/* Styling Row 2 */}
                <div className="space-y-4">
                  <AnimatePresence>
                    {videoStyle === 'avatar' && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-4">
                        <div className="space-y-2">
                          <label className="text-[13px] font-semibold text-[var(--label-secondary)] flex items-center gap-2">
                            <User size={16} /> Avatar Properties
                          </label>
                          <div className="flex gap-2">
                            <select value={avatarGender} onChange={e => setAvatarGender(e.target.value)} className="flex-1 bg-[var(--bg-secondary)] border-none rounded-xl text-[13px] font-medium p-2 outline-none">
                              <option>Female</option>
                              <option>Male</option>
                              <option>Non-binary</option>
                              <option>Robot/Mascot</option>
                            </select>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <input type="text" value={avatarClothing} onChange={e => setAvatarClothing(e.target.value)} className="w-full bg-[var(--bg-secondary)] border-none rounded-xl text-[13px] font-medium p-2 outline-none placeholder:text-[var(--label-tertiary)]" placeholder="Clothing style (e.g., Casual, Suit)..." />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="space-y-2">
                    <label className="text-[13px] font-semibold text-[var(--label-secondary)] flex items-center gap-2">
                      <TextAa size={16} /> Text Overlays / Subtitles
                    </label>
                    <input type="text" value={textOverlay} onChange={e => setTextOverlay(e.target.value)} className="w-full bg-[var(--bg-secondary)] border-none rounded-xl text-[13px] font-medium p-2 outline-none placeholder:text-[var(--label-tertiary)]" placeholder="Specify flying text or captions..." />
                  </div>
                </div>
              </div>

              <div className="space-y-2 border-t border-[var(--separator)] pt-4">
                <label className="text-[13px] font-semibold text-[var(--label-secondary)] flex items-center gap-2">
                  <Sparkle size={16} /> TTS Script / Voice Corrections
                </label>
                <p className="text-[11px] text-[var(--label-tertiary)] mb-2">Edit this script to fix any AI mispronunciations or add phonetic spelling before generating.</p>
                <textarea 
                  value={ttsScript} 
                  onChange={e => setTtsScript(e.target.value)} 
                  className="w-full h-24 bg-[var(--bg-secondary)] border-none rounded-xl text-[13px] font-medium p-3 outline-none placeholder:text-[var(--label-tertiary)] resize-none" 
                  placeholder="Enter the exact script you want spoken..." 
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {videoStyle !== 'upload' && (
        <div className="space-y-2 border-t border-[var(--separator)]/60 pt-4">
          <div className="flex items-center justify-between">
            <label className="text-[13px] font-semibold text-[var(--label-secondary)] flex items-center gap-2">
              <Sparkle size={16} className="text-[var(--accent)]" weight="fill" />
              Video Generation Prompt
            </label>
            <div className="flex items-center gap-2">
              {isPromptCustomized ? (
                <button
                  type="button"
                  onClick={() => setIsPromptCustomized(false)}
                  className="text-[11px] font-bold text-[var(--accent)] hover:underline flex items-center gap-1 cursor-pointer"
                  title="Revert to auto-generated prompt from settings above"
                >
                  <ClockCounterClockwise size={12} />
                  Reset to Auto
                </button>
              ) : (
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-[var(--accent)]/10 text-[var(--accent)] font-medium flex items-center gap-1">
                  <Lightning size={12} weight="fill" /> Auto-Generated
                </span>
              )}
            </div>
          </div>
          
          <p className="text-[11px] text-[var(--label-tertiary)]">
            Directly edit this prompt to refine precise imagery details, flow, setting descriptors, or specific cues.
          </p>
          <textarea
            value={editedPrompt}
            onChange={(e) => {
              setEditedPrompt(e.target.value);
              setIsPromptCustomized(true);
            }}
            className={cn(
              "w-full h-24 bg-[var(--bg-secondary)] border border-[var(--separator)] rounded-xl text-[13px] font-medium p-3 outline-none placeholder:text-[var(--label-tertiary)] resize-none transition-all",
              isPromptCustomized ? "ring-2 ring-[var(--accent)]/40 border-transparent bg-[var(--bg-primary)] text-[var(--label-primary)]" : "focus:border-[var(--accent)]/50 text-[var(--label-secondary)]"
            )}
            placeholder="Enter custom visual directions and script parameters..."
          />
        </div>
      )}
    </>
  );
}
