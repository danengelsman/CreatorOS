import React from 'react';
import { motion } from 'motion/react';
import { ArrowRight } from '@phosphor-icons/react';

interface LandingHeroProps {
  headlineVariant: 'A' | 'B';
  onSignIn: () => void;
}

export default function LandingHero({ headlineVariant, onSignIn }: LandingHeroProps) {
  return (
    <section className="relative pt-[160px] pb-[100px] px-6 overflow-hidden">
      {/* Abstract Glowing ambient orbs */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[var(--accent)] rounded-full filter blur-[150px] opacity-[0.08] pointer-events-none" />
      <div className="absolute top-10 right-10 w-[300px] h-[300px] bg-[#5856D6] rounded-full filter blur-[120px] opacity-[0.06] pointer-events-none" />

      <div className="max-w-5xl mx-auto text-center space-y-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 px-3 py-1 bg-[var(--bg-secondary)] border border-[var(--separator)] rounded-full text-[12px] font-bold text-[var(--label-secondary)] uppercase tracking-wider shadow-sm"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--accent)] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--accent)]"></span>
          </span>
          Early Access · Under Active Development
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="font-serif text-[48px] sm:text-[76px] md:text-[104px] font-extrabold tracking-[-0.03em] text-[var(--label-primary)] leading-[1.05] text-balance"
        >
          {headlineVariant === 'A' ? (
            <>
              Plan, write, and <br className="hidden sm:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-rose-400 to-amber-400 animate-gradient-x">
                grow your channel
              </span>
              .
            </>
          ) : (
            <>
              The AI studio for <br className="hidden sm:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-rose-400 to-amber-400 animate-gradient-x">
                your next video
              </span>
              .
            </>
          )}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-[18px] sm:text-[21px] text-[var(--label-secondary)] font-medium max-w-3xl mx-auto leading-relaxed text-balance"
        >
          An easy-to-use writing and planning assistant. Create a beautiful visual style, write
          videos that keep viewers interested, and build consistent habits with daily challenges.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4"
        >
          <button
            onClick={onSignIn}
            className="ios-button ios-button-filled w-full sm:w-auto h-14 px-10 text-[16px] font-semibold shadow-lg shadow-[var(--accent)]/10 hover:shadow-[var(--accent)]/20 transition-all"
          >
            Start Free — Early Access
            <ArrowRight size={18} weight="bold" className="ml-1" />
          </button>
          <a
            href="#sandbox"
            className="ios-button ios-button-gray w-full sm:w-auto h-14 px-10 text-[16px] font-semibold"
          >
            Try Live Planner
          </a>
        </motion.div>

        {/* Honest product facts (F3.6): checkable product facts */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="pt-16 grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto border-t border-[var(--separator)]/60 mt-16"
        >
          <div className="text-center">
            <span className="block text-4xl sm:text-5xl font-extrabold tracking-[-0.05em] font-serif text-[var(--accent)]">
              8
            </span>
            <span className="text-[10px] sm:text-[11px] uppercase font-bold tracking-widest text-[var(--label-secondary)] mt-1 block">
              AI-Powered Tools
            </span>
          </div>
          <div className="text-center">
            <span className="block text-4xl sm:text-5xl font-extrabold tracking-[-0.05em] font-serif text-[var(--accent)]">
              30 Days
            </span>
            <span className="text-[10px] sm:text-[11px] uppercase font-bold tracking-widest text-[var(--label-secondary)] mt-1 block">
              Guided Challenge
            </span>
          </div>
          <div className="text-center">
            <span className="block text-4xl sm:text-5xl font-extrabold tracking-[-0.05em] font-serif text-[var(--accent)]">
              $0
            </span>
            <span className="text-[10px] sm:text-[11px] uppercase font-bold tracking-widest text-[var(--label-secondary)] mt-1 block">
              During Early Access
            </span>
          </div>
          <div className="text-center">
            <span className="block text-4xl sm:text-5xl font-extrabold tracking-[-0.05em] font-serif text-[var(--accent)]">
              100%
            </span>
            <span className="text-[10px] sm:text-[11px] uppercase font-bold tracking-widest text-[var(--label-secondary)] mt-1 block">
              Your Content, Your Data
            </span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
