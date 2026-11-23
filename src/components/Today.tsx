// @ts-nocheck
import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  isWorkspaceTokenCurrent,
  useWorkspaceStore,
  type WorkspaceToken,
} from '@/store/workspaceStore';
import { ArrowRight, CheckCircle, CircleNotch, Target } from '@phosphor-icons/react';
import { cn } from '../lib/utils';
import { JOURNEY_STEPS, type FirstDollarJourney, type JourneyAction } from '../firstDollarJourney';
import {
  ensureFirstDollarJourney,
  updateFirstDollarJourney,
  watchFirstDollarJourney,
} from '../services/firstDollarJourney';
import { ProgressPath } from './ProgressPath';
import { motion } from 'motion/react';

type TodayProps = {
  user: { uid: string };
  setActiveTab: (tab: string) => void;
};

export default function Today(props: TodayProps) {
  const auth = useAuth();
  const token = auth.workspaceToken;
  const current = useWorkspaceStore((state) => isWorkspaceTokenCurrent(state, token));
  if (!token || !current || token.uid !== props.user?.uid || token.uid !== auth.user?.uid)
    return null;
  return <TodaySession key={`${token.uid}:${token.generation}`} {...props} token={token} />;
}

function TodaySession({ user, setActiveTab, token }: TodayProps & { token: WorkspaceToken }) {
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const isCurrent = () =>
    mounted.current && isWorkspaceTokenCurrent(useWorkspaceStore.getState(), token);
  const [journey, setJourney] = useState<FirstDollarJourney | null>(null);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (!isWorkspaceTokenCurrent(useWorkspaceStore.getState(), token)) return;
    let active = true;
    let unsubscribe = () => {};
    setLoading(true);
    setJourney(null);
    setError('');
    ensureFirstDollarJourney(
      user.uid,
      () => active && isWorkspaceTokenCurrent(useWorkspaceStore.getState(), token),
    )
      .then((result) => {
        if (!active || !isWorkspaceTokenCurrent(useWorkspaceStore.getState(), token)) return;
        setJourney(result);
        setLoading(false);
        unsubscribe = watchFirstDollarJourney(
          user.uid,
          (updated) => {
            if (active && isWorkspaceTokenCurrent(useWorkspaceStore.getState(), token))
              setJourney(updated);
          },
          (reason) => {
            if (active && isWorkspaceTokenCurrent(useWorkspaceStore.getState(), token))
              setError(`Could not sync your journey: ${reason.message}`);
          },
        );
      })
      .catch((reason) => {
        if (active && isWorkspaceTokenCurrent(useWorkspaceStore.getState(), token)) {
          setLoading(false);
          setError(
            `Could not load your journey. Check your connection and try again. ${reason.message}`,
          );
        }
      });
    return () => {
      active = false;
      unsubscribe();
    };
  }, [user.uid, retry, token]);

  const currentStep = journey?.currentStep;
  const savedAnswer = currentStep ? journey?.answers[currentStep] || '' : '';
  useEffect(() => {
    setDraft(savedAnswer);
  }, [currentStep, savedAnswer]);

  const act = async (action: JourneyAction) => {
    if (!journey || busy || !isCurrent()) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const updated = await updateFirstDollarJourney(user.uid, action, isCurrent);
      if (!isCurrent()) return;
      setJourney(updated);
      if (action.type === 'save')
        setNotice('Answer saved. Mark the task complete when you are ready.');
      if (action.type === 'complete')
        setNotice(
          updated.status === 'completed'
            ? 'Starting plan saved.'
            : 'Task complete. Here is your next action.',
        );
    } catch (reason) {
      if (!isCurrent()) return;
      setError(
        `Nothing was marked complete. ${reason instanceof Error ? reason.message : 'Try again.'}`,
      );
    } finally {
      if (isCurrent()) setBusy(false);
    }
  };

  const step = JOURNEY_STEPS.find((item) => item.id === journey?.currentStep) || JOURNEY_STEPS[0];
  const saved = draft.trim() === savedAnswer && !!savedAnswer;
  const completedCount = journey?.completedSteps.length || 0;
  const totalSteps = JOURNEY_STEPS.length;
  const currentStepNumber = completedCount + 1;

  return (
    <section
      aria-label="Today: First Dollar path"
      className="relative card-hero p-6 md:p-8"
    >
      {/* Ambient glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-[var(--accent-soft)] blur-[85px]"
      />

      <div className="relative max-w-3xl">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <p className="text-micro text-[var(--accent)]">
            Today · Your First Dollar Path
          </p>
          {journey && journey.status !== 'completed' && (
            <span className="text-micro px-3 py-1 rounded-full border border-[var(--accent)]/30 bg-[var(--accent-soft)] text-[var(--accent)]">
              Step {currentStepNumber} of {totalSteps}
            </span>
          )}
        </div>

        {loading ? (
          <motion.p
            role="status"
            className="mt-8 flex items-center gap-2 text-[var(--label-secondary)]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <CircleNotch className="animate-spin" size={20} />
            Loading your next action…
          </motion.p>
        ) : !journey ? (
          <motion.div className="mt-6" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <p role="alert" className="text-[var(--system-red)]">
              {error || 'Your journey is unavailable.'}
            </p>
            <button
              type="button"
              onClick={() => setRetry((value) => value + 1)}
              className="mt-4 ios-button ios-button-filled"
            >
              Retry loading
            </button>
          </motion.div>
        ) : journey.status === 'completed' ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="mt-5 text-display">
              Your starting plan is saved.
            </h1>
            <p className="mt-3 text-body text-[var(--label-secondary)]">
              You completed these planning tasks. This does not mean you have earned revenue yet.
            </p>
            <ul className="mt-6 space-y-3" role="list">
              {JOURNEY_STEPS.map((item) => (
                <motion.li
                  key={item.id}
                  className="card-base p-4"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 * JOURNEY_STEPS.indexOf(item) }}
                >
                  <div className="flex items-center gap-2 text-caption font-semibold">
                    <CheckCircle className="text-[var(--system-green)]" size={18} />
                    {item.title}
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-caption text-[var(--label-secondary)]">
                    {journey.answers[item.id]}
                  </p>
                </motion.li>
              ))}
            </ul>
            <motion.button
              type="button"
              onClick={() => setActiveTab('create')}
              className="mt-6 ios-button ios-button-filled"
              whileTap={{ scale: 0.98 }}
            >
              Explore the studio <ArrowRight className="inline" size={17} />
            </motion.button>
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            {/* Progress Path - Mountain visualization */}
            <ProgressPath
              currentStep={currentStepNumber}
              totalSteps={totalSteps}
              className="mb-6"
            />

            {/* Main Hero Content */}
            <div className="space-y-6">
              <div>
                <motion.h1 className="text-display">
                  Make your next move.
                </motion.h1>
                <p className="mt-1 text-body text-[var(--label-secondary)]">
                  A clear next step. One task at a time.
                </p>
              </div>

              {/* Active task details */}
              <motion.div
                className="card-glass p-5 md:p-6"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <div className="flex items-center gap-2 text-micro font-semibold text-[var(--accent)]">
                  <Target size={15} />
                  <span>
                    Step {currentStepNumber} of {totalSteps} · {step.title}
                  </span>
                </div>
                <p className="mt-2 text-body text-[var(--label-primary)] leading-relaxed">
                  {step.mission}
                </p>
                <div className="mt-4 pt-4 border-t border-white/10 grid grid-cols-1 md:grid-cols-2 gap-3 text-caption text-[var(--label-secondary)]">
                  <p>
                    <strong className="text-[var(--label-primary)]">Why this matters:</strong> {step.why}
                  </p>
                  <p>
                    <strong className="text-[var(--label-primary)]">When you finish:</strong> {step.next}
                  </p>
                </div>
              </motion.div>

              {/* Action Area */}
              {journey.status === 'not_started' ? (
                <motion.button
                  type="button"
                  disabled={busy}
                  onClick={() => act({ type: 'start' })}
                  className="w-full ios-button ios-button-filled justify-center gap-2"
                  whileTap={{ scale: 0.98 }}
                >
                  {busy ? 'Starting…' : 'Start this task'} <ArrowRight className="inline" size={17} />
                </motion.button>
              ) : (
                <motion.div className="space-y-4" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                  <label htmlFor="today-answer" className="block text-caption font-semibold text-[var(--label-primary)]">
                    {step.question}
                  </label>
                  <textarea
                    id="today-answer"
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    maxLength={1000}
                    rows={4}
                    placeholder={step.placeholder}
                    className="ios-input resize-y focus-ring"
                  />
                  <p className="text-micro text-[var(--label-tertiary)]">
                    Your answer stays in your account. You choose when to mark the task complete.
                  </p>
                  <div className="flex flex-wrap items-center gap-3">
                    {!saved && (
                      <motion.button
                        type="button"
                        disabled={busy || draft.trim().length < 3}
                        onClick={() => act({ type: 'save', answer: draft })}
                        className="ios-button ios-button-filled"
                        whileTap={{ scale: 0.98 }}
                      >
                        {busy ? 'Saving…' : 'Save answer'}
                      </motion.button>
                    )}
                    {saved && (
                      <motion.button
                        type="button"
                        disabled={busy}
                        onClick={() => act({ type: 'complete' })}
                        className="ios-button ios-button-filled gap-2"
                        whileTap={{ scale: 0.98 }}
                      >
                        {busy ? 'Completing…' : 'Mark task complete'} <ArrowRight className="inline" size={17} />
                      </motion.button>
                    )}
                    {saved && (
                      <span className="text-caption text-[var(--system-green)]">Answer saved</span>
                    )}
                  </div>
                </motion.div>
              )}

              {/* Notices */}
              {notice && (
                <motion.p
                  role="status"
                  className="text-caption text-[var(--system-green)]"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  {notice}
                </motion.p>
              )}
              {journey && error && (
                <motion.p
                  role="alert"
                  className="text-caption text-[var(--system-red)]"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  {error}
                </motion.p>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </section>
  );
}