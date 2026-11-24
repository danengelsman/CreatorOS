import { motion } from 'motion/react';
import { Plus, Pen, ArrowUpRight, Sparkle, Check } from '@phosphor-icons/react';

interface WorkflowStage {
  id: 'ideas' | 'drafts' | 'published';
  label: string;
  icon: React.ReactNode;
  count: number;
  color: string;
  description: string;
}

interface ContentStudioWorkflowProps {
  stages: WorkflowStage[];
  activeStage: string;
  onStageChange: (stageId: string) => void;
  onCreateContent: () => void;
  className?: string;
  /**
   * Compact rendering for the narrow (280px) side panel: smaller stage
   * circles, no per-stage description line. The full pipeline (80px
   * circles + 96px labels) is 280px+ wide and overflows the panel,
   * clipping the Published circle and truncating every label.
   */
  compact?: boolean;
}

const stageConfig: Record<string, WorkflowStage> = {
  ideas: {
    id: 'ideas',
    label: 'Ideas',
    icon: <Sparkle className="h-5 w-5" weight="bold" />,
    count: 0,
    color: 'var(--accent)',
    description: 'Capture & refine concepts',
  },
  drafts: {
    id: 'drafts',
    label: 'Drafts',
    icon: <Pen className="h-5 w-5" weight="bold" />,
    count: 0,
    color: '#8faa6e',
    description: 'Write & polish content',
  },
  published: {
    id: 'published',
    label: 'Published',
    icon: <ArrowUpRight className="h-5 w-5" weight="bold" />,
    count: 0,
    color: '#d89b5c',
    description: 'Live & performing',
  },
};

const stageColorClasses: Record<string, { border: string; bg: string; text: string }> = {
  ideas: {
    border: 'border-[var(--accent)]',
    bg: 'bg-[var(--accent)]',
    text: 'text-[var(--accent)]',
  },
  drafts: { border: 'border-[#8faa6e]', bg: 'bg-[#8faa6e]', text: 'text-[#8faa6e]' },
  published: { border: 'border-[#d89b5c]', bg: 'bg-[#d89b5c]', text: 'text-[#d89b5c]' },
};

