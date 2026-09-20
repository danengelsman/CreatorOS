import React from 'react';
import { motion } from 'motion/react';
import { 
  Sparkle, 
  Fire, 
  Diamond, 
  MagicWand, 
  CaretRight, 
  Compass, 
  ArrowClockwise,
  Users,
  Smiley
} from '@phosphor-icons/react';
import { cn } from '../lib/utils';

export interface NicheSpark {
  type: 'trending' | 'underserved';
  badge: string;
  title: string;
  pitch: string;
  dreamViewer: string;
  vibe: string;
}

export interface NicheSparksData {
  museMessage: string;
  sparks: NicheSpark[];
}

interface MysticalNicheSparksProps {
  data: NicheSparksData | null;
  isLoading: boolean;
  onSelectSpark: (spark: NicheSpark) => void;
  onRefresh?: () => void;
  onDismiss?: () => void;
  selectedSparkTitle?: string | null;
  disabled?: boolean;
}

export default function MysticalNicheSparks({
  data,
  isLoading,
  onSelectSpark,
  onRefresh,
  onDismiss,
  selectedSparkTitle,
  disabled
}: MysticalNicheSparksProps) {
  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full relative overflow-hidden rounded-2xl p-4 border border-purple-500/30 bg-gradient-to-br from-purple-950/40 via-indigo-950/30 to-black/60 backdrop-blur-2xl shadow-[0_0_30px_rgba(168,85,247,0.18)]"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-purple-500/10 to-transparent animate-pulse pointer-events-none" />
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-8 h-8 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-400/30 flex-shrink-0">
            <MagicWand size={18} weight="duotone" className="animate-spin text-purple-300" style={{ animationDuration: '4s' }} />
            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
          </div>
          <div className="space-y-0.5">
            <h4 className="text-[13px] font-semibold tracking-wide text-purple-200 flex items-center gap-1.5">
              <Sparkle size={13} weight="fill" className="text-amber-300 animate-spin" style={{ animationDuration: '6s' }} />
              The Creative Muse is Awakening...
            </h4>
            <p className="text-[11.5px] text-purple-200/70 font-medium">
              Scanning real-time viral currents and underserved niches for day-zero creators...
            </p>
          </div>
        </div>
      </motion.div>
    );
  }

  if (!data || !data.sparks || data.sparks.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 14, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.96 }}
      transition={{ type: "spring", damping: 26, stiffness: 220 }}
      className="w-full relative overflow-hidden rounded-2xl border border-purple-500/30 bg-gradient-to-br from-purple-950/50 via-indigo-950/40 to-black/80 backdrop-blur-2xl shadow-[0_8px_32px_rgba(147,51,234,0.18)] p-3.5 sm:p-4 space-y-2.5"
    >
      {/* Mystical decorative aurora blobs */}
      <div className="absolute -top-16 -right-16 w-32 h-32 bg-fuchsia-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-16 -left-16 w-32 h-32 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />

      {/* Header bar */}
      <div className="relative z-10 flex items-center justify-between gap-2 border-b border-purple-500/20 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-purple-500 to-indigo-500 text-white flex items-center justify-center shadow-md shadow-purple-500/30 flex-shrink-0">
            <MagicWand size={16} weight="fill" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-purple-300">
                Creative Muse
              </span>
              <span className="text-purple-400/40">•</span>
              <span className="text-[10px] font-medium text-emerald-300 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live Market Radar
              </span>
            </div>
            <h4 className="text-[13.5px] font-semibold text-white tracking-tight leading-tight">
              Don't Fear the Blank Page — 3 Sparks For You
            </h4>
          </div>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          {onRefresh && !disabled && (
            <button
              onClick={onRefresh}
              title="Refresh sparks"
              className="p-1 text-purple-300/70 hover:text-white rounded-md hover:bg-white/10 transition-colors"
            >
              <ArrowClockwise size={13} />
            </button>
          )}
          {onDismiss && (
            <button
              onClick={onDismiss}
              title="Dismiss and type own answer"
              className="text-[10px] font-medium text-purple-300/70 hover:text-purple-100 px-2 py-1 rounded-md hover:bg-white/10 transition-colors"
            >
              Type own
            </button>
          )}
        </div>
      </div>

      {/* Muse Message */}
      <p className="relative z-10 text-[12px] sm:text-[12.5px] leading-relaxed text-purple-200/90 font-medium line-clamp-2">
        {data.museMessage}
      </p>

      {/* Sparks Grid */}
      <div className="relative z-10 grid grid-cols-1 sm:grid-cols-3 gap-2 items-stretch">
        {data.sparks.map((spark, idx) => {
          const isSelected = selectedSparkTitle === spark.title;
          const isTrending = spark.type === 'trending';

          return (
            <motion.div
              key={idx}
              whileHover={disabled ? {} : { y: -2, scale: 1.01 }}
              whileTap={disabled ? {} : { scale: 0.98 }}
              onClick={() => {
                if (!disabled) onSelectSpark(spark);
              }}
              className={cn(
                "group relative text-left rounded-xl p-2.5 border transition-all duration-200 cursor-pointer flex flex-col justify-between overflow-hidden",
                isSelected
                  ? "bg-purple-600/35 border-purple-400 ring-2 ring-purple-400/50 shadow-md shadow-purple-500/20"
                  : isTrending
                    ? "bg-gradient-to-b from-amber-500/10 via-white/[0.02] to-transparent border-amber-500/25 hover:border-amber-400/60 hover:shadow-[0_4px_16px_rgba(245,158,11,0.15)]"
                    : "bg-gradient-to-b from-cyan-500/10 via-white/[0.02] to-transparent border-cyan-500/25 hover:border-cyan-400/60 hover:shadow-[0_4px_16px_rgba(6,182,212,0.15)]",
                disabled && !isSelected && "opacity-40 cursor-not-allowed"
              )}
            >
              {/* Top Badge & Sparkle */}
              <div className="flex items-center justify-between gap-1 mb-1.5">
                <span className={cn(
                  "inline-flex items-center gap-1 text-[9.5px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full border",
                  isTrending
                    ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
                    : "bg-cyan-500/15 text-cyan-300 border-cyan-500/30"
                )}>
                  {isTrending ? (
                    <Fire size={10} weight="fill" className="text-amber-400" />
                  ) : (
                    <Diamond size={10} weight="fill" className="text-cyan-400" />
                  )}
                  {spark.badge}
                </span>

                <Sparkle size={12} weight="fill" className="text-purple-400/40 group-hover:text-amber-300 transition-colors" />
              </div>

              {/* Title & Pitch */}
              <div className="space-y-1 flex-1">
                <h5 className="text-[12.5px] font-bold text-white group-hover:text-purple-100 transition-colors leading-snug line-clamp-2">
                  {spark.title}
                </h5>
                <p className="text-[11px] text-purple-200/75 line-clamp-2 leading-tight">
                  {spark.pitch}
                </p>
              </div>

              {/* Tags & Action Button */}
              <div className="pt-2 mt-1.5 border-t border-white/5 space-y-1.5">
                <div className="flex flex-wrap gap-1 text-[9.5px] text-white/60">
                  <span className="flex items-center gap-0.5 bg-white/5 px-1 py-0.5 rounded">
                    <Users size={9} />
                    {spark.dreamViewer.split('&')[0].trim()}
                  </span>
                  <span className="flex items-center gap-0.5 bg-white/5 px-1 py-0.5 rounded">
                    <Smiley size={9} />
                    {spark.vibe.split(',')[0].trim()}
                  </span>
                </div>

                <div className={cn(
                  "w-full py-1.5 px-2 rounded-lg text-[10.5px] font-semibold flex items-center justify-center gap-1 transition-all",
                  isSelected
                    ? "bg-purple-500 text-white shadow-sm"
                    : "bg-white/10 text-purple-200 group-hover:bg-purple-500 group-hover:text-white"
                )}>
                  <span>{isSelected ? "Selected ✦" : "Choose this niche"}</span>
                  <CaretRight size={11} weight="bold" />
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
