import React, { useEffect, useState } from 'react';
import { ArrowRight, CheckCircle, CircleNotch, Target } from '@phosphor-icons/react';
import { JOURNEY_STEPS, type FirstDollarJourney, type JourneyAction } from '../firstDollarJourney';
import {
  ensureFirstDollarJourney,
  updateFirstDollarJourney,
  watchFirstDollarJourney,
} from '../services/firstDollarJourney';

export default function Today({
  user,
  setActiveTab,
}: {
  user: { uid: string };
  setActiveTab: (tab: string) => void;
}) {
  const [journey, setJourney] = useState<FirstDollarJourney | null>(null);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let active = true;
    let unsubscribe = () => {};
    setLoading(true);
    setJourney(null);
    setError('');
    ensureFirstDollarJourney(user.uid)
      .then((result) => {
        if (!active) return;
        setJourney(result);
        setLoading(false);
        unsubscribe = watchFirstDollarJourney(
          user.uid,
          (updated) => {
            if (active) setJourney(updated);
          },
          (reason) => {
            if (active) setError(`Could not sync your journey: ${reason.message}`);
          },
        );
      })
      .catch((reason) => {
        if (active) {
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
  }, [user.uid, retry]);

  const currentStep = journey?.currentStep;
  const savedAnswer = currentStep ? journey?.answers[currentStep] || '' : '';
  useEffect(() => {
    setDraft(savedAnswer);
  }, [currentStep, savedAnswer]);

  const act = async (action: JourneyAction) => {
    if (!journey || busy) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const updated = await updateFirstDollarJourney(user.uid, action);
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
      setError(
        `Nothing was marked complete. ${reason instanceof Error ? reason.message : 'Try again.'}`,
      );
    } finally {
      setBusy(false);
    }
  };

  const step = JOURNEY_STEPS.find((item) => item.id === journey?.currentStep) || JOURNEY_STEPS[0];
  const saved = draft.trim() === savedAnswer && !!savedAnswer;
  return (
    <section
      aria-label="Today: First Dollar path"
      className="relative overflow-hidden rounded-[28px] border border-[#f4a261]/25 bg-[linear-gradient(135deg,rgba(42,32,43,0.98),rgba(16,16,25,0.98)_65%,rgba(44,29,26,0.94))] p-6 shadow-[0_30px_90px_rgba(0,0,0,0.32)] md:p-9 text-white"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-[#f4a261]/10 blur-[85px]"
      />
      <div className="relative max-w-3xl">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#f4a261]">
          Today · Your First Dollar path
        </p>
        {loading ? (
          <p role="status" className="mt-8 flex items-center gap-2 text-white/70">
            <CircleNotch className="animate-spin" size={20} /> Loading your next action…
          </p>
        ) : !journey ? (
          <div className="mt-6">
            <p role="alert" className="text-rose-200">
              {error || 'Your journey is unavailable.'}
            </p>
            <button
              type="button"
              onClick={() => setRetry((value) => value + 1)}
              className="mt-4 rounded-xl bg-white px-5 py-3 font-semibold text-[#17100b]"
            >
              Retry loading
            </button>
          </div>
        ) : journey.status === 'completed' ? (
          <>
            <h1 className="mt-5 font-serif text-4xl font-semibold">Your starting plan is saved.</h1>
            <p className="mt-3 text-white/70">
              You completed these planning tasks. This does not mean you have earned revenue yet.
            </p>
            <ul className="mt-6 space-y-3">
              {JOURNEY_STEPS.map((item) => (
                <li key={item.id} className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <span className="flex items-center gap-2 text-sm font-semibold">
                    <CheckCircle className="text-emerald-300" size={18} /> {item.title}
                  </span>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-white/70">
                    {journey.answers[item.id]}
                  </p>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => setActiveTab('create')}
              className="mt-6 rounded-xl bg-[#f4a261] px-5 py-3 font-bold text-[#17100b]"
            >
              Explore the studio <ArrowRight className="inline" size={17} />
            </button>
          </>
        ) : (
          <>
            <div className="mt-5 flex items-center gap-2 text-sm text-white/60">
              <Target size={17} /> Step {journey.completedSteps.length + 1} of{' '}
              {JOURNEY_STEPS.length} · {journey.completedSteps.length} completed by you
            </div>
            <h1 className="mt-4 font-serif text-[clamp(30px,4vw,48px)] font-semibold leading-tight">
              {step.title}
            </h1>
            <p className="mt-4 text-base leading-7 text-white/85">{step.mission}</p>
            <div className="mt-6 space-y-2 rounded-2xl border border-white/10 bg-white/5 p-5 text-sm leading-6 text-white/70">
              <p>
                <strong className="text-white">Why this matters:</strong> {step.why}
              </p>
              <p>
                <strong className="text-white">When you finish:</strong> {step.next}
              </p>
            </div>
            {journey.status === 'not_started' ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => act({ type: 'start' })}
                className="mt-6 rounded-xl bg-[#f4a261] px-6 py-3 font-bold text-[#17100b] disabled:opacity-50"
              >
                {busy ? 'Starting…' : 'Start this task'} <ArrowRight className="inline" size={17} />
              </button>
            ) : (
              <div className="mt-6 space-y-4">
                <label htmlFor="today-answer" className="block text-sm font-semibold">
                  {step.question}
                </label>
                <textarea
                  id="today-answer"
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  maxLength={1000}
                  rows={4}
                  placeholder={step.placeholder}
                  className="w-full resize-y rounded-xl border border-white/20 bg-black/30 p-4 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-[#f4a261]"
                />
                <p className="text-xs text-white/55">
                  Your answer stays in your account. You choose when to mark the task complete.
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  {!saved && (
                    <button
                      type="button"
                      disabled={busy || draft.trim().length < 3}
                      onClick={() => act({ type: 'save', answer: draft })}
                      className="rounded-xl bg-[#f4a261] px-6 py-3 font-bold text-[#17100b] disabled:opacity-50"
                    >
                      {busy ? 'Saving…' : 'Save answer'}
                    </button>
                  )}
                  {saved && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => act({ type: 'complete' })}
                      className="rounded-xl bg-[#f4a261] px-6 py-3 font-bold text-[#17100b] disabled:opacity-50"
                    >
                      {busy ? 'Completing…' : 'Mark task complete'}{' '}
                      <ArrowRight className="inline" size={17} />
                    </button>
                  )}
                  {saved && <span className="text-sm text-emerald-200">Answer saved</span>}
                </div>
              </div>
            )}
          </>
        )}
        {notice && (
          <p role="status" className="mt-4 text-sm text-emerald-200">
            {notice}
          </p>
        )}
        {journey && error && (
          <p role="alert" className="mt-4 text-sm text-rose-200">
            {error}
          </p>
        )}
      </div>
    </section>
  );
}
