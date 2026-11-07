export type UserData = any;
export type Project = any;

export type LegacySignal = {
  id: string;
  title: string;
  description: string;
  impact: string; // e.g., "+12% Reach"
  action: {
    type: 'navigate';
    path: string;
    params?: { projectId?: string; inspector?: 'retention' | 'repurpose' };
  };
  priority: 'high' | 'medium' | 'low';
};

export function calculateOneLever(user: UserData, projects: Project[]): LegacySignal | null {
  const recentProject = projects.find((project) => project?.type === 'content');
  if (!recentProject) {
    return {
      id: 'onboarding-lever',
      title: 'Start Your First Project',
      description: "You haven't created any content yet. Let's set up your first niche strategy.",
      impact: 'Foundation',
      action: { type: 'navigate', path: '/studio' },
      priority: 'high',
    };
  }

  // Logic for "One Lever" - analyzing project data for signals
  // In a real world scenario, this would hit a Gemini-powered analysis endpoint.
  // Here we implement the "Heuristic Engine" for the MVP.

  // Signal 1: Retention Dip (High Priority)
  if (recentProject.data?.retentionScore && recentProject.data.retentionScore < 40) {
    return {
      id: 'retention-signal',
      title: 'Retention Dip Detected',
      description: `Your latest project has a low retention score. Review its hook and script.`,
      impact: 'Review retention',
      action: {
        type: 'navigate',
        path: recentProject.id ? `/studio/${encodeURIComponent(recentProject.id)}` : '/studio',
        params: { projectId: recentProject.id, inspector: 'retention' },
      },
      priority: 'high',
    };
  }

  // Signal 2: Branding Inconsistency (Medium Priority)
  if (!user.brandCompleted) {
    return {
      id: 'brand-signal',
      title: 'Brand Identity Gap',
      description: "Your visual assets aren't aligned with your niche archetype.",
      impact: 'Higher Trust',
      action: { type: 'navigate', path: '/brand' },
      priority: 'medium',
    };
  }

  // Default: Growth Momentum
  return {
    id: 'growth-signal',
    title: 'Scale Your Reach',
    description: 'Turn an existing script into additional formats.',
    impact: 'Explore formats',
    action: {
      type: 'navigate',
      path: recentProject.id ? `/studio/${encodeURIComponent(recentProject.id)}` : '/studio',
      params: { projectId: recentProject.id, inspector: 'repurpose' },
    },
    priority: 'low',
  };
}

/* ------------------------------------------------------------------ */
/* Experience Blueprint telemetry — pure signal computation           */
/* ------------------------------------------------------------------ */

export type Priority = 'high' | 'medium' | 'low';

export type Signal = {
  id: string;
  type: 'onboarding' | 'retention' | 'publish' | 'repurpose' | 'growth';
  title: string;
  description: string;
  priority: Priority;
  actionable: boolean;
};

export type OneLever = {
  lever: string;
  action: string;
  impact: string;
  confidence: number;
};

export type TelemetrySignals = {
  oneLever: OneLever;
  momentumBar: number;
  signals: Signal[];
};

const PRIORITY_RANK: Record<Priority, number> = { high: 0, medium: 1, low: 2 };

function isDraft(project: Project): boolean {
  return project.status === 'draft';
}

function scoreOf(project: Project): number {
  const score = project?.data?.score;
  return typeof score === 'number' && Number.isFinite(score) ? score : 0;
}

/**
 * Identifies the single most impactful action the creator can take right now.
 * Pure heuristic over raw project data; no provider calls.
 */
