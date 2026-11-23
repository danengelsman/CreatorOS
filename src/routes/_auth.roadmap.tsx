import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspaceStore, selectBrand, selectProjects } from '@/store/workspaceStore';
import LayoutShell from '@/components/LayoutShell';
import { RoadmapStepper } from '@/components/RoadmapStepper';
import { motion } from 'motion/react';
import { ArrowRight, Sparkle, PenNib, ArrowUpRight, Check } from '@phosphor-icons/react';

export const Route = createFileRoute('/_auth/roadmap')({
  component: () => {
    const auth = useAuth();
    const navigate = useNavigate();
    const state = useWorkspaceStore();
    const token = auth.workspaceToken?.uid === auth.user?.uid ? auth.workspaceToken : null;
    const brand = selectBrand(state, token);
    const projects = selectProjects(state, token);

    // Journey steps for roadmap (aligned with firstDollarJourney)
    const journeySteps = [
      { id: 'direction', title: 'Choose a direction you can start with', description: 'Write down one skill, experience, or interest you could share with someone else.', phase: 'discover' as const },
      { id: 'person', title: 'Name one person you can help', description: 'Describe a specific person and one problem they have related to your direction.', phase: 'discover' as const },
      { id: 'small_offer', title: 'Sketch a small way to help', description: 'Describe one small, concrete thing you could make or do for that person.', phase: 'build' as const },
      { id: 'brand', title: 'Build brand system', description: 'Visual identity, voice, and positioning for your channel.', phase: 'build' as const },
      { id: 'first_content', title: 'Create first content', description: 'Script, record, and publish your first piece.', phase: 'build' as const },
      { id: 'audience', title: 'Grow audience', description: 'Consistent publishing and engagement to build a following.', phase: 'monetize' as const },
      { id: 'offer', title: 'Design your offer', description: 'Productize your expertise into a paid offer.', phase: 'monetize' as const },
      { id: 'launch', title: 'Launch & iterate', description: 'First dollar to sustainable revenue.', phase: 'monetize' as const },
    ];

    // Determine current step from journey (if available) or default
    const hasBrand = !!brand;
    const hasDrafts = projects.some(p => p.type === 'content' && p.status === 'draft');

    let currentStepId = 'direction';
    if (hasDrafts) currentStepId = 'first_content';
    else if (hasBrand) currentStepId = 'brand';

    const contentProjects = projects.filter(p => p.type === 'content');
    const studioStages = [
      { id: 'ideas', label: 'Ideas', count: 0, icon: <Sparkle className="h-5 w-5" weight="bold" />, color: 'var(--accent)', description: 'Capture & refine concepts' },
      { id: 'drafts', label: 'Drafts', count: contentProjects.filter(p => p.status === 'draft').length, icon: <PenNib className="h-5 w-5" weight="bold" />, color: '#8faa6e', description: 'Write & polish content' },
      { id: 'published', label: 'Published', count: contentProjects.filter(p => p.status === 'published').length, icon: <ArrowUpRight className="h-5 w-5" weight="bold" />, color: '#d89b5c', description: 'Live & performing' },
    ];

    const handleStepClick = (stepId: string) => {
      if (stepId === 'brand') navigate({ to: '/brand' as any });
      else if (stepId === 'first_content') navigate({ to: '/create' as any });
      else if (stepId === 'offer') navigate({ to: '/create' as any });
      else navigate({ to: '/roadmap' as any });
    };

    return (
      <LayoutShell user={auth.user}>
        <div className="max-w-4xl mx-auto px-4 py-6 lg:px-8 space-y-8">
          {/* Header */}
          <motion.header
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4"
          >
            <div>
              <p className="text-micro font-semibold uppercase tracking-wider text-[var(--accent)]">
                Your Creator Roadmap
              </p>
              <h1 className="mt-2 text-display">
                First Post to First Dollar
              </h1>
              <p className="mt-2 text-body text-[var(--label-secondary)] max-w-2xl">
                A clear progression from identifying your focus to creating content and developing a monetization offer.
              </p>
            </div>
            <Link
              to="/dashboard"
              className="ios-button ios-button-tinted gap-2 shrink-0"
            >
              <ArrowRight size={16} weight="bold" />
              Back to Today
            </Link>
          </motion.header>

          {/* Progress Overview Card */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="card-hero p-6"
          >
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-2 text-micro font-semibold text-[var(--accent)] mb-2">
                  <Sparkle className="h-4 w-4" weight="bold" />
                  Journey Progress
                </div>
                <p className="text-headline">Step toward your first dollar</p>
                <p className="mt-1 text-caption text-[var(--label-secondary)]">
                  Each step builds on the last. Complete them in order to build a sustainable creator business.
                </p>
              </div>
              <div className="flex items-center gap-4 shrink-0">
                <div className="relative w-20 h-20 flex-shrink-0">
                  <svg className="w-full h-full -rotate-90">
                    <circle
                      cx="50%"
                      cy="50%"
                      r="38%"
                      fill="none"
                      stroke="rgba(255,255,255,0.08)"
                      strokeWidth="6"
                    />
                    <motion.circle
                      cx="50%"
                      cy="50%"
                      r="38%"
                      fill="none"
                      stroke="var(--accent)"
                      strokeWidth="6"
                      strokeDasharray="239%"
                      initial={{ strokeDashoffset: '239%' }}
                      animate={{ strokeDashoffset: `${239 - (239 * journeySteps.findIndex(s => s.id === currentStepId)) / journeySteps.length}%` }}
                      strokeLinecap="round"
                      transition={{ duration: 1, delay: 0.3, type: 'spring', stiffness: 100 }}
                    />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center font-mono text-xl font-bold text-[var(--label-primary)]">
                    {journeySteps.findIndex(s => s.id === currentStepId) + 1} / {journeySteps.length}
                  </span>
                </div>
              </div>
            </div>
          </motion.section>

          {/* Phase Sections */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-8"
          >
            {(['discover', 'build', 'monetize'] as const).map((phase) => {
              const phaseSteps = journeySteps.filter(s => s.phase === phase);
              const phaseLabels = {
                discover: 'Discover Direction',
                build: 'Build Audience',
                monetize: 'Create Offer',
              };
              const phaseColors = {
                discover: 'var(--accent)',
                build: '#8faa6e',
                monetize: '#d89b5c',
              };
              const phaseIcons = {
                discover: <Sparkle className="h-5 w-5" weight="bold" />,
                build: <PenNib className="h-5 w-5" weight="bold" />,
                monetize: <ArrowUpRight className="h-5 w-5" weight="bold" />,
              };

              return (
                <section key={phase} className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: `color-mix(in srgb, ${phaseColors[phase]} 15%, transparent)`, color: phaseColors[phase] }}>
                      {phaseIcons[phase]}
                    </div>
                    <div>
                      <h2 className="text-title font-semibold text-[var(--label-primary)]">{phaseLabels[phase]}</h2>
                      <p className="text-caption text-[var(--label-secondary)]">
                        {phase === 'discover' && 'Clarify your niche and build your foundation'}
                        {phase === 'build' && 'Create consistently and grow your audience'}
                        {phase === 'monetize' && 'Turn attention into sustainable revenue'}
                      </p>
                    </div>
                  </div>

                  <RoadmapStepper
                    steps={phaseSteps}
                    currentStepId={currentStepId}
                    onStepClick={handleStepClick}
                  />
                </section>
              );
            })}
          </motion.div>

          {/* Content Studio Quick Access */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="card-glass p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-headline">Content Studio</h2>
              <Link to="/create" className="ios-button ios-button-filled gap-2">
                Open Studio <ArrowRight size={16} weight="bold" />
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {studioStages.map((stage, idx) => (
                <motion.div
                  key={stage.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 + idx * 0.1 }}
                  className="card-base p-4 relative"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: `color-mix(in srgb, ${stage.color} 15%, transparent)`, color: stage.color }}>
                      {stage.icon}
                    </div>
                    <div>
                      <h3 className="text-title font-semibold text-[var(--label-primary)]">{stage.label}</h3>
                      <p className="text-micro text-[var(--label-tertiary)]">{stage.description}</p>
                    </div>
                  </div>
                  {stage.count > 0 && (
                    <div className="absolute top-4 right-4 flex h-6 min-w-6 items-center justify-center rounded-full px-2 text-xs font-bold" style={{ background: stage.color, color: 'var(--surface-1)' }}>
                      {stage.count > 9 ? '9+' : stage.count}
                    </div>
                  )}
                  <p className="text-caption text-[var(--label-secondary)] mt-4">
                    {stage.count} {stage.label.toLowerCase()}{stage.count !== 1 ? 's' : ''}
                  </p>
                </motion.div>
              ))}
            </div>
          </motion.section>

          {/* Journey Context */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="card-base p-5 border-l-4 border-[var(--accent)]"
          >
            <p className="text-micro font-semibold uppercase tracking-wider text-[var(--accent)] mb-2">
              How this works
            </p>
            <ul className="space-y-2 text-caption text-[var(--label-secondary)]">
              <li className="flex items-start gap-2"><Check className="h-4 w-4 shrink-0 mt-0.5" weight="bold" style={{ color: 'var(--accent)' }} /> Complete each step in order — they build on each other</li>
              <li className="flex items-start gap-2"><Check className="h-4 w-4 shrink-0 mt-0.5" weight="bold" style={{ color: 'var(--accent)' }} /> Your answers are saved automatically in Today's view</li>
              <li className="flex items-start gap-2"><Check className="h-4 w-4 shrink-0 mt-0.5" weight="bold" style={{ color: 'var(--accent)' }} /> The roadmap updates as you progress through your First Dollar journey</li>
              <li className="flex items-start gap-2"><Check className="h-4 w-4 shrink-0 mt-0.5" weight="bold" style={{ color: 'var(--accent)' }} /> Content Studio, Brand Kit, and AI Mentor support each phase</li>
            </ul>
          </motion.section>
        </div>
      </LayoutShell>
    );
  },
});