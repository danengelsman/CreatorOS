import { motion } from 'motion/react';
import { Sparkle, ChatCircle, ArrowRight } from '@phosphor-icons/react';

interface AIMentorEntryProps {
  _currentStep?: string;
  onPromptClick: (prompt: string) => void;
  className?: string;
}

const suggestedPrompts = [
  { label: 'What should I work on next?', category: 'direction' },
  { label: 'Who is my ideal audience?', category: 'audience' },
  { label: 'How do I structure my first offer?', category: 'offer' },
  { label: 'What content format fits me?', category: 'format' },
];

export function AIMentorEntry({ _currentStep, onPromptClick, className }: AIMentorEntryProps) {
  return (
    <motion.div
      className={`card-hero p-5 relative overflow-hidden ${className || ''}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25 }}
      role="region"
      aria-label="AI Mentor"
    >
      <div
        className="pointer-events-none absolute right-0 top-0 h-32 w-32 bg-[var(--accent-soft)] rounded-full blur-2xl"
        aria-hidden="true"
      />

      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent)]"
            aria-hidden="true"
          >
            <Sparkle size={16} weight="fill" />
          </div>
          <span className="text-micro font-semibold uppercase tracking-wider text-[var(--accent)]">
            AI Mentor
          </span>
        </div>
        <span
          className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[var(--system-green)]/10 text-[var(--system-green)] border border-[var(--system-green)]/20"
          aria-label="Online"
        >
          Online
        </span>
      </div>

      <p className="text-caption font-medium text-[var(--label-secondary)] mb-4">
        Instant strategic guidance tailored to your First Dollar stage.
      </p>

      {/* Suggested prompt chips */}
      <div className="flex flex-wrap gap-2 mb-4" role="list" aria-label="Suggested prompts">
        {suggestedPrompts.map((prompt) => (
          <motion.button
            key={prompt.label}
            type="button"
            onClick={() => onPromptClick(prompt.label)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/10 bg-white/5 hover:bg-[var(--accent-soft)] hover:border-[var(--accent)]/30 text-micro font-medium text-[var(--label-primary)] transition-all focus-ring"
            whileTap={{ scale: 0.97 }}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, type: 'spring', stiffness: 300, damping: 20 }}
            role="listitem"
          >
            <ChatCircle
              size={12}
              weight="bold"
              style={{ color: 'var(--accent)' }}
              aria-hidden="true"
            />
            {prompt.label}
          </motion.button>
        ))}
      </div>

      {/* Primary conversational entry */}
      <motion.button
        type="button"
        onClick={() => onPromptClick('What should I work on next?')}
        className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-white/5 hover:bg-[var(--accent-soft)] border border-white/10 hover:border-[var(--accent)]/30 text-micro font-semibold text-[var(--label-primary)] transition-all focus-ring"
        whileTap={{ scale: 0.98 }}
      >
        <span>&ldquo;What should I work on next?&rdquo;</span>
        <ArrowRight size={14} className="text-[var(--accent)]" aria-hidden="true" />
      </motion.button>
    </motion.div>
  );
}