export function ContentStudioWorkflow({
  stages,
  activeStage,
  onStageChange,
  onCreateContent,
  className,
  compact = false,
}: ContentStudioWorkflowProps) {
  const stageOrder = ['ideas', 'drafts', 'published'];

  return (
    <div className={`space-y-4 ${className || ''}`}>
      {/* Visual workflow pipeline */}
      <div className="relative">
        {/* Connecting pipeline */}
        <div
          className={`absolute ${compact ? 'top-7 left-14 right-14' : 'top-10 left-20 right-20'} h-1 bg-[var(--separator)]`}
          aria-hidden="true"
        >
          <motion.div
            className="absolute top-0 left-0 h-full rounded-full"
            style={{ background: 'linear-gradient(90deg, var(--accent), #8faa6e, #d89b5c)' }}
            initial={{ width: 0 }}
            animate={{ width: `${(stageOrder.indexOf(activeStage) / 2) * 100}%` }}
            transition={{ type: 'spring', stiffness: 100, damping: 15, delay: 0.2 }}
          />
        </div>

        {/* Stage nodes */}
        <div className={`relative flex items-center justify-between ${compact ? 'px-2' : 'px-5'}`}>
          {stageOrder.map((stageId, index) => {
            const stage = stageConfig[stageId];
            const isActive = stageId === activeStage;
            const isCompleted = stageOrder.indexOf(activeStage) > index;
            const showCount = stages.find((s) => s.id === stageId)?.count || 0;

            return (
              <motion.button
                key={stageId}
                onClick={() => onStageChange(stageId)}
                className={`
                  relative flex flex-col items-center gap-2
                  ${isActive ? 'scale-105 z-10' : ''}
                  ${isCompleted ? 'opacity-80' : ''}
                  focus-ring
                `}
                aria-current={isActive ? 'step' : undefined}
                aria-label={`${stage.label} stage${showCount > 0 ? `, ${showCount} items` : ''}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                whileTap={{ scale: 0.95 }}
              >
                {/* Stage circle */}
                <motion.div
                  className={`
                    relative flex ${compact ? 'h-14 w-14' : 'h-20 w-20'} items-center justify-center rounded-2xl
                    border-2 transition-all duration-300
                    ${
                      isActive
                        ? `${stageColorClasses[stageId].border} bg-[var(--surface-2)] accent-glow`
                        : isCompleted
                          ? `${stageColorClasses[stageId].border} ${stageColorClasses[stageId].bg}`
                          : 'border-[var(--separator)] bg-[var(--surface-2)]'
                    }
                  `}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{
                    delay: index * 0.1 + 0.1,
                    type: 'spring',
                    stiffness: 300,
                    damping: 20,
                  }}
                >
                  <motion.span
                    className="text-[var(--surface-1)]"
                    initial={{ scale: 0, rotate: -90 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{
                      delay: index * 0.1 + 0.2,
                      type: 'spring',
                      stiffness: 300,
                      damping: 20,
                    }}
                  >
                    {isCompleted ? <Check className="h-8 w-8" weight="bold" /> : stage.icon}
                  </motion.span>

                  {/* Count badge */}
                  {showCount > 0 && (
                    <motion.span
                      className="absolute -top-2 -right-2 flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-xs font-bold"
                      style={{ background: stage.color, color: 'var(--surface-1)' }}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{
                        delay: index * 0.1 + 0.3,
                        type: 'spring',
                        stiffness: 300,
                        damping: 20,
                      }}
                    >
                      {showCount > 9 ? '9+' : showCount}
                    </motion.span>
                  )}

                  {/* Active pulse */}
                  {isActive && (
                    <motion.div
                      className="absolute inset-0 rounded-2xl"
                      style={{
                        border: `2px solid ${stage.color}`,
                        boxShadow: `0 0 20px ${stage.color}40`,
                      }}
                      animate={{ scale: [1, 1.15, 1], opacity: [0.6, 0.2, 0.6] }}
                      transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                    />
                  )}
                </motion.div>

                {/* Stage label */}
                <div className={`text-center ${compact ? 'w-16' : 'w-28'}`}>
                  <motion.h4
                    className={`
                      text-caption font-semibold truncate transition-colors
                      ${isActive || isCompleted ? 'text-[var(--label-primary)]' : 'text-[var(--label-tertiary)]'}
                    `}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 + 0.15 }}
                  >
                    {stage.label}
                  </motion.h4>
                  {/* Descriptions wrap to two lines instead of truncating
                      mid-word ("CAPTURE & RE…"). Compact panels omit them
                      entirely — the active-stage card below already shows
                      the stage's description. */}
                  {!compact && (
                    <motion.p
                      className={`
                      text-micro line-clamp-2 leading-tight transition-colors mt-0.5
                      ${isActive ? `${stageColorClasses[stageId].text}` : 'text-[var(--label-tertiary)]'}
                    `}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.1 + 0.2 }}
                    >
                      {stage.description}
                    </motion.p>
                  )}
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Active stage content area */}
      <motion.div
        className="card-glass p-4 min-h-[200px]"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-title font-semibold">{stageConfig[activeStage].label}</h3>
            <p className="text-caption text-[var(--label-secondary)] mt-0.5">
              {stageConfig[activeStage].description}
            </p>
          </div>

          {activeStage === 'ideas' && (
            <motion.button
              onClick={onCreateContent}
              className="ios-button ios-button-filled gap-2"
              whileTap={{ scale: 0.98 }}
            >
              <Plus className="h-4 w-4" weight="bold" />
              New Idea
            </motion.button>
          )}
        </div>

        {/* Stage-specific content placeholder */}
        <div className="space-y-3">
          {activeStage === 'ideas' && (
            <>
              <div className="ios-card p-4 text-center border-dashed border-2 border-[var(--accent)]/30">
                <Sparkle
                  className="h-10 w-10 mx-auto mb-3"
                  weight="bold"
                  style={{ color: 'var(--accent)' }}
                />
                <p className="text-body text-[var(--label-secondary)]">
                  Start your content journey by capturing ideas
                </p>
                <p className="text-caption text-[var(--label-tertiary)] mt-1">
                  Tap "New Idea" to begin
                </p>
              </div>
            </>
          )}

          {activeStage === 'drafts' && (
            <div className="ios-card p-4 text-center border-dashed border-2 border-[#8faa6e]/30">
              <Pen className="h-10 w-10 mx-auto mb-3" weight="bold" style={{ color: '#8faa6e' }} />
              <p className="text-body text-[var(--label-secondary)]">
                Your drafts will appear here
              </p>
              <p className="text-caption text-[var(--label-tertiary)] mt-1">
                Move ideas forward to start writing
              </p>
            </div>
          )}

          {activeStage === 'published' && (
            <div className="ios-card p-4 text-center border-dashed border-2 border-[#d89b5c]/30">
              <ArrowUpRight
                className="h-10 w-10 mx-auto mb-3"
                weight="bold"
                style={{ color: '#d89b5c' }}
              />
              <p className="text-body text-[var(--label-secondary)]">
                Published content will appear here
              </p>
              <p className="text-caption text-[var(--label-tertiary)] mt-1">
                Complete drafts to publish
              </p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
