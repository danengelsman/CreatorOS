import React, { useState, useRef, useEffect } from 'react';
import { ChartBar as BarChart3, ChartLine as LineChart, CurrencyDollar as DollarSign, ChartPie as PieChart, ArrowUpRight, DownloadSimple as Download, Calendar, CaretDown as ChevronDown, Sparkle as Sparkles, CaretRight as ChevronRight, Pulse as Activity, TrendUp as TrendingUp, Brain, CalendarCheck, WarningCircle } from '@phosphor-icons/react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  Line,
  ComposedChart,
  Legend
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { authorizedFetch, db } from '../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { startOfWeek, endOfWeek, subWeeks, format, isWithinInterval } from 'date-fns';

const DEMO_PROJECTS = [
  // 5 weeks ago
  { status: 'Published', scheduledDate: subWeeks(new Date(), 5) },
  { status: 'Published', scheduledDate: subWeeks(new Date(), 5) },
  // 4 weeks ago
  { status: 'Published', scheduledDate: subWeeks(new Date(), 4) },
  { status: 'Published', scheduledDate: subWeeks(new Date(), 4) },
  { status: 'Published', scheduledDate: subWeeks(new Date(), 4) },
  // 3 weeks ago
  { status: 'Published', scheduledDate: subWeeks(new Date(), 3) },
  { status: 'Published', scheduledDate: subWeeks(new Date(), 3) },
  { status: 'Published', scheduledDate: subWeeks(new Date(), 3) },
  { status: 'Published', scheduledDate: subWeeks(new Date(), 3) },
  // 2 weeks ago
  { status: 'Published', scheduledDate: subWeeks(new Date(), 2) },
  { status: 'Published', scheduledDate: subWeeks(new Date(), 2) },
  { status: 'Scheduled', scheduledDate: subWeeks(new Date(), 2) },
  // 1 week ago
  { status: 'Published', scheduledDate: subWeeks(new Date(), 1) },
  { status: 'Scheduled', scheduledDate: subWeeks(new Date(), 1) },
  { status: 'Scheduled', scheduledDate: subWeeks(new Date(), 1) },
  { status: 'Draft', scheduledDate: subWeeks(new Date(), 1) },
  // This week
  { status: 'Published', scheduledDate: new Date() },
  { status: 'Scheduled', scheduledDate: new Date() },
  { status: 'Scheduled', scheduledDate: new Date() },
  { status: 'Draft', scheduledDate: new Date() },
];

const getWeeklyGrowthData = (projectsList: any[]) => {
  const weeks = [];
  const now = new Date();
  
  for (let i = 5; i >= 0; i--) {
    const targetDate = subWeeks(now, i);
    const start = startOfWeek(targetDate, { weekStartsOn: 1 });
    const end = endOfWeek(targetDate, { weekStartsOn: 1 });
    
    const weeklyProjects = projectsList.filter(p => {
      const pDate = p.scheduledDate || p.createdAt;
      if (!pDate) return false;
      try {
        const dateObj = pDate instanceof Date ? pDate : new Date(pDate);
        return isWithinInterval(dateObj, { start, end });
      } catch {
        return false;
      }
    });

    const drafts = weeklyProjects.filter(p => p.status === 'Draft').length;
    const scheduled = weeklyProjects.filter(p => p.status === 'Scheduled').length;
    const published = weeklyProjects.filter(p => p.status === 'Published').length;

    weeks.push({
      name: `Wk ${format(start, 'd/M')}`,
      Draft: drafts,
      Scheduled: scheduled,
      Published: published,
      total: weeklyProjects.length,
    });
  }

  let cumulative = 0;
  return weeks.map(w => {
    cumulative += w.total;
    return {
      ...w,
      Cumulative: cumulative,
    };
  });
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[var(--bg-tertiary)] border border-[var(--separator)] p-3 rounded-xl shadow-lg text-xs space-y-1.5 backdrop-blur-md">
        <p className="font-semibold text-[var(--label-primary)]">{label}</p>
        {payload.map((item: any, idx: number) => {
          const color = item.name === 'Published' ? '#0FA968' : item.name === 'Scheduled' ? 'var(--accent)' : item.name === 'Draft' ? '#8A8175' : 'var(--accent)';
          return (
            <div key={idx} className="flex items-center gap-6 justify-between">
              <span className="flex items-center gap-1.5" style={{ color }}>
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                {item.name}:
              </span>
              <span className="font-bold text-[var(--label-primary)]">{item.value}</span>
            </div>
          );
        })}
      </div>
    );
  }
  return null;
};

