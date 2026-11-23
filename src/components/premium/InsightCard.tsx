import { motion } from 'motion/react';
import { ArrowRight, Sparkle, TrendUp, Lightbulb, Target } from '@phosphor-icons/react';

interface InsightCardProps {
  title: string;
  description: string;
  insightType: 'growth' | 'action' | 'observation' | 'milestone';
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

const typeConfig = {
  growth: { icon: TrendUp, color: '#8faa6e', label: 'Growth Insight' },
  action: { icon: Target, color: 'var(--accent)', label: 'Suggested Action' },
  observation: { icon: Lightbulb, color: '#d89b5c', label: 'Observation' },
  milestone: { icon: Sparkle, color: '#8b5cf6', label: 'Milestone' },
};

export function InsightCard({ 
  title, 
  description, 
  insightType, 
  actionLabel, 
  onAction, 
  className 
}: InsightCardProps) {
  const { icon: Icon, color, label } = typeConfig[insightType];

  return (
    <motion.div
      className={`card-glass p-4 ${className || ''}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 100, damping: 15 }}
      whileHover={{ y: -2, transition: { duration: 0.2 }}}
      role="region"
      aria-label={`${label}: ${title}`}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ background: `color-mix(in srgb, ${color} 15%, transparent)`, color }} aria-hidden="true">
          <Icon size={18} weight="bold" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-micro font-semibold uppercase tracking-wider" style={{ color }}>
              {label}
            </span>
          </div>
          <h4 className="text-title font-semibold text-[var(--label-primary)] mb-1">
            {title}
          </h4>
          <p className="text-caption text-[var(--label-secondary)] leading-relaxed">
            {description}
          </p>
          {actionLabel && onAction && (
            <motion.button
              type="button"
              onClick={onAction}
              className="mt-3 inline-flex items-center gap-1.5 text-micro font-semibold text-[var(--accent)] hover:text-white transition-colors focus-ring"
              whileTap={{ scale: 0.97 }}
            >
              {actionLabel}
              <ArrowRight size={12} weight="bold" aria-hidden="true" />
            </motion.button>
          )}
        </div>
      </div>
    </motion.div>
  );
}