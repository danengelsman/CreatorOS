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
import { calculateOneLever } from '@/services/telemetry';
import { ensureFirstDollarJourney, watchFirstDollarJourney } from '../services/firstDollarJourney';
import { type FirstDollarJourney } from '../firstDollarJourney';
import { RoadmapStepper } from './RoadmapStepper';
import { ContentStudioWorkflow } from './ContentStudioWorkflow';
import { AIMentorEntry } from './premium/AIMentorEntry';
import { InsightCard } from './premium/InsightCard';

export default function Dashboard({
  brand,
  setActiveTab,
  user,
  userData,
  projects = [],
  isProjectsLoading = false,
  projectsLoadError = false,
  onOpenProject,
}: {
  brand: any;
  setActiveTab: (tab: string) => void;
  user: any;
  userData?: any;
  projects?: any[];
  isProjectsLoading?: boolean;
  projectsLoadError?: boolean;
  onOpenProject?: (project: any) => void;
}) {
  const [summary, setSummary] = useState<any>(null);
  const [journey, setJourney] = useState<CreatorJourney | null>(null);
  const [isJourneyLoading, setIsJourneyLoading] = useState(true);
  const [loadKey] = useState(0);
  const [firstDollar, setFirstDollar] = useState<FirstDollarJourney | null>(null);

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
    if (!user?.uid) return;
    let active = true;
    let unsubscribe = () => {};
    ensureFirstDollarJourney(user.uid)
      .then((result) => {
        if (!active) return;
        setFirstDollar(result);
        unsubscribe = watchFirstDollarJourney(
          user.uid,
          (updated) => {
            if (active) setFirstDollar(updated);
          },
          (error) => {
            console.warn('Could not sync your First Dollar path:', error);
          },
        );
      })
      .catch((error) => {
        console.warn('Could not load your First Dollar path:', error);
      });
    return () => {
      active = false;
      unsubscribe();
    };
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

  const hasSignal =
    (summary?.totalFollowers || 0) > 0 ||
    (summary?.totalViews || 0) > 0 ||
    (summary?.engagementRate || 0) > 0 ||
    (summary?.totalRevenue || 0) > 0;

  // One Lever, kept from the old Home: the single highest-leverage action,
  // computed from the user's real data (same call as before).
  const oneLever = useMemo(
    () => calculateOneLever(userData || {}, projects || []),
    [userData, projects],
  );

  const handleOneLeverAction = () => {
    if (!oneLever) return;
    const projectId = oneLever.action.params?.projectId;
    if (projectId) {
      const project = projects.find((item) => item.id === projectId);
      if (project && onOpenProject) {
        onOpenProject(project);
        return;
      }
    }
    if (oneLever.action.path === '/brand') setActiveTab('brand');
    else setActiveTab('create');
  };

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

  // Contextual insights based on state. This useMemo MUST stay above the
  // loading/error early returns below: a hook called after an early return
  // changes the hook count once loading finishes, and React throws
  // "Rendered more hooks than during the previous render" — the onboarding
  // handoff hit exactly that in CI, crashing Home to the error boundary.
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
        description: "You're building the system before the scale.",
        insightType: 'milestone',
      });
    }

    return items;
  }, [milestoneBrandKit, projects.length, hasSignal, completedMilestones, setActiveTab]);

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

  // Journey steps for roadmap (aligned with firstDollarJourney — same list as
  // the Roadmap route, so Home and Roadmap show the same path).
  const journeySteps = [
    {
      id: 'direction',
      title: 'Choose a direction you can start with',
      description:
        'Write down one skill, experience, or interest you could share with someone else.',
      phase: 'discover' as const,
    },
    {
      id: 'person',
      title: 'Name one person you can help',
      description:
        'Describe a specific person and one problem they have related to your direction.',
      phase: 'discover' as const,
    },
    {
      id: 'small_offer',
      title: 'Sketch a small way to help',
      description: 'Describe one small, concrete thing you could make or do for that person.',
      phase: 'build' as const,
    },
    {
      id: 'brand',
      title: 'Build brand system',
      description: 'Visual identity, voice, and positioning for your channel.',
      phase: 'build' as const,
    },
    {
      id: 'first_content',
      title: 'Create first content',
      description: 'Script, record, and publish your first piece.',
      phase: 'build' as const,
    },
    {
      id: 'audience',
      title: 'Grow audience',
      description: 'Consistent publishing and engagement to build a following.',
      phase: 'monetize' as const,
    },
    {
      id: 'offer',
      title: 'Design your offer',
      description: 'Productize your expertise into a paid offer.',
      phase: 'monetize' as const,
    },
    {
      id: 'launch',
      title: 'Launch & iterate',
      description: 'First dollar to sustainable revenue.',
      phase: 'monetize' as const,
    },
  ];

  // Current step comes from the saved First Dollar journey — never inferred
  // from analytics milestones. Once the starting plan is done, brand and
  // draft state take over (same heuristic as the Roadmap route).
  const hasDrafts = contentProjects.some((p) => (p.status || 'Draft').toLowerCase() === 'draft');
  let currentStepId = 'direction';
  if (firstDollar) {
    if (firstDollar.status === 'completed') {
      currentStepId = hasDrafts ? 'first_content' : milestoneBrandKit ? 'brand' : 'direction';
    } else {
      currentStepId = firstDollar.currentStep;
    }
  }

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

  const openProject = (project: any) => {
    if (project?.type === 'content' && onOpenProject) onOpenProject(project);
    else setActiveTab('create');
  };

  const recentProjects = contentProjects
    .filter((project) => project.id !== firstDraft?.id)
    .slice(0, 3);

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

      {/* Pick up where you left off — open a project from Home */}
      {(firstDraft || recentProjects.length > 0) && (
        <section aria-label="Pick up where you left off" className="card-glass p-5 md:p-6 my-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-headline">Pick up where you left off</h2>
            <button
              type="button"
              onClick={() => setActiveTab('create')}
              className="text-micro font-semibold text-[var(--accent)]"
            >
              See all in Studio
            </button>
          </div>
          {firstDraft && (
            <button
              type="button"
              onClick={() => openProject(firstDraft)}
              className="flex w-full items-center justify-between gap-4 rounded-2xl border border-[var(--accent)]/30 bg-[var(--accent-soft)] p-4 text-left transition-all hover:border-[var(--accent)]/60 focus-ring"
            >
              <span className="min-w-0">
                <span className="block text-micro font-semibold text-[var(--accent)]">
                  Continue your draft
                </span>
                <span className="mt-1 block truncate text-title font-semibold text-[var(--label-primary)]">
                  {firstDraft.name || firstDraft.title || 'Your draft'}
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-1.5 text-micro font-semibold text-[var(--accent)]">
                Continue in Studio <ChevronRight size={12} />
              </span>
            </button>
          )}
          {recentProjects.length > 0 && (
            <div className="mt-3 divide-y divide-white/10">
              {recentProjects.map((project) => (
                <button
                  key={project.id}
                  type="button"
                  onClick={() => openProject(project)}
                  className="flex w-full items-center justify-between gap-4 py-3 text-left focus-ring"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-caption font-semibold text-[var(--label-primary)]">
                      {project.name || project.title || 'Untitled project'}
                    </span>
                    <span className="mt-0.5 block text-micro text-[var(--label-secondary)]">
                      {project.status || 'Draft'}
                      {project.data?.platform ? ` · ${project.data.platform}` : ''}
                    </span>
                  </span>
                  <ChevronRight size={16} className="shrink-0 text-[var(--label-tertiary)]" />
                </button>
              ))}
            </div>
          )}
        </section>
      )}

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
      <section aria-label="AI mentor and contextual insights" className="space-y-4 my-6">
        {/* AI Mentor - using new component */}
        <AIMentorEntry
          onPromptClick={(_prompt) => {
            // Navigate to prompts tab or handle AI interaction
            setActiveTab('prompts');
          }}
        />

        {/* Contextual Insights — One Lever lives here as the bottom card */}
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
          {oneLever && (
            <InsightCard
              title={`One Lever: ${oneLever.title}`}
              description={oneLever.description}
              insightType="action"
              actionLabel="Act on signal"
              onAction={handleOneLeverAction}
            />
          )}
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
