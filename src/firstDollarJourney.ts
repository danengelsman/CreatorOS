export const JOURNEY_STEPS = [
  {
    id: 'direction',
    title: 'Choose a direction you can start with',
    mission:
      'Write down one skill, experience, or interest you could share with someone else. Pick one you would enjoy exploring first.',
    why: 'A starting point from your own life is easier to test than a niche chosen from a trend list.',
    next: 'Next, you will name one person who could benefit from it.',
    question: 'What do you know, do, or enjoy that you could help someone with?',
    placeholder: 'For example: I enjoy teaching friends how to cook affordable meals…',
  },
  {
    id: 'person',
    title: 'Name one person you can help',
    mission: 'Describe a specific person and one problem they have related to your direction.',
    why: 'Knowing who you are helping makes your first useful piece of work easier to plan.',
    next: 'Next, you will sketch a small way to help them.',
    question: 'Who is this for, and what do they need help with?',
    placeholder: 'For example: New cooks who need quick dinners on a small budget…',
  },
  {
    id: 'small_offer',
    title: 'Sketch a small way to help',
    mission:
      'Describe one small, concrete thing you could make or do for that person. This is an idea, not a claim that you have sold it.',
    why: 'A specific way to help gives you something to test before you invest a lot of time.',
    next: 'Your starting plan will be saved here for you to revisit.',
    question: 'What is one small thing you could make or do for them?',
    placeholder: 'For example: A one-page meal plan for their first week…',
  },
] as const;

export type JourneyStep = (typeof JOURNEY_STEPS)[number]['id'];
export type JourneyStatus = 'not_started' | 'in_progress' | 'completed';
export interface FirstDollarJourney {
  uid: string;
  version: 1;
  currentStep: JourneyStep;
  status: JourneyStatus;
  answers: Partial<Record<JourneyStep, string>>;
  completedSteps: JourneyStep[];
}
export type JourneyAction =
  { type: 'start' } | { type: 'save'; answer: string } | { type: 'complete' };

export function createInitialJourney(uid: string): FirstDollarJourney {
  if (!uid) throw new Error('Sign in to start your First Dollar path.');
  return {
    uid,
    version: 1,
    currentStep: 'direction',
    status: 'not_started',
    answers: {},
    completedSteps: [],
  };
}

export function transitionJourney(
  journey: FirstDollarJourney,
  action: JourneyAction,
): FirstDollarJourney {
  if (journey.version !== 1) throw new Error('This journey version is not supported.');
  if (journey.status === 'completed') throw new Error('Your starting plan is already complete.');
  if (action.type === 'start') {
    return journey.status === 'not_started' ? { ...journey, status: 'in_progress' } : journey;
  }
  if (journey.status !== 'in_progress') throw new Error('Start this task before saving an answer.');
  if (action.type === 'save') {
    const answer = action.answer.trim();
    if (answer.length < 3 || answer.length > 1000)
      throw new Error('Write an answer between 3 and 1,000 characters.');
    return { ...journey, answers: { ...journey.answers, [journey.currentStep]: answer } };
  }
  if (!journey.answers[journey.currentStep]?.trim())
    throw new Error('Save an answer before marking this task complete.');
  const index = JOURNEY_STEPS.findIndex((step) => step.id === journey.currentStep);
  const completedSteps = [...journey.completedSteps, journey.currentStep];
  const next = JOURNEY_STEPS[index + 1];
  return next
    ? { ...journey, currentStep: next.id, completedSteps }
    : { ...journey, status: 'completed', completedSteps };
}