export default function Intelligence({ user }: { user: any }) {
  const [youtubeStats, setYoutubeStats] = useState<any>(null);
  const [tiktokStats, setTiktokStats] = useState<any>(null);
  const [summary, setSummary] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const [projects, setProjects] = useState<any[]>([]);
  const [isProjectsLoading, setIsProjectsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchAllStats = async () => {
      try {
        const res = await authorizedFetch('/api/analytics/summary');
        if (isMounted && res && res.success) {
          setSummary(res.summary);
          if (res.summary.youtube && (res.summary.youtube.views > 0 || res.summary.youtube.subscribers > 0)) {
            setYoutubeStats(res.summary.youtube);
          }
          if (res.summary.tiktok && (res.summary.tiktok.views > 0 || res.summary.tiktok.followers > 0)) {
            setTiktokStats(res.summary.tiktok);
          }
        }
      } catch (error) {
        console.warn('Analytics summary note in Reports:', error);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    if (user) {
      fetchAllStats();
    } else {
      setIsLoading(false);
    }

    return () => { isMounted = false; };
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const fetchProjects = async () => {
      try {
        const q = query(
          collection(db, 'projects'),
          where('userId', '==', user.uid)
        );
        const snapshot = await getDocs(q);
        const fetched = snapshot.docs
          .filter(doc => doc.data().type === 'content')
          .map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            scheduledDate: data.scheduledDate ? data.scheduledDate.toDate() : null,
            createdAt: data.createdAt ? data.createdAt.toDate() : null
          };
        });
        setProjects(fetched);
      } catch (error) {
        console.error('Failed to fetch projects for reports:', error);
      } finally {
        setIsProjectsLoading(false);
      }
    };
    fetchProjects();
  }, [user]);

  const currentProjectsList = projects;
  const chartData = getWeeklyGrowthData(currentProjectsList);
  
  const totalPublished = currentProjectsList.filter(p => p.status === 'Published').length;
  const totalScheduled = currentProjectsList.filter(p => p.status === 'Scheduled').length;
  const totalDrafts = currentProjectsList.filter(p => p.status === 'Draft').length;
  const grandTotal = currentProjectsList.length;

  return (
    <div className="space-y-8 pb-20">
      <h1 className="font-serif text-[36px] font-semibold tracking-[-0.015em] text-[var(--label-primary)] px-1 pt-4">Intelligence</h1>

      {/* YouTube Overview Analytics Card */}
      <section className="bg-[var(--bg-tertiary)] ios-card overflow-hidden">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="ios-label px-0 mb-0">YouTube Performance</span>
            <div className="bg-red-500/10 text-red-500 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3">
                 <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
              </svg>
              YouTube
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
            <div className="flex flex-col gap-1">
              <span className="text-[13px] text-[var(--label-secondary)] font-semibold uppercase tracking-wider">Total Views</span>
              <div className="flex flex-col">
                <span className="text-[34px] font-bold tracking-tight leading-none text-[var(--label-primary)]">
                  {youtubeStats ? youtubeStats.views.toLocaleString() : '---'}
                </span>
              </div>
            </div>
            
            <div className="flex flex-col gap-1">
              <span className="text-[13px] text-[var(--label-secondary)] font-semibold uppercase tracking-wider">Subscribers</span>
              <div className="flex flex-col">
                <span className="text-[34px] font-bold tracking-tight leading-none text-[var(--label-primary)]">
                  {youtubeStats ? youtubeStats.subscribers.toLocaleString() : '---'}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-[13px] text-[var(--label-secondary)] font-semibold uppercase tracking-wider">Videos</span>
              <div className="flex flex-col">
                <span className="text-[34px] font-bold tracking-tight leading-none text-[var(--label-primary)]">
                  {youtubeStats ? youtubeStats.videos.toLocaleString() : '---'}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
             <div className="h-[200px] w-full bg-[var(--bg-secondary)] rounded-xl p-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={youtubeStats ? [
                    { name: 'Views', value: youtubeStats.views },
                    { name: 'Subscribers', value: youtubeStats.subscribers },
                    { name: 'Videos', value: youtubeStats.videos * 10 }
                  ] : [
                    { name: 'M', value: 0 },
                    { name: 'T', value: 0 },
                    { name: 'W', value: 0 },
                    { name: 'T', value: 0 },
                    { name: 'F', value: 0 },
                    { name: 'S', value: 0 },
                    { name: 'S', value: 0 },
                  ]} barGap={8} barCategoryGap="20%">
                    <defs>
                      <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--accent)" stopOpacity={1} />
                        <stop offset="100%" stopColor="var(--accent)" stopOpacity={0.6} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} stroke="var(--label-tertiary)" strokeOpacity={0.08} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--label-secondary)' }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--label-secondary)' }} dx={-10} />
                    <Bar dataKey="value" fill="url(#barGradient)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
             </div>
          </div>
        </div>

        <div className="border-t border-[var(--separator)] grid grid-cols-2 divide-x divide-[var(--separator)] bg-[var(--bg-secondary)]">
           <div className="p-4 flex flex-col gap-1 items-center justify-center">
              <span className="ios-label px-0">TT Views</span>
              <span className="text-[20px] font-bold">{tiktokStats?.views?.toLocaleString() || '---'}</span>
           </div>
           <div className="p-4 flex flex-col gap-1 items-center justify-center">
              <span className="ios-label px-0">TT Followers</span>
              <span className="text-[20px] font-bold">{tiktokStats?.followers?.toLocaleString() || '---'}</span>
           </div>
        </div>
      </section>

      {/* Weekly Content Output Growth Graph */}
      <section className="bg-[var(--bg-tertiary)] ios-card overflow-hidden">
        <div className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <span className="ios-label px-0 mb-1">Production Velocity & Growth</span>
              <h2 className="text-[13px] text-[var(--label-secondary)] font-medium leading-normal">
                Weekly output compared to cumulative content library growth.
              </h2>
            </div>
            
            <div className="flex items-center gap-2 self-start sm:self-center">
              <div className="bg-green-500/10 text-green-500 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5">
                <CalendarCheck size={14} weight="fill" />
                Live Velocity
              </div>
            </div>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6 bg-[var(--bg-secondary)] p-4 rounded-xl border border-[var(--separator)]">
            <div className="flex flex-col">
              <span className="text-[11px] text-[var(--label-secondary)] font-semibold uppercase tracking-wider">Total Output</span>
              <span className="text-[24px] font-bold text-[var(--label-primary)]">{grandTotal}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[11px] text-[var(--label-secondary)] font-semibold uppercase tracking-wider">Published</span>
              <span className="text-[24px] font-bold text-green-500">{totalPublished}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[11px] text-[var(--label-secondary)] font-semibold uppercase tracking-wider">Scheduled</span>
              <span className="text-[24px] font-bold text-[var(--accent)]">{totalScheduled}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[11px] text-[var(--label-secondary)] font-semibold uppercase tracking-wider">In Progress</span>
              <span className="text-[24px] font-bold text-[#8A8175]">{totalDrafts}</span>
            </div>
          </div>

          <div className="h-[280px] w-full bg-[var(--bg-secondary)] rounded-xl p-4 relative">
            {isProjectsLoading ? (
               <div className="absolute inset-0 flex items-center justify-center text-xs text-[var(--label-secondary)]">
                 Loading production metrics...
               </div>
            ) : (
               <ResponsiveContainer width="100%" height="100%">
                 <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                   <CartesianGrid vertical={false} stroke="var(--label-tertiary)" strokeOpacity={0.08} />
                   <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--label-secondary)' }} dy={10} />
                   <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--label-secondary)' }} dx={-5} />
                   <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--label-secondary)' }} dx={5} />
                   <Tooltip content={<CustomTooltip />} />
                   <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: 11, fill: 'var(--label-secondary)' }} />
                   
                   {/* Stacked Bars representing weekly publication metrics */}
                   <Bar yAxisId="left" dataKey="Published" name="Published" stackId="a" fill="#0FA968" radius={[0, 0, 0, 0]} barSize={24} />
                   <Bar yAxisId="left" dataKey="Scheduled" name="Scheduled" stackId="a" fill="var(--accent)" radius={[0, 0, 0, 0]} barSize={24} />
                   <Bar yAxisId="left" dataKey="Draft" name="Draft" stackId="a" fill="#8A8175" radius={[4, 4, 0, 0]} barSize={24} />
                   
                   {/* Composed Line representing cumulative content growth trajectory */}
                   <Line yAxisId="right" type="monotone" dataKey="Cumulative" name="Library Growth (Cumulative)" stroke="var(--accent)" strokeWidth={2.5} dot={{ r: 3, strokeWidth: 1.5, fill: 'var(--bg-tertiary)' }} activeDot={{ r: 5 }} />
                 </ComposedChart>
               </ResponsiveContainer>
            )}
          </div>

          {projects.length === 0 && (
            <div className="mt-4 p-3 bg-amber-500/5 rounded-xl border border-amber-500/10 flex items-start gap-2.5">
              <WarningCircle size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-xs font-semibold text-[var(--label-primary)]">Start Planning Your Content</p>
                <p className="text-[11px] text-[var(--label-secondary)] leading-relaxed">
                  You haven't scheduled or created any content items in your workspace yet. Head over to the <span className="font-semibold text-[var(--accent)]">Calendar</span> or <span className="font-semibold text-[var(--accent)]">Create</span> tab to start mapping out your production plan and build your growth velocity!
                </p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Intelligence Insights Inset Grouped List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <section>
          <span className="ios-label">AI Insights</span>
          <div className="bg-[var(--bg-tertiary)] ios-card overflow-hidden divide-y divide-[var(--separator)]">
             <div className="p-4 flex items-center justify-between active:bg-[var(--separator)] transition-colors cursor-pointer">
                <div className="flex items-center gap-3">
                   <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{background: 'color-mix(in srgb, var(--accent) 12%, transparent)', color: 'var(--accent)'}}>
                      <Brain size={18} strokeWidth={1.5} />
                   </div>
                   <div className="flex flex-col">
                      <span className="font-semibold text-[17px]">Engagement Optimization</span>
                      <span className="text-[13px] text-[var(--label-secondary)]">Create more short-form videos to scale.</span>
                   </div>
                </div>
                <ChevronRight size={18} strokeWidth={1.5} className="text-[var(--label-tertiary)]" />
             </div>
             
             <div className="p-4 flex items-center justify-between active:bg-[var(--separator)] transition-colors cursor-pointer">
                <div className="flex items-center gap-3">
                   <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{background: 'color-mix(in srgb, var(--system-green) 12%, transparent)', color: 'var(--system-green)'}}>
                      <Activity size={18} strokeWidth={1.5} />
                   </div>
                   <div className="flex flex-col">
                      <span className="font-semibold text-[17px]">Optimal Timing</span>
                      <span className="text-[13px] text-[var(--label-secondary)]">Your audience peaks at 7PM EST.</span>
                   </div>
                </div>
                <ChevronRight size={18} strokeWidth={1.5} className="text-[var(--label-tertiary)]" />
             </div>
          </div>
        </section>

        <section>
           <span className="ios-label">Strategic Forecast</span>
           <div className="bg-[var(--bg-tertiary)] ios-card overflow-hidden divide-y divide-[var(--separator)] p-6 flex flex-col items-center text-center gap-4">
              <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{background: 'color-mix(in srgb, var(--accent) 12%, transparent)', color: 'var(--accent)'}}>
                 <TrendingUp size={24} strokeWidth={1.5} />
              </div>
              <div className="space-y-1">
                 <span className="text-[34px] font-bold tracking-tight text-[var(--accent)]">
                   ${summary ? summary.totalRevenue : 0}
                 </span>
                 <p className="text-[13px] text-[var(--label-secondary)] font-medium leading-tight">
                    Projected monthly revenue based on current actual connected channel audience metrics.
                 </p>
              </div>
              <button className="ios-button ios-button-tinted w-full mt-4">
                View Monetization Plan
              </button>
           </div>
        </section>
      </div>

      <section className="pt-4">
        <button className="ios-button ios-button-gray w-full mt-8">
          <Download size={17} strokeWidth={1.5} className="mr-2" />
          Export Intelligence PDF
        </button>
      </section>
    </div>
  );
}
