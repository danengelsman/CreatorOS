import React, { useState, useEffect } from 'react';
import { Target, CaretRight as ChevronRight, PenNib as PenTool, CheckCircle as CheckCircle2 } from '@phosphor-icons/react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { authorizedFetch } from '../firebase';

const formatNumber = (num: number) => {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toLocaleString();
};

export default function Dashboard({ brand, setActiveTab, user, projects = [] }: { brand: any, setActiveTab: (tab: string) => void, user: any, projects?: any[] }) {
  const firstName = user?.displayName?.split(' ')?.[0] || 'Creator';
  const [summary, setSummary] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const loadSummary = async () => {
      try {
        const res = await authorizedFetch('/api/analytics/summary');
        if (isMounted && res && res.success) {
          setSummary(res.summary);
        }
      } catch (err) {
        console.warn('Analytics summary note:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    if (user) {
      loadSummary();
    } else {
      setIsLoading(false);
    }

    return () => { isMounted = false; };
  }, [user]);

  const hasFollowers = summary && summary.totalFollowers > 0;
  const totalFollowers = summary ? summary.totalFollowers : 0;
  const totalViews = summary ? summary.totalViews : 0;
  const engagementRate = summary ? summary.engagementRate : 0;
  const totalRevenue = summary ? summary.totalRevenue : 0;

  const milestoneBrandKit = !!brand || (summary?.milestones?.brandKit);
  const milestonePostsPublished = projects.length >= 5 || (summary?.milestones?.postsPublished);
  const milestoneFollowersReached = totalFollowers >= 100 || (summary?.milestones?.followersReached);

  let completedMilestones = 0;
  if (milestoneBrandKit) completedMilestones++;
  if (milestonePostsPublished) completedMilestones++;
  if (milestoneFollowersReached) completedMilestones++;

  const goalsCompletionPercentage = Math.round((completedMilestones / 3) * 100);

  return (
    <div className="space-y-8 pb-20">
      {/* Header */}
      <h1 className="font-serif text-[36px] font-semibold tracking-[-0.015em] text-[var(--label-primary)] px-1 pt-4">
        Hi, {firstName}
      </h1>

      {/* Primary Metric Card */}
      <section className="bg-[var(--bg-tertiary)] ios-card overflow-hidden">
        <div className="p-6">
          <span className="ios-label px-0 mb-4">Active Momentum</span>
          
          <div className="mb-6">
            <div className="text-[28px] font-bold tracking-tight leading-tight mb-2 text-[var(--label-primary)]">
              {hasFollowers ? (
                <>Your real audience stands at <span className="font-serif italic font-normal">{formatNumber(totalFollowers)} creators</span>.</>
              ) : (
                <>Connect your channels to track <span className="font-serif italic font-normal">real metrics</span>.</>
              )}
            </div>
            <p className="text-[var(--label-secondary)] text-[17px] leading-snug">
              {hasFollowers ? (
                `You have accumulated ${totalViews.toLocaleString()} views across your connected platforms.`
              ) : (
                "Go to your Profile tab to securely link YouTube, TikTok, or other networks via OAuth and start tracking your actual growth."
              )}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 py-6 border-t border-[var(--separator)]">
            <div className="flex flex-col">
              <span className="ios-label px-0">Total Reach</span>
              <span className="text-[22px] font-bold">{formatNumber(totalViews)}</span>
            </div>
            <div className="flex flex-col">
              <span className="ios-label px-0">Engagement Rate</span>
              <span className="text-[22px] font-bold">{engagementRate}%</span>
            </div>
          </div>
        </div>
      </section>

      {/* Goals Inset Grouped List */}
      <section>
        <span className="ios-label">Goals & Progress</span>
        <div className="bg-[var(--bg-tertiary)] ios-card overflow-hidden divide-y divide-[var(--separator)]">
           <div className="p-4 flex items-center justify-between ios-card-clickable transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[var(--system-green)] flex items-center justify-center text-white">
                  <Target size={18} strokeWidth={1.5} />
                </div>
                <div className="flex flex-col">
                  <span className="font-semibold text-[17px]">First Dollar Goal</span>
                  <span className="text-[13px] text-[var(--label-secondary)]">{goalsCompletionPercentage}% Completed</span>
                </div>
              </div>
              <ChevronRight size={18} strokeWidth={1.5} className="text-[var(--label-tertiary)]" />
           </div>
           
           <div className="p-5 flex flex-col gap-5">
              <div className="w-full h-1.5 bg-[var(--bg-secondary)] rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${goalsCompletionPercentage}%` }}
                  className="h-full bg-[var(--accent)]"
                />
              </div>
              <div className="space-y-4">
                <MilestoneItem label="Brand Kit Complete" completed={milestoneBrandKit} />
                <MilestoneItem label="5 Posts Published" completed={milestonePostsPublished} />
                <MilestoneItem label="100 Followers Reached" completed={milestoneFollowersReached} />
              </div>
           </div>
        </div>
      </section>

      {/* Recent Projects Inset Grouped List */}
      <section>
        <div className="flex items-center justify-between pr-4">
          <span className="ios-label uppercase">Recent Projects</span>
          <button onClick={() => setActiveTab('create')} className="ios-button ios-button-gray px-4">See All</button>
        </div>
        <div className="bg-[var(--bg-tertiary)] ios-card overflow-hidden divide-y divide-[var(--separator)]">
           {projects.length > 0 ? projects.slice(0, 3).map((project) => (
             <div 
               key={project.id} 
               onClick={() => setActiveTab('create')}
               className="p-4 flex items-center justify-between ios-card-clickable transition-colors"
             >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-[var(--bg-secondary)] flex items-center justify-center flex-shrink-0">
                    <PenTool size={20} strokeWidth={1.5} className="text-[var(--label-secondary)]" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="font-semibold text-[17px] truncate">{project.name}</span>
                    <span className="text-[13px] text-[var(--label-secondary)] truncate">
                      {project.data?.platform || 'Project'} • {project.createdAt?.toDate ? project.createdAt.toDate().toLocaleDateString() : 'Just now'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                   {project.data?.score && (
                     <span className="text-[13px] font-bold text-[var(--system-green)]">{project.data.score}%</span>
                   )}
                   <ChevronRight size={18} strokeWidth={1.5} className="text-[var(--label-tertiary)]" />
                </div>
             </div>
           )) : (
             <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
               <div className="w-16 h-16 mb-5 rounded-full flex items-center justify-center" 
                    style={{background: 'color-mix(in srgb, var(--accent) 8%, transparent)'}}>
                 <PenTool size={26} strokeWidth={1.5} style={{color: 'var(--accent)'}} />
               </div>
               <p className="font-serif text-[20px] mb-1.5 text-[var(--label-primary)]">
                 A blank workshop
               </p>
               <p className="text-[15px] text-[var(--label-secondary)] max-w-[280px] leading-snug">
                 Your first project is waiting to be made.
               </p>
             </div>
           )}
        </div>
      </section>

      {/* Metrics Grid */}
      <section>
        <span className="ios-label">Key Performance</span>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <AnalyticsCard 
            title="Audience" 
            value={formatNumber(totalFollowers)} 
            change={hasFollowers ? "+100%" : "0%"} 
            trend="up"
          />
          <AnalyticsCard 
            title="Reach" 
            value={formatNumber(totalViews)} 
            change={totalViews > 0 ? "+100%" : "0%"} 
            trend="up"
          />
          <AnalyticsCard 
            title="Engagement" 
            value={`${engagementRate}%`} 
            change={engagementRate > 0 ? "+100%" : "0%"} 
            trend="up"
          />
          <AnalyticsCard 
            title="Revenue" 
            value={`$${totalRevenue}`} 
            change={totalRevenue > 0 ? "+100%" : "0%"} 
            trend="up"
          />
        </div>
      </section>
    </div>
  );
}

function AnalyticsCard({ title, value, change, trend }: any) {
  return (
    <div className="bg-[var(--bg-tertiary)] p-4 rounded-[12px] ios-card flex flex-col gap-1">
      <span className="text-[13px] font-medium text-[var(--label-secondary)] truncate">{title}</span>
      <span className="text-[22px] font-bold tracking-tight">{value}</span>
      <span className={cn(
        "text-[12px] font-bold",
        trend === 'up' ? "text-[var(--accent)]" : "text-[var(--system-red)]"
      )}>
        {change}
      </span>
    </div>
  );
}

function MilestoneItem({ label, completed }: { label: string, completed: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className={cn(
        "w-5 h-5 rounded-full flex items-center justify-center transition-colors shadow-sm",
        completed ? "bg-[var(--accent)]" : "bg-[var(--separator)]"
      )}>
        {completed && <CheckCircle2 className="w-3 h-3 text-white" strokeWidth={1.5} />}
      </div>
      <span className={cn("text-[15px] font-medium", completed ? "text-[var(--label-primary)]" : "text-[var(--label-secondary)]")}>
        {label}
      </span>
    </div>
  );
}
