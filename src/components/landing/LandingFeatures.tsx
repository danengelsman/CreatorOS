import React from 'react';
import { motion } from 'motion/react';
import {
  Palette,
  Sparkle,
  Clock,
  Globe,
  TrendingUp,
  ChatCircleText,
  CaretRight as ChevronRight,
} from '@phosphor-icons/react';

interface LandingFeaturesProps {
  onSignIn: () => void;
  navigate?: (path: string) => void;
}

export default function LandingFeatures({ onSignIn, navigate }: LandingFeaturesProps) {
  return (
    <section id="features" className="pt-[140px] pb-[100px] px-6 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[var(--accent)] rounded-full filter blur-[150px] opacity-[0.08] pointer-events-none translate-x-1/3 -translate-y-1/3" />
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-[var(--accent)] rounded-full filter blur-[150px] opacity-[0.08] pointer-events-none -translate-x-1/3 translate-y-1/3" />
      <div className="max-w-7xl mx-auto relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-20 space-y-4">
          <span className="inline-block px-3 py-1 bg-[#5856D6]/10 text-[#5856D6] text-xs font-bold rounded-full uppercase tracking-widest">
            Everything You Need
          </span>
          <h2 className="font-serif text-[38px] sm:text-[54px] md:text-[64px] font-extrabold tracking-[-0.03em] leading-[1.1] text-[var(--label-primary)]">
            Built to make video creation simple.
          </h2>
          <p className="text-[16px] sm:text-[18px] text-[var(--label-secondary)] font-medium leading-relaxed">
            No more messy notes, confusing spreadsheets, or lost ideas. We bring your channel style,
            video drafts, and daily schedule into one simple, clean space.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Feature 1: Identity Architect */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="ios-card bg-[var(--bg-tertiary)] p-8 flex flex-col justify-between border border-[var(--separator)] group"
          >
            <div className="space-y-6">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Palette size={24} weight="duotone" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold tracking-tight">Design Assistant</h3>
                <p className="text-[15px] text-[var(--label-secondary)] leading-relaxed font-medium">
                  Our design assistant guides you through three simple questions. Instantly get a
                  beautiful color palette, matching fonts, a unique style description, and ideas for
                  video intros.
                </p>
              </div>
            </div>
            <div
              className="pt-6 border-t border-[var(--separator)]/60 mt-6 flex items-center gap-1.5 text-xs font-bold text-[var(--accent)] cursor-pointer hover:underline"
              onClick={onSignIn}
            >
              Learn how it works <ChevronRight size={12} weight="bold" />
            </div>
          </motion.div>

          {/* Feature 2: Studio Workflow & Script Scoring */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="ios-card bg-[var(--bg-tertiary)] p-8 flex flex-col justify-between border border-[var(--separator)] group"
          >
            <div className="space-y-6">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Sparkle size={24} weight="duotone" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold tracking-tight">Video Writer & Intro Builder</h3>
                <p className="text-[15px] text-[var(--label-secondary)] leading-relaxed font-medium">
                  Draft your videos in a clean, distraction-free space. Get helpful writing
                  checklists, video length estimators, and feedback to ensure your intros are highly
                  engaging.
                </p>
              </div>
            </div>
            <div
              className="pt-6 border-t border-[var(--separator)]/60 mt-6 flex items-center gap-1.5 text-xs font-bold text-[var(--accent)] cursor-pointer hover:underline"
              onClick={onSignIn}
            >
              View writing features <ChevronRight size={12} weight="bold" />
            </div>
          </motion.div>

          {/* Feature 3: Habit Tracking & 30-Day challenge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="ios-card bg-[var(--bg-tertiary)] p-8 flex flex-col justify-between border border-[var(--separator)] group"
          >
            <div className="space-y-6">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Clock size={24} weight="duotone" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold tracking-tight">30-Day Writing Habit</h3>
                <p className="text-[15px] text-[var(--label-secondary)] leading-relaxed font-medium">
                  Never run out of ideas with our friendly 30-day plan. Form consistent writing
                  habits, track your daily progress, and stay motivated as you build your library of
                  video drafts.
                </p>
              </div>
            </div>
            <div
              className="pt-6 border-t border-[var(--separator)]/60 mt-6 flex items-center gap-1.5 text-xs font-bold text-[var(--accent)] cursor-pointer hover:underline"
              onClick={() => navigate?.('/roadmap')}
            >
              Explore the challenge <ChevronRight size={12} weight="bold" />
            </div>
          </motion.div>

          {/* Feature 4: Centralized Creator Hub */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="ios-card bg-[var(--bg-tertiary)] p-8 flex flex-col justify-between border border-[var(--separator)] group"
          >
            <div className="space-y-6">
              <div className="w-12 h-12 rounded-2xl bg-sky-500/10 text-sky-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Globe size={24} weight="duotone" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold tracking-tight">Video Publishing Calendar</h3>
                <p className="text-[15px] text-[var(--label-secondary)] leading-relaxed font-medium">
                  Ready to share? Plan and organize your publishing schedule across YouTube, TikTok,
                  and Instagram, and keep track of all your upcoming posts in one simple calendar.
                </p>
              </div>
            </div>
            <div
              className="pt-6 border-t border-[var(--separator)]/60 mt-6 flex items-center gap-1.5 text-xs font-bold text-[var(--accent)] cursor-pointer hover:underline"
              onClick={onSignIn}
            >
              Learn about calendars <ChevronRight size={12} weight="bold" />
            </div>
          </motion.div>

          {/* Feature 5: Real-time Analytics Intelligence */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="ios-card bg-[var(--bg-tertiary)] p-8 flex flex-col justify-between border border-[var(--separator)] group"
          >
            <div className="space-y-6">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                <TrendingUp size={24} weight="duotone" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold tracking-tight">Simple Progress Charts</h3>
                <p className="text-[15px] text-[var(--label-secondary)] leading-relaxed font-medium">
                  See your progress over time with easy-to-read charts. Track how many videos you've
                  written, check your average writing quality scores, and stay motivated with clear
                  visual targets.
                </p>
              </div>
            </div>
            <div
              className="pt-6 border-t border-[var(--separator)]/60 mt-6 flex items-center gap-1.5 text-xs font-bold text-[var(--accent)] cursor-pointer hover:underline"
              onClick={onSignIn}
            >
              View progress features <ChevronRight size={12} weight="bold" />
            </div>
          </motion.div>

          {/* Feature 6: Interactive Prompt Architect */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="ios-card bg-[var(--bg-tertiary)] p-8 flex flex-col justify-between border border-[var(--separator)] group"
          >
            <div className="space-y-6">
              <div className="w-12 h-12 rounded-2xl bg-[#5856D6]/10 text-[#5856D6] flex items-center justify-center group-hover:scale-110 transition-transform">
                <ChatCircleText size={24} weight="duotone" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold tracking-tight">AI Writing Settings</h3>
                <p className="text-[15px] text-[var(--label-secondary)] leading-relaxed font-medium">
                  Customize how the AI assistant helps you write. Easily set your preferred video
                  length, vocabulary style, and tone of voice with simple, friendly switches.
                </p>
              </div>
            </div>
            <div
              className="pt-6 border-t border-[var(--separator)]/60 mt-6 flex items-center gap-1.5 text-xs font-bold text-[var(--accent)] cursor-pointer hover:underline"
              onClick={onSignIn}
            >
              Try writing settings <ChevronRight size={12} weight="bold" />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
