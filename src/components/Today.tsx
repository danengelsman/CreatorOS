import React, { useEffect, useState } from 'react';
import { ArrowRight, CheckCircle, CircleNotch, Target } from '@phosphor-icons/react';
import { cn } from '../lib/utils';
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
      className="relative overflow-hidden rounded-[24px] border border-[#f4a261]/25 bg-[#111216] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.5)] md:p-9 text-white"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-[#f4a261]/10 blur-[85px]"
      />
      <div className="relative max-w-3xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#f4a261]">
            Today · Your First Dollar path
          </p>
          {journey && journey.status !== 'completed' && (
            <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full border border-[#f4a261]/30 bg-[#f4a261]/10 text-[#f4a261]">
              Step {journey.completedSteps.length + 1} of {JOURNEY_STEPS.length}
            </span>
          )}
        </div>
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
            <h1 className="mt-5 font-serif text-3xl md:text-4xl font-semibold">
              Your starting plan is saved.
            </h1>
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
            <h1 className="mt-4 font-serif text-[clamp(28px,3.8vw,44px)] font-bold tracking-tight text-[#f3f1ed]">
              Make your next move.
            </h1>
            <p className="mt-1 text-sm md:text-base text-white/70">
              A clear next step. One task at a time.
            </p>

            {/* Connected 3-node Roadmap progress path directly on the hero card */}
            <div className="mt-5 flex items-center gap-2 max-w-md">
              {JOURNEY_STEPS.map((s, idx) => {
                const isCompleted = journey.completedSteps.includes(s.id);
                const isCurrent = journey.currentStep === s.id && journey.status !== 'completed';
                const stepNumber = idx + 1;
                return (
                  <React.Fragment key={s.id}>
                    {idx > 0 && (
                      <div
                        className={cn(
                          'h-0.5 flex-1 transition-colors',
                          isCompleted ? 'bg-[#8faa6e]' : 'bg-white/10',
                        )}
                      />
                    )}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <div
                        className={cn(
                          'w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold transition-all',
                          isCompleted
                            ? 'bg-[#8faa6e] text-white shadow-[0_0_8px_rgba(143,170,110,0.4)]'
                            : isCurrent
                              ? 'bg-[#f4a261] text-[#050507] ring-2 ring-[#f4a261]/40 shadow-[0_0_12px_rgba(244,162,97,0.5)]'
                              : 'bg-white/10 text-white/40',
                        )}
                      >
                        {isCompleted ? <CheckCircle size={14} weight="bold" /> : stepNumber}
                      </div>
                      <span
                        className={cn(
                          'text-[11px] hidden sm:inline font-medium',
                          isCurrent ? 'text-[#f4a261] font-semibold' : 'text-white/40',
                        )}
                      >
                        {idx === 0 ? 'Direction' : idx === 1 ? 'Audience' : 'Offer'}
                      </span>
                    </div>
                  </React.Fragment>
                );
              })}
            </div>

            {/* Active task details */}
            <div className="mt-6 rounded-2xl border border-white/10 bg-black/25 p-5 md:p-6 backdrop-blur-sm">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#f4a261]">
                <Target size={15} />
                <span>
                  Step {journey.completedSteps.length + 1} of {JOURNEY_STEPS.length} · {step.title}
                </span>
              </div>
              <p className="mt-2 text-sm md:text-base leading-relaxed text-white/85">
                {step.mission}
              </p>
              <div className="mt-4 pt-4 border-t border-white/[0.08] grid grid-cols-1 md:grid-cols-2 gap-3 text-xs leading-relaxed text-white/60">
                <p>
                  <strong className="text-white/80">Why this matters:</strong> {step.why}
                </p>
                <p>
                  <strong className="text-white/80">When you finish:</strong> {step.next}
                </p>
              </div>
            </div>

            {journey.status === 'not_started' ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => act({ type: 'start' })}
                className="mt-6 rounded-xl bg-[#f4a261] hover:bg-[#ffc184] px-6 py-3 font-bold text-[#17100b] shadow-[0_10px_25px_rgba(244,162,97,0.25)] transition-all flex items-center gap-2 disabled:opacity-50"
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
                      className="rounded-xl bg-[#f4a261] hover:bg-[#ffc184] px-6 py-3 font-bold text-[#17100b] disabled:opacity-50 transition-colors"
                    >
                      {busy ? 'Saving…' : 'Save answer'}
                    </button>
                  )}
                  {saved && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => act({ type: 'complete' })}
                      className="rounded-xl bg-[#f4a261] hover:bg-[#ffc184] px-6 py-3 font-bold text-[#17100b] disabled:opacity-50 transition-colors"
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
