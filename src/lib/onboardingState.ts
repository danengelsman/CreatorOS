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

// Match the existing client-side boundary in both generation and completion.
export function validateOnboardingBrandName(kit: OnboardingBrandKit): void {
  if (kit.name != null && (typeof kit.name !== 'string' || kit.name.length > 99)) {
    throw new Error(
      'The generated brand name must be at most 99 characters. Generate the kit again to try a shorter name.',
    );
  }
}
