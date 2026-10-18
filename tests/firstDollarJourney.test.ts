// Phase 1 — First Dollar journey state machine tests (src/firstDollarJourney.ts).
// Pure functions, no Firebase, no network: every rule the Firestore rules and
// the Today UI rely on (guard rails, answer validation, step advance,
// post-completion immutability) is exercised here.
import { describe, expect, it } from 'vitest';
import {
  createInitialJourney,
  JOURNEY_STEPS,
  transitionJourney,
  type FirstDollarJourney,
} from '../src/firstDollarJourney';

const ANSWER = 'I help new cooks plan quick, affordable weeknight dinners.';

function inProgressJourney(uid = 'user-1'): FirstDollarJourney {
  return transitionJourney(createInitialJourney(uid), { type: 'start' });
}

describe('createInitialJourney', () => {
  it('requires a signed-in uid', () => {
    expect(() => createInitialJourney('')).toThrow('Sign in to start your First Dollar path.');
  });

  it('starts at step one, not started, with no answers and nothing completed', () => {
    expect(createInitialJourney('user-1')).toEqual({
      uid: 'user-1',
      version: 1,
      currentStep: 'direction',
      status: 'not_started',
      answers: {},
      completedSteps: [],
    });
  });
});

describe('transitionJourney: start', () => {
  it('moves not_started to in_progress', () => {
    const next = transitionJourney(createInitialJourney('user-1'), { type: 'start' });
    expect(next.status).toBe('in_progress');
    expect(next.currentStep).toBe('direction');
  });

  it('is idempotent when already in_progress', () => {
    const journey = inProgressJourney();
    expect(transitionJourney(journey, { type: 'start' })).toBe(journey);
  });
});

describe('transitionJourney: save', () => {
  it('rejects saving before the task is started', () => {
    expect(() =>
      transitionJourney(createInitialJourney('user-1'), { type: 'save', answer: ANSWER }),
    ).toThrow('Start this task before saving an answer.');
  });

  it('stores the trimmed answer for the current step', () => {
    const next = transitionJourney(inProgressJourney(), { type: 'save', answer: `  ${ANSWER}  ` });
    expect(next.answers.direction).toBe(ANSWER);
  });

  it('rejects answers shorter than 3 characters', () => {
    expect(() => transitionJourney(inProgressJourney(), { type: 'save', answer: ' hi ' })).toThrow(
      'Write an answer between 3 and 1,000 characters.',
    );
  });

  it('rejects answers longer than 1000 characters', () => {
    expect(() =>
      transitionJourney(inProgressJourney(), { type: 'save', answer: 'x'.repeat(1001) }),
    ).toThrow('Write an answer between 3 and 1,000 characters.');
  });
});

describe('transitionJourney: complete', () => {
  it('rejects completing without a saved answer', () => {
    expect(() => transitionJourney(inProgressJourney(), { type: 'complete' })).toThrow(
      'Save an answer before marking this task complete.',
    );
  });

  it('advances to the next step and records the completed one', () => {
    const withAnswer = transitionJourney(inProgressJourney(), { type: 'save', answer: ANSWER });
    const next = transitionJourney(withAnswer, { type: 'complete' });
    expect(next.currentStep).toBe('person');
    expect(next.status).toBe('in_progress');
    expect(next.completedSteps).toEqual(['direction']);
    expect(next.answers.direction).toBe(ANSWER);
  });

  it('walks all three steps to completion in order', () => {
    let journey = inProgressJourney();
    for (const step of JOURNEY_STEPS) {
      expect(journey.currentStep).toBe(step.id);
      journey = transitionJourney(
        transitionJourney(journey, { type: 'save', answer: `Answer for ${step.id}.` }),
        { type: 'complete' },
      );
    }
    expect(journey.status).toBe('completed');
    expect(journey.completedSteps).toEqual(['direction', 'person', 'small_offer']);
    expect(journey.answers).toEqual({
      direction: 'Answer for direction.',
      person: 'Answer for person.',
      small_offer: 'Answer for small_offer.',
    });
  });
});

describe('transitionJourney: guard rails', () => {
  it('rejects an unsupported journey version', () => {
    const journey = { ...createInitialJourney('user-1'), version: 2 as unknown as 1 };
    expect(() => transitionJourney(journey, { type: 'start' })).toThrow(
      'This journey version is not supported.',
    );
  });

  it('rejects every action on a completed journey', () => {
    let journey = inProgressJourney();
    for (const step of JOURNEY_STEPS) {
      journey = transitionJourney(
        transitionJourney(journey, { type: 'save', answer: `Answer for ${step.id}.` }),
        { type: 'complete' },
      );
    }
    expect(journey.status).toBe('completed');
    expect(() => transitionJourney(journey, { type: 'start' })).toThrow(
      'Your starting plan is already complete.',
    );
    expect(() => transitionJourney(journey, { type: 'save', answer: ANSWER })).toThrow(
      'Your starting plan is already complete.',
    );
    expect(() => transitionJourney(journey, { type: 'complete' })).toThrow(
      'Your starting plan is already complete.',
    );
  });

  it('never mutates the journey it is given', () => {
    const journey = inProgressJourney();
    const snapshot = structuredClone(journey);
    transitionJourney(journey, { type: 'save', answer: ANSWER });
    expect(() => transitionJourney(journey, { type: 'complete' })).toThrow(
      'Save an answer before marking this task complete.',
    );
    expect(journey).toEqual(snapshot);
  });
});
