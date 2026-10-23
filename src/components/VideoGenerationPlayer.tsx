import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CircleNotch as Loader2 } from '@phosphor-icons/react';
import { cn } from '../lib/utils';
import CustomVideoPlayer from './CustomVideoPlayer';

export interface VideoGenerationPlayerProps {
  videoUrl: string | null;
  isVideoGenerating: boolean;
  videoAspect: '9:16' | '16:9';
  videoGenerationProgress: string;
  videoProgressPercent: number;
  videoElapsedSeconds: number;
}

const formatElapsed = (totalSeconds: number) => {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
};

const STAGES = [
  { label: 'Submit', at: 2 },
  { label: 'Compose', at: 10 },
  { label: 'Render', at: 35 },
  { label: 'Refine', at: 65 },
  { label: 'Deliver', at: 97 },
];

export default function VideoGenerationPlayer({
  videoUrl,
  isVideoGenerating,
  videoAspect,
  videoGenerationProgress,
  videoProgressPercent,
  videoElapsedSeconds,
}: VideoGenerationPlayerProps) {
  const pct = Math.max(0, Math.min(100, videoProgressPercent));
  const currentStage = STAGES.reduce((acc, s, i) => (pct >= s.at ? i : acc), 0);
  return (
    <AnimatePresence mode="wait">
      {videoUrl || isVideoGenerating ? (
        <motion.section
          key="player"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="space-y-4"
        >
          <span className="ios-label">Gemini Preview</span>
          <div
            className={cn(
              'bg-[var(--bg-tertiary)] rounded-2xl overflow-hidden w-full flex items-center justify-center relative bg-black/5 shadow-xl max-h-[600px]',
              videoAspect === '16:9' ? 'aspect-video' : 'aspect-[9/16]',
            )}
            style={{ minHeight: '300px' }}
          >
            {isVideoGenerating ? (
              <div className="flex flex-col items-center gap-4 w-full max-w-[320px] p-6">
                <Loader2 className="w-8 h-8 animate-spin text-[var(--accent)]" />
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-[var(--label-primary)] tabular-nums">
                    {pct}%
                  </span>
                  <span className="text-[12px] font-semibold tracking-wide text-[var(--label-secondary)] tabular-nums">
                    elapsed {formatElapsed(videoElapsedSeconds)}
                  </span>
                </div>
                <div className="w-full h-1.5 bg-[var(--separator)] rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-[var(--accent)]"
                    initial={{ width: '0%' }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                  />
                </div>
                <span className="text-[12px] font-bold tracking-widest text-[var(--label-secondary)] uppercase text-center w-full">
                  {videoGenerationProgress}
                </span>
                <div className="flex items-center gap-1.5 w-full justify-center">
                  {STAGES.map((s, i) => (
                    <React.Fragment key={s.label}>
                      <span
                        className={cn(
                          'text-[9px] font-bold tracking-wider uppercase transition-colors',
                          i < currentStage
                            ? 'text-[var(--accent)]'
                            : i === currentStage
                              ? 'text-[var(--label-primary)]'
                              : 'text-[var(--label-tertiary)] opacity-50',
                        )}
                      >
                        {s.label}
                      </span>
                      {i < STAGES.length - 1 && (
                        <span
                          className={cn(
                            'w-3 h-px',
                            i < currentStage ? 'bg-[var(--accent)]' : 'bg-[var(--separator)]',
                          )}
                        />
                      )}
                    </React.Fragment>
                  ))}
                </div>
                <span className="text-[11px] text-[var(--label-tertiary)]">
                  Video renders usually take 1–3 minutes. Keep this tab open — we'll warn you if
                  anything looks stuck.
                </span>
              </div>
            ) : videoUrl ? (
              <CustomVideoPlayer videoUrl={videoUrl} />
            ) : null}
          </div>
        </motion.section>
      ) : null}
    </AnimatePresence>
  );
}
