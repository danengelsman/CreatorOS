import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  CaretRight as ChevronRight,
  PenNib as PenTool,
  Sparkle,
  Target,
  TrendUp,
} from '@phosphor-icons/react';
import { motion } from 'motion/react';
import { authorizedFetch, db } from '../firebase';
import DailyGoalTracker from './DailyGoalTracker';
import Today from './Today';
import { doc, onSnapshot } from 'firebase/firestore';
import { CreatorJourney, recordJourneyEvent } from '../services/creatorJourney';
import { RoadmapStepper } from './RoadmapStepper';
import { ContentStudioWorkflow } from './ContentStudioWorkflow';
import { AIMentorEntry } from './premium/AIMentorEntry';
import { InsightCard } from './premium/InsightCard';

export default function Dashboard({
  brand,
  setActiveTab,
  user,
  projects = [],
  isProjectsLoading = false,
  projectsLoadError = false,
}: {
  brand: any;
  setActiveTab: (tab: string) => void;
  user: any;
  projects?: any[];
  isProjectsLoading?: boolean;
  projectsLoadError?: boolean;
}) {
  const [summary, setSummary] = useState<any>(null);
  const [journey, setJourney] = useState<CreatorJourney | null>(null);
  const [isJourneyLoading, setIsJourneyLoading] = useState(true);
  const [loadKey] = useState(0);

  useEffect(() => {
    if (!user?.uid) {
      setJourney(null);
      setIsJourneyLoading(false);
      return;
    }
    setJourney(null);
    setIsJourneyLoading(true);
    return onSnapshot(
      doc(db, 'preferences', user.uid),
      (snapshot) => {
        setJourney((snapshot.data()?.creatorJourney as CreatorJourney) || null);
        setIsJourneyLoading(false);
      },
      (error) => {
        console.warn('Could not load creator mission:', error);
        setIsJourneyLoading(false);
      },
    );
  }, [user?.uid]);

  useEffect(() => {
    let isMounted = true;

    const loadSummary = async () => {
      try {
        const res = await authorizedFetch('/api/analytics/summary');
        if (isMounted && res?.success) {
          setSummary(res.summary);
        }
      } catch (err) {
        console.warn('Analytics summary note:', err);
      }
    };

    if (user) loadSummary();

    return () => {
      isMounted = false;
    };
  }, [user, loadKey]);

  const hasSignal = (summary?.totalFollowers || 0) > 0 || (summary?.totalViews || 0) > 0 || (summary?.engagementRate || 0) > 0 || (summary?.totalRevenue || 0) > 0;

  // Workspace indicators are informational only (brand, projects, audience
  // size). Today's progress comes from the saved First Dollar journey — never
  // inferred from analytics milestones, which are not evidence of completion.
  const milestoneBrandKit = !!brand;
  const milestonePostsPublished = projects.length >= 5;
  const milestoneFollowersReached = (summary?.totalFollowers || 0) >= 100;
  const milestones = [
    { label: 'Brand system established', completed: milestoneBrandKit },
    { label: 'Publish five pieces', completed: milestonePostsPublished },
    { label: 'Reach your first 100 followers', completed: milestoneFollowersReached },
  ];
  const completedMilestones = milestones.filter((item) => item.completed).length;

  const contentProjects = projects.filter((project) => project.type === 'content');
  const firstDraft =
    contentProjects.find(
      (project) =>
        project.id === journey?.activeProjectId &&
        (project.status || 'Draft').toLowerCase() === 'draft',
    ) ||
    contentProjects.find(
      (project) =>
        project.journeyStep === 'first_content' &&
        (project.status || 'Draft').toLowerCase() === 'draft',
    );
  useEffect(() => {
    if (!user?.uid || !firstDraft || isProjectsLoading || projectsLoadError || isJourneyLoading)
      return;
    if (
      journey?.activeProjectId === firstDraft.id &&
      (!firstDraft.journeyDraftSavedAt || journey?.activeMission === 'review_first_draft')
    )
      return;
    void (async () => {
      try {
        if (journey?.activeProjectId !== firstDraft.id) {
          await recordJourneyEvent(user.uid, { type: 'start_draft', projectId: firstDraft.id });
        }
        if (firstDraft.journeyDraftSavedAt && journey?.activeMission !== 'review_first_draft') {
          await recordJourneyEvent(user.uid, { type: 'save_draft', projectId: firstDraft.id });
        }
      } catch (error) {
        console.warn('Could not reconcile mission with saved draft:', error);
      }
    })();
  }, [
    user?.uid,
    firstDraft?.id,
    firstDraft?.journeyDraftSavedAt,
    isProjectsLoading,
    projectsLoadError,
    isJourneyLoading,
    journey?.activeProjectId,
    journey?.activeMission,
  ]);

  if (isProjectsLoading || isJourneyLoading) {
    return (
      <p className="px-6 py-12 text-caption text-[var(--label-secondary)]" role="status">
        Finding where you left off...
      </p>
    );
  }
  if (projectsLoadError) {
    return (
      <p className="px-6 py-12 text-caption text-[var(--label-secondary)]" role="alert">
        We could not load your projects. Refresh the page to resume your work.
      </p>
    );
  }

  // Journey steps for roadmap
  const journeySteps = [
    { id: 'niche', title: 'Define your niche', description: 'Clarify who you help and how', phase: 'discover' as const },
    { id: 'brand', title: 'Build brand system', description: 'Visual identity and voice', phase: 'discover' as const },
    { id: 'first_content', title: 'Create first content', description: 'Script, record, publish', phase: 'build' as const },
    { id: 'audience', title: 'Grow audience', description: 'Consistent publishing & engagement', phase: 'build' as const },
    { id: 'offer', title: 'Design your offer', description: 'Productize your expertise', phase: 'monetize' as const },
    { id: 'launch', title: 'Launch & iterate', description: 'First dollar to sustainable', phase: 'monetize' as const },
  ];

  // Use firstDollarJourney for current step (not CreatorJourney)
  const currentStepId = 'niche';

  // Content Studio workflow stages
  const studioStages = [
    {
      id: 'ideas' as const,
      label: 'Ideas',
      count: 0,
      icon: <Sparkle className="h-5 w-5" weight="bold" />,
      color: 'var(--accent)',
      description: 'Capture & refine concepts',
    },
    {
      id: 'drafts' as const,
      label: 'Drafts',
      count: contentProjects.filter((p) => p.status === 'draft').length,
      icon: <PenTool className="h-5 w-5" weight="bold" />,
      color: '#8faa6e',
      description: 'Write & polish content',
    },
    {
      id: 'published' as const,
      label: 'Published',
      count: contentProjects.filter((p) => p.status === 'published').length,
      icon: <ArrowUpRight className="h-5 w-5" weight="bold" />,
      color: '#d89b5c',
      description: 'Live & performing',
    },
  ];

  // Contextual insights based on state
  const insights = useMemo(() => {
    const items: Array<{
      title: string;
      description: string;
      insightType: 'growth' | 'action' | 'observation' | 'milestone';
      actionLabel?: string;
      onAction?: () => void;
    }> = [];

    if (!milestoneBrandKit) {
      items.push({
        title: 'Define your brand system',
        description: 'Lock in positioning, visual language, and voice before you publish.',
        insightType: 'action',
        actionLabel: 'Open Brand Studio',
        onAction: () => setActiveTab('brand'),
      });
    } else if (projects.length === 0) {
      items.push({
        title: 'Create your first project',
        description: 'Turn your brand strategy into a publish-ready piece of content.',
        insightType: 'action',
        actionLabel: 'Start creating',
        onAction: () => setActiveTab('create'),
      });
    } else if (!hasSignal) {
      items.push({
        title: 'Connect a growth channel',
        description: 'Bring live audience signals into your command center.',
        insightType: 'action',
        actionLabel: 'Connect channels',
        onAction: () => setActiveTab('profile'),
      });
    } else {
      items.push({
        title: 'Build on your momentum',
        description: 'Your foundation is active. Create the next piece that compounds your reach.',
        insightType: 'growth',
        actionLabel: 'Open studio',
        onAction: () => setActiveTab('create'),
      });
    }

    // Add progress insight
    if (completedMilestones > 0) {
      items.push({
        title: `${completedMilestones} of 3 milestones complete`,
        description: 'You\'re building the system before the scale.',
        insightType: 'milestone',
      });
    }

    return items;
  }, [milestoneBrandKit, projects.length, hasSignal, completedMilestones, setActiveTab]);

  return (
    <div className="relative isolate pb-20 pt-4 lg:pt-6 custom-scrollbar">
      {/* Ambient studio lighting: warm amber and graphite */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-[-8%] top-[-120px] -z-10 h-[620px] overflow-hidden"
      >
        <div className="absolute left-[10%] top-16 h-72 w-72 rounded-full bg-[var(--accent-soft)] blur-[120px]" />
        <div className="absolute right-[8%] top-0 h-80 w-80 rounded-full bg-[var(--accent-soft)] blur-[130px]" />
      </div>

      {/* Primary: Today Hero */}
      <Today user={user} setActiveTab={setActiveTab} />

      {/* 3 Supporting Modules */}
      <section
        aria-label="Core studio modules"
        className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6 my-6"
      >
        {/* Module 1: Content Studio */}
        <motion.button
          onClick={() => setActiveTab('create')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setActiveTab('create');
            }
          }}
          className="card-glass p-5 group transition-all hover:-translate-y-1 hover:border-[var(--accent)]/40 hover:shadow-[var(--shadow-medium)] focus-ring"
          whileTap={{ scale: 0.98 }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent-soft)] border border-[var(--accent)]/20 text-[var(--accent)]">
              <PenTool size={20} weight="duotone" />
            </div>
            <ArrowRight
              size={16}
              className="text-[var(--label-tertiary)] group-hover:text-[var(--accent)] group-hover:translate-x-1 transition-all"
            />
          </div>
          <h3 className="text-title font-semibold text-[var(--label-primary)] group-hover:text-[var(--accent)] transition-colors">
            Content Studio
          </h3>
          <p className="mt-1.5 text-caption text-[var(--label-secondary)] leading-relaxed">
            Draft video scripts, retention hooks, and high-impact ideas.
          </p>
          <div className="mt-4 flex items-center gap-1.5 text-micro font-semibold text-[var(--accent)]">
            <span>Open Studio</span>
            <ChevronRight size={12} />
          </div>
        </motion.button>

        {/* Module 2: Brand Kit */}
        <motion.button
          onClick={() => setActiveTab('brand')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setActiveTab('brand');
            }
          }}
          className="card-glass p-5 group transition-all hover:-translate-y-1 hover:border-[var(--accent)]/40 hover:shadow-[var(--shadow-medium)] focus-ring"
          whileTap={{ scale: 0.98 }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent-soft)] border border-[var(--accent)]/20 text-[var(--accent)]">
              <Target size={20} weight="duotone" />
            </div>
            <ArrowRight
              size={16}
              className="text-[var(--label-tertiary)] group-hover:text-[var(--accent)] group-hover:translate-x-1 transition-all"
            />
          </div>
          <h3 className="text-title font-semibold text-[var(--label-primary)] group-hover:text-[var(--accent)] transition-colors">
            Brand Kit
          </h3>
          <p className="mt-1.5 text-caption text-[var(--label-secondary)] leading-relaxed">
            Positioning, channel archetype, and consistent visual language.
          </p>
          <div className="mt-4 flex items-center gap-1.5 text-micro font-semibold text-[var(--accent)]">
            <span>{brand ? 'Review Brand System' : 'Establish Brand'}</span>
            <ChevronRight size={12} />
          </div>
        </motion.button>

        {/* Module 3: Your Roadmap */}
        <motion.button
          onClick={() => setActiveTab('roadmap')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setActiveTab('roadmap');
            }
          }}
          className="card-glass p-5 group transition-all hover:-translate-y-1 hover:border-[var(--accent)]/40 hover:shadow-[var(--shadow-medium)] focus-ring"
          whileTap={{ scale: 0.98 }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent-soft)] border border-[var(--accent)]/20 text-[var(--accent)]">
              <TrendUp size={20} weight="duotone" />
            </div>
            <ArrowRight
              size={16}
              className="text-[var(--label-tertiary)] group-hover:text-[var(--accent)] group-hover:translate-x-1 transition-all"
            />
          </div>
          <h3 className="text-title font-semibold text-[var(--label-primary)] group-hover:text-[var(--accent)] transition-colors">
            Your Roadmap
          </h3>
          <p className="mt-1.5 text-caption text-[var(--label-secondary)] leading-relaxed">
            Milestones and clear stages from first post to first dollar.
          </p>
          <div className="mt-4 flex items-center gap-1.5 text-micro font-semibold text-[var(--accent)]">
            <span>View Roadmap</span>
            <ChevronRight size={12} />
          </div>
        </motion.button>
      </section>

      {/* AI Mentor + Contextual Insights */}
      <section
        aria-label="AI mentor and contextual insights"
        className="space-y-4 my-6"
      >
        {/* AI Mentor - using new component */}
        <AIMentorEntry
          onPromptClick={(_prompt) => {
            // Navigate to prompts tab or handle AI interaction
            setActiveTab('prompts');
          }}
        />

        {/* Contextual Insights - replacing SignalCard */}
        <div className="space-y-3">
          {insights.map((insight, idx) => (
            <InsightCard
              key={idx}
              title={insight.title}
              description={insight.description}
              insightType={insight.insightType}
              actionLabel={insight.actionLabel}
              onAction={insight.onAction}
            />
          ))}
        </div>
      </section>

      {/* Roadmap Stepper - Full Width */}
      <motion.section
        className="card-glass p-5 md:p-6 my-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-headline">Your Creator Roadmap</h2>
        </div>
        <RoadmapStepper
          steps={journeySteps}
          currentStepId={currentStepId}
          onStepClick={(stepId) => {
            // Navigate to relevant tab based on step
            if (stepId === 'brand') setActiveTab('brand');
            else if (stepId === 'first_content') setActiveTab('create');
            else if (stepId === 'offer') setActiveTab('create');
            else setActiveTab('roadmap');
          }}
        />
      </motion.section>

      {/* Content Studio Workflow */}
      <motion.section
        className="card-glass p-5 md:p-6 my-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-headline">Content Studio</h2>
        </div>
        <ContentStudioWorkflow
          stages={studioStages}
          activeStage="drafts"
          onStageChange={() => setActiveTab('create')}
          onCreateContent={() => setActiveTab('create')}
        />
      </motion.section>

      {/* Daily Creator Goal Tracker */}
      <DailyGoalTracker user={user} className="my-6" />
    </div>
  );
}