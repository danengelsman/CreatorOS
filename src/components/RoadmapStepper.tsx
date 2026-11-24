import { motion } from 'motion/react';
import { Check, CaretRight, Sparkle } from '@phosphor-icons/react';

interface RoadmapStep {
  id: string;
  title: string;
  description: string;
  phase: 'discover' | 'build' | 'monetize';
}

interface RoadmapStepperProps {
  steps: RoadmapStep[];
  currentStepId: string;
  onStepClick: (stepId: string) => void;
  className?: string;
}

const phaseColors = {
  discover: 'var(--accent)',
  build: '#8faa6e',
  monetize: '#d89b5c',
};

const phaseColorClasses: Record<string, { border: string; bg: string }> = {
  discover: { border: 'border-[var(--accent)]', bg: 'bg-[var(--accent)]' },
  build: { border: 'border-[#8faa6e]', bg: 'bg-[#8faa6e]' },
  monetize: { border: 'border-[#d89b5c]', bg: 'bg-[#d89b5c]' },
};

const phaseLabels = {
  discover: 'Discover Direction',
  build: 'Build Audience',
  monetize: 'Create Offer',
};

export function RoadmapStepper({
  steps,
  currentStepId,
  onStepClick,
  className,
}: RoadmapStepperProps) {
  const currentIndex = steps.findIndex((s) => s.id === currentStepId);

  return (
    <div className={`space-y-3 ${className || ''}`} role="list" aria-label="Creator roadmap">
      {steps.map((step, index) => {
        const isCompleted = index < currentIndex;
        const isCurrent = index === currentIndex;
        const isFuture = index > currentIndex;
        const color = phaseColors[step.phase];
        const colorClasses = phaseColorClasses[step.phase];

        return (
          <motion.button
            key={step.id}
            onClick={() => onStepClick(step.id)}
            disabled={isFuture}
            className={`
              relative group flex items-start gap-4 p-4 card-glass 
              transition-all duration-300
              ${isCurrent ? 'accent-edge ring-1 ring-[var(--accent)]/30' : ''}
              ${isCompleted ? 'opacity-80' : ''}
              ${isFuture ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer hover:ring-1 hover:ring-white/10'}
              focus-ring
            `}
            role="listitem"
            aria-current={isCurrent ? 'step' : undefined}
            aria-disabled={isFuture}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.08 }}
            whileTap={{ scale: 0.98 }}
          >
            {/* Connection line */}
            <div className="relative flex-shrink-0 w-1 h-full">
              {index < steps.length - 1 && (
                <motion.div
                  className="absolute top-8 left-1/2 -translate-x-1/2 w-0.5 h-full"
                  style={{
                    background: isCompleted
                      ? `linear-gradient(180deg, ${color} 0%, ${color} 100%)`
                      : 'var(--separator)',
                  }}
                  initial={{ scaleY: 0 }}
                  animate={{ scaleY: 1 }}
                  transition={{ delay: index * 0.08 + 0.2, type: 'spring', stiffness: 200 }}
                />
              )}

              {/* Step indicator */}
              <motion.div
                className={`
                  relative z-10 flex h-10 w-10 items-center justify-center rounded-full
                  border-2 transition-all duration-300
                  ${
                    isCompleted
                      ? `${colorClasses.bg} ${colorClasses.border}`
                      : isCurrent
                        ? `${colorClasses.border} bg-[var(--surface-2)]`
                        : 'border-[var(--separator)] bg-[var(--surface-2)]'
                  }
                `}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{
                  delay: index * 0.08 + 0.1,
                  type: 'spring',
                  stiffness: 300,
                  damping: 20,
                }}
              >
                {isCompleted ? (
                  <Check className="h-5 w-5 text-[var(--surface-1)]" weight="bold" />
                ) : isCurrent ? (
                  <motion.div
                    className={`h-4 w-4 rounded-full`}
                    style={{ background: color }}
                    initial={{ scale: 0 }}
                    animate={{ scale: [0, 1.2, 1] }}
                    transition={{ delay: 0.3, duration: 0.8, repeat: Infinity }}
                  />
                ) : (
                  <span className="text-micro text-[var(--label-tertiary)] font-bold">
                    {index + 1}
                  </span>
                )}
              </motion.div>
            </div>

            {/* Step content */}
            <div className="flex-1 min-w-0 pt-1">
              <div className="flex items-center gap-2 mb-1">
                <motion.span
                  className={`text-micro px-2 py-0.5 rounded-full font-medium`}
                  style={{
                    background: `color-mix(in srgb, ${color} 15%, transparent)`,
                    color: color,
                  }}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.08 + 0.15 }}
                >
                  {phaseLabels[step.phase]}
                </motion.span>

                {isCurrent && (
                  <motion.div
                    className="flex items-center gap-1 text-micro font-medium"
                    style={{ color: 'var(--accent)' }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0, 1, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    <Sparkle className="h-3 w-3" weight="bold" />
                    Current Focus
                  </motion.div>
                )}
              </div>

              <h3
                className={`
                text-title font-semibold truncate transition-colors
                ${isFuture ? 'text-[var(--label-tertiary)]' : 'text-[var(--label-primary)]'}
              `}
              >
                {step.title}
              </h3>

              <p
                className={`
                text-caption mt-1 line-clamp-2 transition-colors
                ${isFuture ? 'text-[var(--label-tertiary)]' : 'text-[var(--label-secondary)]'}
              `}
              >
                {step.description}
              </p>
            </div>

            {/* Chevron / action */}
            <div className="flex-shrink-0 flex items-center pt-1">
              {isCompleted ? (
                <Check className="h-6 w-6" weight="bold" style={{ color }} />
              ) : !isFuture ? (
                <CaretRight
                  className="h-5 w-5 text-[var(--label-tertiary)] transition-transform group-hover:translate-x-1"
                  weight="bold"
                />
              ) : (
                <div className="h-5 w-5" />
              )}
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}
