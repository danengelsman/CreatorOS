import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Code,
  CookingPot,
  ChartLineUp,
  Drop,
  PaintBrush,
  GraduationCap,
  Sparkle,
  ArrowRight,
  Check,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import SignalScanner from '../SignalScanner';
import { SANDBOX_PRESETS } from './landingData';

interface LandingSandboxProps {
  selectedNiche: string;
  selectedVibe: string;
  isGeneratingSandbox: boolean;
  onSandboxChange: (niche: string, vibe: string) => void;
  onSignIn: () => void;
}

export default function LandingSandbox({
  selectedNiche,
  selectedVibe,
  isGeneratingSandbox,
  onSandboxChange,
  onSignIn,
}: LandingSandboxProps) {
  const currentPreset = SANDBOX_PRESETS[selectedNiche]?.[selectedVibe] || SANDBOX_PRESETS.tech.calm;

  return (
    <section
      id="sandbox"
      className="pt-[140px] pb-[100px] px-6 bg-[var(--bg-secondary)]/40 relative border-y border-[var(--separator)] overflow-hidden"
    >
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[var(--accent)] rounded-full filter blur-[200px] opacity-[0.08] pointer-events-none" />
      <div className="max-w-7xl mx-auto relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
          <span className="inline-block px-3 py-1 bg-[var(--accent)]/10 text-[var(--accent)] text-xs font-bold rounded-full uppercase tracking-widest">
            Live Style Planner
          </span>
          <h2 className="font-serif text-[38px] sm:text-[54px] md:text-[64px] font-extrabold tracking-[-0.03em] leading-[1.1] text-[var(--label-primary)]">
            Find your video style in seconds.
          </h2>
          <p className="text-[16px] sm:text-[18px] text-[var(--label-secondary)] font-medium leading-relaxed">
            Try the interactive style planner! Choose a topic and a visual style to see how easily
            our design helper creates a beautiful color palette and theme.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
          {/* Sandbox Controls (Left) */}
          <div className="lg:col-span-5 flex flex-col justify-between space-y-8 bg-[var(--bg-tertiary)] p-8 rounded-[32px] border border-[var(--separator)] shadow-sm">
            <div className="space-y-6">
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--label-secondary)] block mb-3">
                  1. Select Your Video Topic
                </label>
                <div className="grid grid-cols-1 gap-2.5">
                  {[
                    {
                      id: 'tech',
                      label: 'Technology & Coding Tips',
                      icon: <Code size={18} className="mr-2" />,
                    },
                    {
                      id: 'cooking',
                      label: 'Cooking & Delicious Recipes',
                      icon: <CookingPot size={18} className="mr-2" />,
                    },
                    {
                      id: 'finance',
                      label: 'Personal Finance & Savings',
                      icon: <ChartLineUp size={18} className="mr-2" />,
                    },
                  ].map((niche) => (
                    <button
                      key={niche.id}
                      onClick={() => onSandboxChange(niche.id, selectedVibe)}
                      className={cn(
                        'w-full text-left px-5 py-4 rounded-2xl text-[15px] font-semibold border transition-all flex items-center justify-between',
                        selectedNiche === niche.id
                          ? 'bg-[var(--accent)] text-white border-[var(--accent)] shadow-md'
                          : 'bg-[var(--bg-secondary)] text-[var(--label-primary)] border-[var(--separator)] hover:bg-[var(--bg-secondary)]/80',
                      )}
                    >
                      <span className="flex items-center">
                        {niche.icon}
                        {niche.label}
                      </span>
                      {selectedNiche === niche.id && <Check size={16} weight="bold" />}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--label-secondary)] block mb-3">
                  2. Choose Your Visual Style
                </label>
                <div className="flex flex-wrap gap-2.5">
                  {[
                    {
                      id: 'calm',
                      label: 'Soft & Peaceful',
                      icon: <Drop size={16} className="mr-1 inline" />,
                    },
                    {
                      id: 'bold',
                      label: 'Bright & Bold',
                      icon: <PaintBrush size={16} className="mr-1 inline" />,
                    },
                    {
                      id: 'educational',
                      label: 'Simple & Educational',
                      icon: <GraduationCap size={16} className="mr-1 inline" />,
                    },
                  ].map((vibe) => (
                    <button
                      key={vibe.id}
                      onClick={() => onSandboxChange(selectedNiche, vibe.id)}
                      className={cn(
                        'px-5 py-3 rounded-xl text-[14px] font-semibold border transition-all flex-1 text-center whitespace-nowrap flex justify-center items-center',
                        selectedVibe === vibe.id
                          ? 'bg-[var(--label-primary)] text-[var(--bg-primary)] border-[var(--label-primary)]'
                          : 'bg-[var(--bg-secondary)] text-[var(--label-secondary)] border-[var(--separator)] hover:bg-[var(--bg-secondary)]/80',
                      )}
                    >
                      {vibe.icon}
                      {vibe.label}
                    </button>
                  ))}
                </div>
                <div className="mt-12 w-full">
                  <SignalScanner />
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-[var(--separator)]">
              <div className="flex gap-4 items-start">
                <div className="p-2.5 bg-yellow-500/10 text-yellow-500 rounded-xl">
                  <Sparkle
                    size={20}
                    weight="fill"
                    className="animate-spin"
                    style={{ animationDuration: '6s' }}
                  />
                </div>
                <div>
                  <h4 className="text-sm font-bold">Create Your Own Styles</h4>
                  <p className="text-xs text-[var(--label-secondary)] leading-relaxed mt-1">
                    The full version supports dozens of topics, custom color pickers, beautiful font
                    pairings, and ready-to-use video writing templates.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Sandbox Live Mockup Card (Right) */}
          <div className="lg:col-span-7 flex flex-col justify-center">
            <div className="bg-[var(--bg-tertiary)] pt-14 p-6 sm:p-8 rounded-[32px] border border-[var(--separator)] shadow-xl relative overflow-hidden min-h-[500px] flex flex-col justify-between">
              {/* macOS Window Chrome Dots */}
              <div className="absolute top-5 left-6 flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#FF5F56] border border-[#E0443E]" />
                <div className="w-3 h-3 rounded-full bg-[#FFBD2E] border border-[#DEA123]" />
                <div className="w-3 h-3 rounded-full bg-[#27C93F] border border-[#1AAB29]" />
              </div>

              {/* Loader overlay */}
              <AnimatePresence>
                {isGeneratingSandbox && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-[var(--bg-tertiary)]/80 backdrop-blur-sm z-20 flex flex-col items-center justify-center space-y-4"
                  >
                    <div className="w-10 h-10 border-4 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs font-bold uppercase tracking-wider text-[var(--label-secondary)]">
                      Creating custom style...
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Simulated Channel Identity Header */}
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[var(--separator)]">
                  <div className="space-y-1">
                    <span className="text-[10px] font-extrabold uppercase tracking-[0.2em] px-2 py-0.5 bg-[var(--accent)]/10 text-[var(--accent)] rounded-md">
                      Your Custom Style Guide
                    </span>
                    <h3
                      className="text-2xl font-bold tracking-tight mt-1"
                      style={{ fontFamily: currentPreset.fontHeading }}
                    >
                      {currentPreset.name}
                    </h3>
                    <p className="text-sm text-[var(--label-secondary)] font-medium">
                      {currentPreset.tagline}
                    </p>
                  </div>

                  {/* Palette swatches */}
                  <div className="flex gap-2 items-center">
                    {Object.entries(currentPreset.colors).map(([key, val]: [string, any]) => (
                      <div key={key} className="flex flex-col items-center gap-1">
                        <div
                          className="w-8 h-8 rounded-full border border-black/10 shadow-sm"
                          style={{ backgroundColor: val }}
                        />
                        <span className="text-[9px] font-mono font-semibold uppercase text-[var(--label-tertiary)]">
                          {val}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Channel specifics */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-sm">
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold text-[var(--label-secondary)] uppercase tracking-wider block">
                      Recommended Video Style
                    </span>
                    <p className="text-[13px] leading-relaxed font-semibold text-[var(--label-primary)]">
                      {currentPreset.vibeDesc}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold text-[var(--label-secondary)] uppercase tracking-wider block">
                      Beautiful Fonts
                    </span>
                    <div className="flex gap-3 text-xs font-mono font-bold text-[var(--label-primary)]">
                      <span className="px-2 py-1 bg-[var(--bg-secondary)] rounded-md border border-[var(--separator)]">
                        Title: {currentPreset.fontHeading}
                      </span>
                      <span className="px-2 py-1 bg-[var(--bg-secondary)] rounded-md border border-[var(--separator)]">
                        Body: {currentPreset.fontBody}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Curated Script Hook Template */}
                <div className="bg-[var(--bg-secondary)] p-5 rounded-2xl border border-[var(--separator)] space-y-2 relative">
                  <span className="text-[10px] font-bold text-[var(--accent)] uppercase tracking-widest block">
                    Your Engaging Video Intro
                  </span>
                  <p className="text-[14px] leading-relaxed font-medium italic text-[var(--label-primary)]">
                    "{currentPreset.hook}"
                  </p>
                </div>

                {/* Community Signature Catchphrase */}
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-[11px] font-bold text-[var(--label-secondary)] uppercase tracking-wider">
                    Your Closing Words:
                  </span>
                  <span className="px-3 py-1 bg-emerald-500/10 text-emerald-500 rounded-full font-bold text-xs">
                    {currentPreset.catchphrase}
                  </span>
                </div>
              </div>

              {/* Action footer inside the card */}
              <div className="pt-6 border-t border-[var(--separator)]/60 flex flex-col sm:flex-row items-center justify-between gap-4">
                <span className="text-xs text-[var(--label-secondary)] font-medium">
                  Like this aesthetic? Save it permanently to your account.
                </span>
                <button
                  onClick={onSignIn}
                  className="ios-button ios-button-tinted w-full sm:w-auto h-10 px-5 text-[13px] font-bold flex items-center justify-center gap-1 whitespace-nowrap"
                >
                  Save This Style
                  <ArrowRight size={14} weight="bold" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
