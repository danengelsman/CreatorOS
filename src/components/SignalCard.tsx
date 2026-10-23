import React from 'react';
import { motion } from 'motion/react';
import { ArrowRight, Lightning } from '@phosphor-icons/react';
import { Link } from '@tanstack/react-router';
import { Signal } from '@/services/telemetry';

export default function SignalCard({ signal }: { signal: Signal }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden p-6 rounded-3xl border border-[var(--accent)] bg-gradient-to-br from-[var(--accent)]/10 to-transparent material-thick shadow-lg shadow-[var(--accent)]/5"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2 text-[var(--accent)]">
          <Lightning size={20} weight="fill" />
          <span className="text-[12px] font-bold uppercase tracking-wider">One Lever</span>
        </div>
        <div className="px-2 py-1 rounded-full bg-[var(--accent)] text-white text-[10px] font-bold">
          {signal.impact}
        </div>
      </div>

      <h3 className="text-2xl font-bold mb-2 tracking-tight">{signal.title}</h3>
      <p className="text-[var(--label-secondary)] mb-6 leading-relaxed">{signal.description}</p>

      <Link
        to={signal.action.path}
        className="ios-button ios-button-tinted w-full flex items-center justify-center gap-2 py-3"
      >
        Act on Signal <ArrowRight size={18} />
      </Link>

      {/* Decorative background element */}
      <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-[var(--accent)]/10 blur-3xl rounded-full" />
    </motion.div>
  );
}