export function computeOneLever(projects: Project[], _brand: any): OneLever {
  const list = projects || [];

  // No content yet → the one lever is to start.
  if (list.length === 0) {
    return {
      lever: 'Create your first project',
      action: 'create-first-project',
      impact: 'Foundation',
      confidence: 0.95,
    };
  }

  // Published = shipped. A low-scoring shipped piece hurts retention most → fix it first.
  const published = list.filter((project) => !isDraft(project));
  const lowScore = published.find((project) => scoreOf(project) < 40);
  if (lowScore) {
    return {
      lever: `Improve "${lowScore.data?.title || lowScore.name}"`,
      action: 'improve-retention',
      impact: 'Retention',
      confidence: 0.9,
    };
  }

  // Everything is still a draft → ship one.
  if (published.length === 0) {
    const draft = list.find(isDraft);
    return {
      lever: `Publish "${draft?.data?.title || draft?.name}"`,
      action: 'publish',
      impact: 'Reach',
      confidence: 0.85,
    };
  }

  // Otherwise compound the best performer (draft or shipped).
  const best = [...list].sort((a, b) => scoreOf(b) - scoreOf(a))[0];
  return {
    lever: `Repurpose "${best.data?.title || best.name}"`,
    action: 'repurpose',
    impact: 'Reach',
    confidence: 0.8,
  };
}

/**
 * Momentum Bar: 0-100 prediction of the impact of completed tasks.
 * Clamped to [0, 100] for every input.
 */
export function computeMomentumBar(projects: Project[], recentActivity: any[]): number {
  const list = projects || [];
  const activity = recentActivity || [];

  if (list.length === 0) {
    return 0;
  }

  let score = 0;

  // Volume of work: +5 per project, capped at 10 projects.
  score += Math.min(list.length, 10) * 5;

  // Average quality of the body of work: 0-25.
  const scores = list.map(scoreOf).filter((s) => s > 0);
  if (scores.length > 0) {
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    score += Math.round((avg / 100) * 25);
  }

  // Shipped work compounds: +2 per published project, capped at 5.
  const published = list.filter((project) => project.status === 'published').length;
  score += Math.min(published, 5) * 2;

  // Recent activity is a leading indicator: +1 per action, capped at 15.
  score += Math.min(activity.length, 15) * 1;

  return Math.min(100, Math.max(0, Math.round(score)));
}

/**
 * Maps raw Firestore/project data into high-level Experience Blueprint
 * Signals: the One Lever, the Momentum Bar, and a prioritized signal list.
 */
export function computeSignals(projects: Project[], brand: any): TelemetrySignals {
  const list = projects || [];
  const oneLever = computeOneLever(list, brand);
  const momentumBar = computeMomentumBar(list, brand?.recentActivity);

  const signals: Signal[] = [];

  if (list.length === 0) {
    signals.push({
      id: 'onboarding',
      type: 'onboarding',
      title: 'Start your first project',
      description: "You haven't created any content yet. Set up your first niche strategy.",
      priority: 'high',
      actionable: true,
    });
  } else {
    // Retention dip on low-scoring pieces is the highest-priority signal.
    list
      .filter((project) => scoreOf(project) < 40)
      .forEach((project) => {
        signals.push({
          id: `retention-${project.id}`,
          type: 'retention',
          title: `Improve "${project.data?.title || project.name}"`,
          description: 'Low retention score — review the hook and script.',
          priority: 'high',
          actionable: true,
        });
      });

    // Drafts are ready to ship.
    list.filter(isDraft).forEach((project) => {
      signals.push({
        id: `publish-${project.id}`,
        type: 'publish',
        title: `Publish "${project.data?.title || project.name}"`,
        description: 'Finished drafts compound your reach when published.',
        priority: 'medium',
        actionable: true,
      });
    });

    // Always offer a growth path via the best performer.
    const best = [...list].sort((a, b) => scoreOf(b) - scoreOf(a))[0];
    signals.push({
      id: `repurpose-${best.id}`,
      type: 'repurpose',
      title: `Repurpose "${best.data?.title || best.name}"`,
      description: 'Turn your best-performing piece into additional formats.',
      priority: 'low',
      actionable: true,
    });
  }

  signals.sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]);

  return { oneLever, momentumBar, signals };
}
