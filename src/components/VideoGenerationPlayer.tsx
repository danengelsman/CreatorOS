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
}

export default function VideoGenerationPlayer({
  videoUrl,
  isVideoGenerating,
  videoAspect,
  videoGenerationProgress
}: VideoGenerationPlayerProps) {
  return (
    <AnimatePresence mode="wait">
      {(videoUrl || isVideoGenerating) ? (
        <motion.section
          key="player"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="space-y-4"
        >
          <span className="ios-label">Gemini Preview</span>
          <div className={cn("bg-[var(--bg-tertiary)] rounded-2xl overflow-hidden w-full flex items-center justify-center relative bg-black/5 shadow-xl max-h-[600px]", videoAspect === '16:9' ? 'aspect-video' : 'aspect-[9/16]')} style={{ minHeight: '300px' }}>
              {isVideoGenerating ? (
              <div className="flex flex-col items-center gap-5 w-full max-w-[280px] p-6">
                  <Loader2 className="w-8 h-8 animate-spin text-[var(--accent)]" />
                  <div className="w-full h-1.5 bg-[var(--separator)] rounded-full overflow-hidden">
                  <motion.div
                      className="h-full bg-[var(--accent)]"
                      initial={{ width: "0%" }}
                      animate={{
                          width: videoGenerationProgress === 'Initializing Gemini Engine...' ? '15%' : 
                                 videoGenerationProgress === 'Synthesizing Gemini visuals...' ? '45%' : 
                                 videoGenerationProgress.startsWith('Gemini rendering') ? '90%' : '100%'
                      }}
                      transition={{
                          duration: videoGenerationProgress.startsWith('Gemini rendering') ? 45 : 1.5,
                          ease: videoGenerationProgress.startsWith('Gemini rendering') ? "easeOut" : "easeInOut"
                      }}
                  />
                  </div>
                  <span className="text-[12px] font-bold tracking-widest text-[var(--label-secondary)] uppercase text-center w-full truncate">
                  {videoGenerationProgress}
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
