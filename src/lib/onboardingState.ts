// Firestore's existing rules permit this bounded map but not new user fields.
// The reserved summary marks profiles created by this version until completion.
export const ONBOARDING_IN_PROGRESS = '__onboarding_in_progress__';

export interface OnboardingAnswers {
  niche: string;
  audience: string;
  vibe: string;
  summary: string;
}

export class OnboardingConflictError extends Error {}

export interface OnboardingBrandKit {
  name?: string;
  tagline?: string;
  [key: string]: unknown;
}
