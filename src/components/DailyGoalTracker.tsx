import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  CheckCircle, 
  Circle, 
  Plus, 
  Trash, 
  Fire, 
  Sparkle, 
  ArrowCounterClockwise,
  Check
} from '@phosphor-icons/react';
import { cn } from '../lib/utils';
import Confetti from './Confetti';
import { 
  DailyGoalTask, 
  DailyGoalsState, 
  DEFAULT_GOAL_SUGGESTIONS, 
  getLocalDailyGoals, 
  fetchDailyGoalsFromCloud, 
  syncDailyGoalsToCloud,
  getTodayDateString,
  getYesterdayDateString
} from '../services/dailyGoals';

interface DailyGoalTrackerProps {
  user?: any;
  className?: string;
}

export default function DailyGoalTracker({ user, className }: DailyGoalTrackerProps) {
  const [goalsState, setGoalsState] = useState<DailyGoalsState>(() => getLocalDailyGoals());
  const [newTaskInput, setNewTaskInput] = useState('');
  const [showCelebration, setShowCelebration] = useState(false);
  const [hasCelebratedToday, setHasCelebratedToday] = useState(false);

  // Sync with Firestore when user is available or on mount
  useEffect(() => {
    let isMounted = true;
    if (user?.uid) {
      fetchDailyGoalsFromCloud(user.uid).then(cloudState => {
        if (isMounted) {
          setGoalsState(cloudState);
          if (cloudState.lastCompletedDate === getTodayDateString()) {
            setHasCelebratedToday(true);
          }
        }
      });
    }
    return () => {
      isMounted = false;
    };
  }, [user?.uid]);

  const tasks = goalsState.tasks;
  const totalCount = tasks.length;
  const completedCount = tasks.filter(t => t.completed).length;
  const percentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const isAllComplete = totalCount > 0 && completedCount === totalCount;

  const updateStateAndPersist = (newState: DailyGoalsState) => {
    setGoalsState(newState);
    void syncDailyGoalsToCloud(user?.uid, newState);
  };

  const toggleTask = (taskId: string) => {
    const today = getTodayDateString();
    const updatedTasks = tasks.map(t => {
      if (t.id === taskId) {
        return {
          ...t,
          completed: !t.completed,
          completedAt: !t.completed ? new Date().toISOString() : undefined
        };
      }
      return t;
    });

    const nowCompletedCount = updatedTasks.filter(t => t.completed).length;
    const nowAllComplete = updatedTasks.length > 0 && nowCompletedCount === updatedTasks.length;

    let newStreak = goalsState.streak;
    let newLastCompletedDate = goalsState.lastCompletedDate;

    if (nowAllComplete && goalsState.lastCompletedDate !== today) {
      // Completed all tasks for today
      newLastCompletedDate = today;
      // Increment streak if yesterday was completed or this is first streak
      const wasYesterday = goalsState.lastCompletedDate === getYesterdayDateString();
      newStreak = wasYesterday ? goalsState.streak + 1 : Math.max(1, goalsState.streak || 1);

      if (!hasCelebratedToday) {
        setShowCelebration(true);
        setHasCelebratedToday(true);
        setTimeout(() => setShowCelebration(false), 4500);
      }
    } else if (!nowAllComplete && goalsState.lastCompletedDate === today) {
      // Reverted a task
      newLastCompletedDate = undefined;
      newStreak = Math.max(0, goalsState.streak - 1);
    }

    const nextState: DailyGoalsState = {
      ...goalsState,
      date: today,
      tasks: updatedTasks,
      streak: newStreak,
      lastCompletedDate: newLastCompletedDate
    };

    updateStateAndPersist(nextState);
  };

  const addTask = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    // Prevent identical duplicates
    if (tasks.some(t => t.text.toLowerCase() === trimmed.toLowerCase())) {
      setNewTaskInput('');
      return;
    }

    const newTask: DailyGoalTask = {
      id: 'task-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      text: trimmed,
      completed: false,
      createdAt: new Date().toISOString()
    };

    const nextState: DailyGoalsState = {
      ...goalsState,
      tasks: [...tasks, newTask]
    };

    updateStateAndPersist(nextState);
    setNewTaskInput('');
  };

  const deleteTask = (taskId: string) => {
    const nextState: DailyGoalsState = {
      ...goalsState,
      tasks: tasks.filter(t => t.id !== taskId)
    };
    updateStateAndPersist(nextState);
  };

  const resetAllToday = () => {
    const nextState: DailyGoalsState = {
      ...goalsState,
      tasks: tasks.map(t => ({ ...t, completed: false, completedAt: undefined })),
      lastCompletedDate: goalsState.lastCompletedDate === getTodayDateString() ? undefined : goalsState.lastCompletedDate
    };
    updateStateAndPersist(nextState);
    setHasCelebratedToday(false);
  };

  // Filter default suggestions that aren't yet added
  const availableSuggestions = DEFAULT_GOAL_SUGGESTIONS.filter(
    sugg => !tasks.some(t => t.text.toLowerCase() === sugg.toLowerCase())
  );

  return (
    <section 
      aria-label="Daily creator goal tracker"
      className={cn(
        "relative overflow-hidden rounded-[28px] border border-white/[0.09] bg-white/[0.035] p-6 shadow-[0_24px_70px_rgba(0,0,0,0.24)] backdrop-blur-xl md:p-7",
        className
      )}
    >
      {showCelebration && <Confetti count={65} />}

      {/* Ambient background glow */}
      <div aria-hidden="true" className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[#f4a261]/[0.08] blur-[80px]" />
      <div aria-hidden="true" className="pointer-events-none absolute -left-20 -bottom-20 h-64 w-64 rounded-full bg-[#8b5cf6]/[0.08] blur-[80px]" />

      {/* Top Header */}
      <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-white/55">
            <Sparkle size={13} weight="fill" className="text-[var(--accent)]" />
            <span>Daily creator habits</span>
          </div>
          <h3 className="mt-1 text-2xl font-bold tracking-tight text-[var(--label-primary)]">
            Micro-habits compound into reach.
          </h3>
          <p className="mt-1 text-sm text-[var(--label-secondary)]">
            Small daily creative executions that build long-term momentum.
          </p>
        </div>

        {/* Streak & Reset Badges */}
        <div className="flex items-center gap-2 shrink-0">
          <div className={cn(
            "flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition-all border",
            goalsState.streak > 0 
              ? "border-[#f4a261]/30 bg-[#f4a261]/15 text-[#f7c99c] shadow-[0_0_20px_rgba(244,162,97,0.2)]"
              : "border-white/[0.08] bg-white/[0.04] text-white/60"
          )}>
            <Fire size={16} weight="fill" className={goalsState.streak > 0 ? "text-[#f4a261] animate-pulse" : "text-white/40"} />
            <span>{goalsState.streak > 0 ? `${goalsState.streak}-day streak` : 'Start your streak'}</span>
          </div>

          {tasks.some(t => t.completed) && (
            <button
              type="button"
              onClick={resetAllToday}
              title="Reset progress for today"
              className="flex h-8 w-8 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.04] text-white/60 transition-colors hover:bg-white/[0.08] hover:text-white"
            >
              <ArrowCounterClockwise size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Progress Bar & Stats */}
      <div className="relative z-10 mt-6 rounded-2xl border border-white/[0.06] bg-black/25 p-4">
        <div className="flex items-center justify-between text-xs font-semibold">
          <span className="text-white/70">
            Today's Progress: <span className="text-white font-bold">{completedCount} of {totalCount} completed</span>
          </span>
          <span className={cn(
            "font-mono font-bold transition-colors",
            isAllComplete ? "text-emerald-400" : "text-[var(--accent)]"
          )}>
            {percentage}%
          </span>
        </div>

        <div className="mt-2.5 h-2.5 w-full overflow-hidden rounded-full bg-white/[0.08]">
          <motion.div 
            className="h-full rounded-full bg-gradient-to-r from-[#f4a261] via-[#c4b5fd] to-emerald-400"
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          />
        </div>

        {isAllComplete && (
          <motion.div 
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-2.5 flex items-center gap-1.5 text-xs font-semibold text-emerald-400"
          >
            <Check size={14} weight="bold" />
            <span>All habits done for today! Your creative momentum is compounding.</span>
          </motion.div>
        )}
      </div>

      {/* Tasks List */}
      <div className="relative z-10 mt-5 space-y-2">
        <AnimatePresence initial={false}>
          {tasks.map((task) => {
            const isDone = task.completed;
            return (
              <motion.div
                key={task.id}
                layout
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className={cn(
                  "group flex items-center justify-between gap-3 rounded-2xl border p-3.5 transition-all",
                  isDone 
                    ? "border-emerald-500/20 bg-emerald-500/[0.04]"
                    : "border-white/[0.07] bg-white/[0.02] hover:border-white/[0.14] hover:bg-white/[0.04]"
                )}
              >
                <button
                  type="button"
                  onClick={() => toggleTask(task.id)}
                  className="flex flex-1 items-center gap-3 text-left focus:outline-none"
                >
                  <div className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border transition-all",
                    isDone 
                      ? "border-emerald-400 bg-emerald-400 text-black shadow-[0_0_12px_rgba(52,211,153,0.3)]"
                      : "border-white/20 bg-white/[0.04] text-transparent hover:border-white/40"
                  )}>
                    <Check size={14} weight="bold" className={isDone ? "opacity-100" : "opacity-0"} />
                  </div>

                  <span className={cn(
                    "text-sm font-medium transition-all select-none",
                    isDone 
                      ? "text-white/40 line-through" 
                      : "text-white/90 group-hover:text-white"
                  )}>
                    {task.text}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => deleteTask(task.id)}
                  title="Remove goal"
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg text-white/40 hover:text-rose-400 hover:bg-rose-500/10 focus:opacity-100"
                >
                  <Trash size={15} />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {tasks.length === 0 && (
          <div className="rounded-2xl border border-dashed border-white/10 p-6 text-center text-sm text-white/50">
            No habits added yet. Pick a suggestion below or create your own!
          </div>
        )}
      </div>

      {/* Quick Add Preset Suggestions */}
      {availableSuggestions.length > 0 && (
        <div className="relative z-10 mt-5">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/50 mb-2.5">
            Quick add habit templates
          </p>
          <div className="flex flex-wrap gap-2">
            {availableSuggestions.map((sugg) => (
              <button
                key={sugg}
                type="button"
                onClick={() => addTask(sugg)}
                className="group flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-white/70 transition-all hover:border-[var(--accent)]/40 hover:bg-[var(--accent)]/10 hover:text-[var(--accent)]"
              >
                <Plus size={13} weight="bold" className="transition-transform group-hover:rotate-90" />
                <span>{sugg}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Custom Task Input */}
      <form 
        onSubmit={(e) => {
          e.preventDefault();
          addTask(newTaskInput);
        }}
        className="relative z-10 mt-5 flex items-center gap-2"
      >
        <div className="relative flex-1">
          <input
            type="text"
            value={newTaskInput}
            onChange={(e) => setNewTaskInput(e.target.value)}
            placeholder="Add a daily micro-habit (e.g., 'Study 1 trending thumbnail')..."
            className="w-full rounded-xl border border-white/[0.10] bg-black/30 px-3.5 py-2.5 text-sm text-white placeholder-white/35 transition-all focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
          />
        </div>

        <button
          type="submit"
          disabled={!newTaskInput.trim()}
          className="flex h-10 items-center justify-center gap-1.5 rounded-xl bg-[var(--accent)] px-4 text-xs font-bold text-[#17100b] transition-all hover:bg-[#ffb076] disabled:opacity-40 disabled:pointer-events-none shrink-0"
        >
          <Plus size={14} weight="bold" />
          <span>Add Goal</span>
        </button>
      </form>
    </section>
  );
}
