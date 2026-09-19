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
        initial={{ opacity: 0, y: 14, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full relative overflow-hidden rounded-[26px] p-6 border border-purple-500/30 bg-gradient-to-br from-purple-950/40 via-indigo-950/30 to-black/60 backdrop-blur-2xl shadow-[0_0_40px_rgba(168,85,247,0.18)]"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-purple-500/10 to-transparent animate-pulse pointer-events-none" />
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-2xl bg-purple-500/20 text-purple-300 border border-purple-400/30">
            <MagicWand size={22} weight="duotone" className="animate-spin text-purple-300" style={{ animationDuration: '4s' }} />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
          </div>
          <div className="space-y-1">
            <h4 className="text-[14px] font-semibold tracking-wide text-purple-200 flex items-center gap-1.5">
              <Sparkle size={14} weight="fill" className="text-amber-300 animate-spin" style={{ animationDuration: '6s' }} />
              The Creative Muse is Awakening...
            </h4>
            <p className="text-[12px] text-purple-200/70 font-medium">
              Sensing real-time viral currents and low-competition goldmines for day-zero creators...
            </p>
          </div>
        </div>
      </motion.div>
    );
  }

  if (!data || !data.sparks || data.sparks.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      transition={{ type: "spring", damping: 24, stiffness: 180 }}
      className="w-full relative overflow-hidden rounded-[28px] border border-purple-500/30 bg-gradient-to-br from-purple-950/40 via-indigo-950/30 to-black/70 backdrop-blur-2xl shadow-[0_12px_44px_rgba(147,51,234,0.18)] p-5 sm:p-6 space-y-4"
    >
      {/* Mystical decorative aurora blobs */}
      <div className="absolute -top-16 -right-16 w-36 h-36 bg-fuchsia-500/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-16 -left-16 w-36 h-36 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

      {/* Header bar */}
      <div className="relative z-10 flex items-start justify-between gap-3 border-b border-purple-500/15 pb-3.5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-purple-500 to-indigo-500 text-white flex items-center justify-center shadow-lg shadow-purple-500/30">
            <MagicWand size={18} weight="fill" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-purple-300/90">
                Creative Muse
              </span>
              <span className="text-purple-400/50">•</span>
              <span className="text-[11px] font-medium text-emerald-300 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live Market Radar
              </span>
            </div>
            <h4 className="text-[15px] font-semibold text-white tracking-tight">
              Don't Fear the Blank Page
            </h4>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {onRefresh && !disabled && (
            <button
              onClick={onRefresh}
              title="Refresh sparks"
              className="p-1.5 text-purple-300/70 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
            >
              <ArrowClockwise size={14} />
            </button>
          )}
          {onDismiss && (
            <button
              onClick={onDismiss}
              title="Dismiss for now"
              className="text-[11px] font-medium text-purple-300/60 hover:text-purple-200 px-2 py-1 rounded-lg hover:bg-white/5 transition-colors"
            >
              Type my own
            </button>
          )}
        </div>
      </div>

      {/* Muse Message */}
      <p className="relative z-10 text-[13.5px] sm:text-[14px] leading-relaxed text-purple-100/90 font-medium">
        {data.museMessage}
      </p>

      {/* Sparks Grid */}
      <div className="relative z-10 grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
        {data.sparks.map((spark, idx) => {
          const isSelected = selectedSparkTitle === spark.title;
          const isTrending = spark.type === 'trending';

          return (
            <motion.div
              key={idx}
              whileHover={disabled ? {} : { y: -3, scale: 1.01 }}
              whileTap={disabled ? {} : { scale: 0.98 }}
              onClick={() => {
                if (!disabled) onSelectSpark(spark);
              }}
              className={cn(
                "group relative text-left rounded-2xl p-3.5 border transition-all duration-300 cursor-pointer flex flex-col justify-between overflow-hidden",
                isSelected
                  ? "bg-purple-600/30 border-purple-400 ring-2 ring-purple-400/50 shadow-lg shadow-purple-500/20"
                  : isTrending
                    ? "bg-gradient-to-b from-amber-500/10 via-white/[0.03] to-transparent border-amber-500/25 hover:border-amber-400/60 hover:shadow-[0_8px_24px_rgba(245,158,11,0.15)]"
                    : "bg-gradient-to-b from-cyan-500/10 via-white/[0.03] to-transparent border-cyan-500/25 hover:border-cyan-400/60 hover:shadow-[0_8px_24px_rgba(6,182,212,0.15)]",
                disabled && !isSelected && "opacity-40 cursor-not-allowed"
              )}
            >
              {/* Badge */}
              <div className="flex items-center justify-between gap-1 mb-2">
                <span className={cn(
                  "inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border",
                  isTrending
                    ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
                    : "bg-cyan-500/15 text-cyan-300 border-cyan-500/30"
                )}>
                  {isTrending ? (
                    <Fire size={11} weight="fill" className="text-amber-400" />
                  ) : (
                    <Diamond size={11} weight="fill" className="text-cyan-400" />
                  )}
                  {spark.badge}
                </span>

                <Sparkle size={13} weight="fill" className="text-purple-400/40 group-hover:text-amber-300 transition-colors" />
              </div>

              {/* Title & Pitch */}
              <div className="space-y-1.5 flex-1">
                <h5 className="text-[13.5px] font-bold text-white group-hover:text-purple-100 transition-colors leading-snug">
                  {spark.title}
                </h5>
                <p className="text-[11.5px] text-purple-200/70 line-clamp-2 leading-relaxed">
                  {spark.pitch}
                </p>
              </div>

              {/* Tags & Action Button */}
              <div className="pt-3 mt-2 border-t border-white/5 space-y-2">
                <div className="flex flex-wrap gap-1 text-[10px] text-white/50">
                  <span className="flex items-center gap-1 bg-white/5 px-1.5 py-0.5 rounded">
                    <Users size={10} />
                    {spark.dreamViewer.split('&')[0].trim()}
                  </span>
                  <span className="flex items-center gap-1 bg-white/5 px-1.5 py-0.5 rounded">
                    <Smiley size={10} />
                    {spark.vibe.split(',')[0].trim()}
                  </span>
                </div>

                <div className={cn(
                  "w-full py-1.5 px-2 rounded-xl text-[11px] font-semibold flex items-center justify-center gap-1 transition-all",
                  isSelected
                    ? "bg-purple-500 text-white"
                    : "bg-white/10 text-purple-200 group-hover:bg-purple-500 group-hover:text-white"
                )}>
                  <span>{isSelected ? "Selected ✦" : "Choose this niche"}</span>
                  <CaretRight size={12} weight="bold" />
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
