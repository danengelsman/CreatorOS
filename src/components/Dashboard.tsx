import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  CaretRight as ChevronRight,
  ChartLineUp,
  CheckCircle as CheckCircle2,
  CurrencyDollar,
  Eye,
  Lightning,
  PenNib as PenTool,
  Sparkle,
  Target,
  TrendUp,
  Users,
} from '@phosphor-icons/react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { authorizedFetch } from '../firebase';
import DailyGoalTracker from './DailyGoalTracker';

const formatNumber = (num: number) => {
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toLocaleString();
};

const focusRing = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[#08080d]';

export default function Dashboard({ brand, setActiveTab, user, projects = [] }: { brand: any, setActiveTab: (tab: string) => void, user: any, projects?: any[] }) {
  const firstName = user?.displayName?.split(' ')?.[0] || 'Creator';
  const [summary, setSummary] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [analyticsUnavailable, setAnalyticsUnavailable] = useState(false);
  const [loadKey, setLoadKey] = useState(0);

  useEffect(() => {
    let isMounted = true;

    const loadSummary = async () => {
      setIsLoading(true);
      setAnalyticsUnavailable(false);
      try {
        const res = await authorizedFetch('/api/analytics/summary');
        if (isMounted && res?.success) {
          setSummary(res.summary);
        }
      } catch (err) {
        console.warn('Analytics summary note:', err);
        if (isMounted) setAnalyticsUnavailable(true);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    if (user) loadSummary();
    else setIsLoading(false);

    return () => { isMounted = false; };
  }, [user, loadKey]);

  const totalFollowers = summary?.totalFollowers || 0;
  const totalViews = summary?.totalViews || 0;
  const engagementRate = summary?.engagementRate || 0;
  const totalRevenue = summary?.totalRevenue || 0;
  const hasSignal = totalFollowers > 0 || totalViews > 0 || engagementRate > 0 || totalRevenue > 0;

  const milestoneBrandKit = !!brand || !!summary?.milestones?.brandKit;
  const milestonePostsPublished = projects.length >= 5 || !!summary?.milestones?.postsPublished;
  const milestoneFollowersReached = totalFollowers >= 100 || !!summary?.milestones?.followersReached;
  const milestones = [
    { label: 'Brand system established', completed: milestoneBrandKit },
    { label: 'Publish five pieces', completed: milestonePostsPublished },
    { label: 'Reach your first 100 followers', completed: milestoneFollowersReached },
  ];
  const completedMilestones = milestones.filter((item) => item.completed).length;
  const goalsCompletionPercentage = Math.round((completedMilestones / milestones.length) * 100);

  const { today, dayPart } = useMemo(() => {
    const now = new Date();
    const hour = now.getHours();
    return {
      today: new Intl.DateTimeFormat(undefined, {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      }).format(now),
      dayPart: hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening',
    };
  }, []);

  const nextMove = !milestoneBrandKit
    ? { title: 'Define your brand system', description: 'Lock in your positioning, visual language, and voice before you publish.', action: 'Open Brand Studio', tab: 'brand' }
    : projects.length === 0
      ? { title: 'Create your first project', description: 'Turn your brand strategy into a publish-ready piece of content.', action: 'Start creating', tab: 'create' }
      : !hasSignal
        ? { title: 'Connect a growth channel', description: 'Bring live audience signals into your command center.', action: 'Connect channels', tab: 'profile' }
        : { title: 'Build on your momentum', description: 'Your foundation is active. Create the next piece that compounds your reach.', action: 'Open studio', tab: 'create' };

  const metricCards = [
    { title: 'Audience', value: hasSignal ? formatNumber(totalFollowers) : '—', detail: hasSignal ? 'Connected followers' : 'Connect to activate', icon: Users, accent: '#a78bfa' },
    { title: 'Reach', value: hasSignal ? formatNumber(totalViews) : '—', detail: hasSignal ? 'Verified views' : 'Waiting for signal', icon: Eye, accent: '#67e8f9' },
    { title: 'Engagement', value: hasSignal ? `${engagementRate}%` : '—', detail: hasSignal ? 'Across your network' : 'Waiting for signal', icon: TrendUp, accent: '#86efac' },
    { title: 'Revenue', value: hasSignal ? `$${formatNumber(totalRevenue)}` : '—', detail: hasSignal ? 'Tracked earnings' : 'Ready when you are', icon: CurrencyDollar, accent: '#f4a261' },
  ];

  return (
    <div className="relative isolate pb-20 pt-5 lg:pt-8">
      {/* Ambient studio lighting */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-[-8%] top-[-120px] -z-10 h-[620px] overflow-hidden">
        <div className="absolute left-[8%] top-16 h-72 w-72 rounded-full bg-[#8b5cf6]/[0.13] blur-[110px]" />
        <div className="absolute right-[8%] top-0 h-80 w-80 rounded-full bg-[#f4a261]/[0.10] blur-[120px]" />
        <div className="absolute left-[38%] top-40 h-52 w-52 rounded-full bg-[#22d3ee]/[0.06] blur-[100px]" />
      </div>

      <header className="mb-8 flex flex-col gap-5 px-1 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-white/55">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)] shadow-[0_0_12px_var(--accent)]" />
            Creator command center
          </div>
          <h1 className="font-serif text-[clamp(38px,5vw,64px)] font-bold leading-[0.96] tracking-[-0.05em] text-[var(--label-primary)]">
            Good {dayPart}, <span className="bg-gradient-to-r from-[#fff4e8] via-white to-[#c4b5fd] bg-clip-text text-transparent">{firstName}</span>
          </h1>
          <p className="mt-4 text-[15px] text-[var(--label-secondary)]">{today} · Your next breakthrough starts here.</p>
        </div>
        <button
          type="button"
          onClick={() => setActiveTab('create')}
          className={cn(
            'group inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-[var(--accent)] px-5 text-sm font-bold text-[#17100b] shadow-[0_14px_38px_rgba(244,162,97,0.20)] transition-all hover:-translate-y-0.5 hover:shadow-[0_18px_44px_rgba(244,162,97,0.28)] active:translate-y-0',
            focusRing,
          )}
        >
          <Sparkle size={17} weight="fill" />
          Create something
          <ArrowRight size={16} weight="bold" className="transition-transform group-hover:translate-x-0.5" />
        </button>
      </header>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
        {/* Premium momentum hero */}
        <motion.section
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          className="group relative overflow-hidden rounded-[28px] border border-white/[0.10] bg-[linear-gradient(135deg,rgba(35,30,47,0.96),rgba(15,15,23,0.96)_55%,rgba(34,23,24,0.94))] p-6 shadow-[0_30px_90px_rgba(0,0,0,0.34)] md:p-8 xl:col-span-8"
        >
          <div aria-hidden="true" className="absolute -right-28 -top-28 h-80 w-80 rounded-full border border-[#f4a261]/15 bg-[#f4a261]/[0.06] blur-[1px]" />
          <div aria-hidden="true" className="absolute -right-10 top-14 h-52 w-52 rounded-full border border-white/[0.07]" />
          <div aria-hidden="true" className="absolute bottom-[-45%] left-[20%] h-72 w-72 rounded-full bg-[#8b5cf6]/10 blur-[90px]" />

          <div className="relative z-10 flex min-h-[330px] flex-col justify-between">
            <div>
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/[0.09] bg-black/20 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-[#f7c99c] backdrop-blur-xl">
                <Lightning size={13} weight="fill" />
                Today's focus
              </div>
              <h2 className="max-w-[760px] text-[clamp(30px,4vw,52px)] font-bold leading-[1.02] tracking-[-0.045em] text-white">
                Turn creative momentum into <span className="font-serif italic font-medium text-[#f4a261]">measurable growth.</span>
              </h2>
              <p className="mt-5 max-w-[650px] text-[16px] leading-7 text-white/60">
                {hasSignal
                  ? `Your live creator signals are active${brand?.niche ? ` in ${brand.niche}` : ''}. Keep publishing while the momentum is yours.`
                  : 'Connect your channels to replace guesswork with real audience intelligence—then let CreatorOS show you the next best move.'}
              </p>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => setActiveTab(hasSignal ? 'reports' : 'profile')}
                className={cn('group inline-flex h-11 items-center gap-2 rounded-xl bg-white px-4 text-sm font-bold text-[#111116] transition-all hover:-translate-y-0.5 hover:bg-[#fff8f1]', focusRing)}
              >
                <ChartLineUp size={17} weight="bold" />
                {hasSignal ? 'View live analytics' : 'Connect channels'}
                <ArrowRight size={15} weight="bold" className="transition-transform group-hover:translate-x-0.5" />
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('create')}
                className={cn('inline-flex h-11 items-center gap-2 rounded-xl border border-white/[0.12] bg-white/[0.05] px-4 text-sm font-semibold text-white/80 backdrop-blur-md transition-all hover:border-white/20 hover:bg-white/[0.09] hover:text-white', focusRing)}
              >
                <PenTool size={17} /> Open studio
              </button>
            </div>
          </div>
        </motion.section>

        {/* Creator signal */}
        <motion.section
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
          className="relative overflow-hidden rounded-[28px] border border-white/[0.09] bg-white/[0.035] p-6 shadow-[0_24px_70px_rgba(0,0,0,0.26)] backdrop-blur-xl xl:col-span-4"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/55">Creator signal</p>
              <h3 className="mt-2 text-xl font-bold tracking-tight">{hasSignal ? 'Network is live' : 'Ready for input'}</h3>
            </div>
            <div className={cn('flex h-10 w-10 items-center justify-center rounded-2xl border', hasSignal ? 'border-emerald-300/20 bg-emerald-400/10 text-emerald-300' : 'border-[#f4a261]/20 bg-[#f4a261]/10 text-[#f4a261]')}>
              <TrendUp size={20} weight="duotone" />
            </div>
          </div>

          <div className="relative mt-8 h-28 overflow-hidden rounded-2xl border border-white/[0.06] bg-black/20 px-3 pt-4">
            <div className="absolute inset-x-0 top-1/3 border-t border-dashed border-white/[0.05]" />
            <div className="absolute inset-x-0 top-2/3 border-t border-dashed border-white/[0.05]" />
            <svg aria-hidden="true" viewBox="0 0 320 90" preserveAspectRatio="none" className="h-full w-full">
              <defs>
                <linearGradient id="signalStroke" x1="0" x2="1">
                  <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.25" />
                  <stop offset="60%" stopColor="#f4a261" stopOpacity={hasSignal ? '1' : '0.4'} />
                  <stop offset="100%" stopColor="#67e8f9" stopOpacity={hasSignal ? '0.9' : '0.28'} />
                </linearGradient>
                <linearGradient id="signalFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f4a261" stopOpacity={hasSignal ? '0.22' : '0.08'} />
                  <stop offset="100%" stopColor="#f4a261" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d={hasSignal ? 'M0 76 C32 72 42 58 70 62 C102 67 110 34 142 43 C176 52 188 22 220 31 C250 39 273 15 320 19 L320 90 L0 90 Z' : 'M0 68 C42 68 54 66 92 68 C132 70 144 64 181 66 C218 68 240 61 320 64 L320 90 L0 90 Z'} fill="url(#signalFill)" />
              <path d={hasSignal ? 'M0 76 C32 72 42 58 70 62 C102 67 110 34 142 43 C176 52 188 22 220 31 C250 39 273 15 320 19' : 'M0 68 C42 68 54 66 92 68 C132 70 144 64 181 66 C218 68 240 61 320 64'} fill="none" stroke="url(#signalStroke)" strokeWidth="3" strokeLinecap="round" />
            </svg>
          </div>

          <div className="mt-5 flex items-center justify-between text-sm">
            <span className="text-white/60">{hasSignal ? 'Live audience pulse' : 'Waiting for your first signal'}</span>
            <span className={cn('inline-flex items-center gap-1.5 font-semibold', hasSignal ? 'text-emerald-300' : 'text-[#f4a261]')}>
              <span className="h-1.5 w-1.5 rounded-full bg-current shadow-[0_0_10px_currentColor]" />
              {hasSignal ? 'Synced' : 'Standby'}
            </span>
          </div>

          {analyticsUnavailable && (
            <button type="button" onClick={() => setLoadKey((key) => key + 1)} className={cn('mt-4 text-xs font-semibold text-[#f4a261] hover:text-[#ffd2aa]', focusRing)}>
              Analytics unavailable · Retry sync
            </button>
          )}
        </motion.section>
      </div>

      {/* KPI row */}
      <section aria-label="Key performance metrics" aria-busy={isLoading} className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-5">
        <span className="sr-only" aria-live="polite">
          {isLoading ? 'Loading creator analytics.' : analyticsUnavailable ? 'Creator analytics are temporarily unavailable.' : 'Creator analytics loaded.'}
        </span>
        {metricCards.map((metric, index) => (
          <MetricCard key={metric.title} {...metric} isLoading={isLoading} index={index} />
        ))}
      </section>

      <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-12">
        {/* Goal system */}
        <section className="rounded-[28px] border border-white/[0.09] bg-white/[0.035] p-6 shadow-[0_24px_70px_rgba(0,0,0,0.24)] backdrop-blur-xl md:p-7 xl:col-span-7">
          <div className="flex flex-col gap-6 md:flex-row md:items-center">
            <div className="relative flex h-32 w-32 shrink-0 items-center justify-center">
              <svg aria-label={`${goalsCompletionPercentage}% of first-dollar foundation complete`} className="h-32 w-32 -rotate-90" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="51" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="8" />
                <motion.circle
                  cx="60"
                  cy="60"
                  r="51"
                  fill="none"
                  stroke="url(#goalGradient)"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={320.44}
                  initial={{ strokeDashoffset: 320.44 }}
                  animate={{ strokeDashoffset: 320.44 * (1 - goalsCompletionPercentage / 100) }}
                  transition={{ duration: 1.1, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                />
                <defs>
                  <linearGradient id="goalGradient" x1="0" x2="1">
                    <stop offset="0%" stopColor="#f4a261" />
                    <stop offset="100%" stopColor="#c4b5fd" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute text-center">
                <div className="font-mono text-2xl font-bold text-white">{goalsCompletionPercentage}%</div>
                <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/55">complete</div>
              </div>
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/55">First-dollar foundation</p>
                  <h3 className="mt-2 text-2xl font-bold tracking-tight">Build the system before the scale.</h3>
                </div>
                <Target size={28} weight="duotone" className="shrink-0 text-[#f4a261]" />
              </div>
              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                {milestones.map((milestone) => (
                  <MilestoneItem key={milestone.label} {...milestone} />
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Next best move */}
        <section className="relative overflow-hidden rounded-[28px] border border-[#8b5cf6]/20 bg-[linear-gradient(145deg,rgba(75,47,112,0.22),rgba(16,16,24,0.90))] p-6 shadow-[0_24px_70px_rgba(0,0,0,0.24)] md:p-7 xl:col-span-5">
          <div aria-hidden="true" className="absolute -right-16 -top-16 h-52 w-52 rounded-full bg-[#8b5cf6]/15 blur-[65px]" />
          <div className="relative z-10 flex h-full min-h-[210px] flex-col justify-between">
            <div>
              <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-2xl border border-[#c4b5fd]/20 bg-[#8b5cf6]/15 text-[#c4b5fd]">
                <Sparkle size={22} weight="fill" />
              </div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#c4b5fd]/70">Next best move</p>
              <h3 className="mt-2 text-2xl font-bold tracking-tight">{nextMove.title}</h3>
              <p className="mt-3 max-w-lg text-sm leading-6 text-white/55">{nextMove.description}</p>
            </div>
            <button type="button" onClick={() => setActiveTab(nextMove.tab)} className={cn('group mt-6 inline-flex items-center gap-2 self-start text-sm font-bold text-[#d8ccff] transition-colors hover:text-white', focusRing)}>
              {nextMove.action}
              <ArrowRight size={16} weight="bold" className="transition-transform group-hover:translate-x-1" />
            </button>
          </div>
        </section>
      </div>

      {/* Daily Creator Goal Tracker */}
      <DailyGoalTracker user={user} className="mt-5" />

      {/* Recent work */}
      <section className="mt-5 overflow-hidden rounded-[28px] border border-white/[0.09] bg-white/[0.035] shadow-[0_24px_70px_rgba(0,0,0,0.22)] backdrop-blur-xl">
        <div className="flex items-center justify-between border-b border-white/[0.07] px-6 py-5 md:px-7">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/55">Recent work</p>
            <h3 className="mt-1 text-xl font-bold tracking-tight">Your creative pipeline</h3>
          </div>
          <button type="button" onClick={() => setActiveTab('create')} className={cn('group inline-flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3.5 py-2 text-xs font-bold text-white/70 transition-all hover:bg-white/[0.08] hover:text-white', focusRing)}>
            See all <ChevronRight size={14} className="transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>

        {projects.length > 0 ? (
          <div className="divide-y divide-white/[0.06]">
            {projects.slice(0, 3).map((project) => (
              <button
                type="button"
                key={project.id}
                onClick={() => setActiveTab('create')}
                className={cn('group flex w-full items-center justify-between gap-4 px-6 py-4 text-left transition-colors hover:bg-white/[0.035] md:px-7', focusRing)}
              >
                <div className="flex min-w-0 items-center gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/[0.08] bg-[linear-gradient(145deg,rgba(244,162,97,0.13),rgba(139,92,246,0.08))] text-[#f4a261]">
                    <PenTool size={20} weight="duotone" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-[15px] font-bold text-white">{project.name}</p>
                    <p className="mt-1 truncate text-xs text-white/60">
                      {project.data?.platform || 'CreatorOS project'} · {project.createdAt?.toDate ? project.createdAt.toDate().toLocaleDateString() : 'Just now'}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  {project.data?.score && <span className="font-mono text-xs font-bold text-emerald-300">{project.data.score}%</span>}
                  <ChevronRight size={17} className="text-white/25 transition-all group-hover:translate-x-0.5 group-hover:text-white/60" />
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
            <div className="relative mb-5 flex h-16 w-16 items-center justify-center rounded-[22px] border border-[#f4a261]/20 bg-[#f4a261]/[0.08] text-[#f4a261]">
              <PenTool size={27} weight="duotone" />
              <span aria-hidden="true" className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-[#17151c] bg-[#8b5cf6]" />
            </div>
            <h4 className="text-lg font-bold text-white">Your workshop is ready.</h4>
            <p className="mt-2 max-w-md text-sm leading-6 text-white/60">Start with an idea, a hook, or a blank page. CreatorOS will help shape it into something worth publishing.</p>
            <button type="button" onClick={() => setActiveTab('create')} className={cn('mt-5 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-[#111116] transition-transform hover:-translate-y-0.5', focusRing)}>
              Create first project <ArrowRight size={15} weight="bold" />
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

function MetricCard({ title, value, detail, icon: Icon, accent, isLoading, index }: any) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.42, delay: 0.08 + index * 0.05 }}
      className="group relative overflow-hidden rounded-[22px] border border-white/[0.08] bg-white/[0.03] p-4 shadow-[0_18px_45px_rgba(0,0,0,0.18)] backdrop-blur-lg transition-all hover:-translate-y-1 hover:border-white/[0.14] md:p-5"
    >
      <div aria-hidden="true" className="absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-[0.08] blur-2xl transition-opacity group-hover:opacity-[0.15]" style={{ backgroundColor: accent }} />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[11px] font-bold uppercase tracking-[0.14em] text-white/55">{title}</p>
          {isLoading ? (
            <div className="mt-3 h-8 w-20 animate-pulse rounded-lg bg-white/[0.07]" />
          ) : (
            <p className="mt-2 font-mono text-[clamp(24px,3vw,34px)] font-bold tracking-[-0.04em] text-white">{value}</p>
          )}
          <p className="mt-1 truncate text-[11px] text-white/55 md:text-xs">{detail}</p>
        </div>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/[0.07] bg-black/20" style={{ color: accent }}>
          <Icon size={18} weight="duotone" />
        </div>
      </div>
    </motion.article>
  );
}

function MilestoneItem({ label, completed }: { label: string, completed: boolean }) {
  return (
    <div className={cn('rounded-2xl border p-3.5 transition-colors', completed ? 'border-emerald-300/15 bg-emerald-400/[0.07]' : 'border-white/[0.07] bg-black/15')}>
      <div className={cn('mb-3 flex h-7 w-7 items-center justify-center rounded-full', completed ? 'bg-emerald-300 text-[#092015]' : 'border border-white/[0.10] bg-white/[0.04] text-white/25')}>
        {completed ? <CheckCircle2 size={16} weight="fill" /> : <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      </div>
      <p className={cn('text-xs font-semibold leading-5', completed ? 'text-white/85' : 'text-white/60')}>{label}</p>
    </div>
  );
}
