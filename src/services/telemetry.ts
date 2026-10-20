
import { UserData, Project } from '@/types';

export type Signal = {
  id: string;
  title: string;
  description: string;
  impact: string; // e.g., "+12% Reach"
  action: {
    type: 'navigate';
    path: string;
    params?: any;
  };
  priority: 'high' | 'medium' | 'low';
};

export function calculateOneLever(user: UserData, projects: Project[]): Signal | null {
  if (projects.length === 0) {
    return {
      id: 'onboarding-lever',
      title: 'Start Your First Project',
      description: 'You haven\'t created any content yet. Let\'s set up your first niche strategy.',
      impact: 'Foundation',
      action: { type: 'navigate', path: '/dashboard/create' },
      priority: 'high',
    };
  }

  // Logic for "One Lever" - analyzing project data for signals
  // In a real world scenario, this would hit a Gemini-powered analysis endpoint.
  // Here we implement the "Heuristic Engine" for the MVP.

  const recentProject = projects[0];
  
  // Signal 1: Retention Dip (High Priority)
  if (recentProject.data?.retentionScore && recentProject.data.retentionScore < 40) {
    return {
      id: 'retention-signal',
      title: 'Retention Dip Detected',
      description: `Your latest project "${recentProject.title}" has a retention drop at the 30s mark.`,
      impact: '+20% Watch Time',
      action: { type: 'navigate', path: '/dashboard/retention', params: { projectId: recentProject.id } },
      priority: 'high',
    };
  }

  // Signal 2: Branding Inconsistency (Medium Priority)
  if (!user.brandCompleted) {
    return {
      id: 'brand-signal',
      title: 'Brand Identity Gap',
      description: 'Your visual assets aren\'t aligned with your niche archetype.',
      impact: 'Higher Trust',
      action: { type: 'navigate', path: '/dashboard/brand' },
      priority: 'medium',
    };
  }

  // Default: Growth Momentum
  return {
    id: 'growth-signal',
    title: 'Scale Your Reach',
    description: 'Your current scripts are performing well. Let\'s repurpose them for Shorts.',
    impact: '+50% New Viewers',
    action: { type: 'navigate', path: '/dashboard/repurpose' },
    priority: 'low',
  };
}
