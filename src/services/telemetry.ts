export type UserData = any;
export type Project = any;

export type Signal = {
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

export function calculateOneLever(user: UserData, projects: Project[]): Signal | null {
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
