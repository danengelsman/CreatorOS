import React, { useState, useEffect, useRef } from 'react';
import html2canvas from 'html2canvas';
import { motion } from 'motion/react';
import { 
  CurrencyDollar, 
  TrendUp, 
  Users, 
  ChartBar, 
  Star, 
  CheckCircle, 
  ShareNetwork,
  LockKey
} from '@phosphor-icons/react';
import { cn } from '../lib/utils';
import { authorizedFetch } from '../firebase';

const formatNumber = (num: number) => {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toLocaleString();
};

export default function FirstDollarDashboard({ user }: { user: any }) {
  const [sharingMilestone, setSharingMilestone] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [summary, setSummary] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isMounted = true;
    const loadSummary = async () => {
      try {
        const res = await authorizedFetch('/api/analytics/summary');
        if (isMounted && res && res.success) {
          setSummary(res.summary);
        }
      } catch (err) {
        console.warn('First dollar summary note:', err);
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

  const totalFollowers = summary ? summary.totalFollowers : 0;
  const projectsCount = summary ? summary.projects.total : 0;
  const engagementRate = summary ? summary.engagementRate : 0;

  const metrics = [
    { label: 'Total Followers', value: formatNumber(totalFollowers), icon: Users, color: 'text-blue-500' },
    { label: 'Content Output', value: `${projectsCount} Posts`, icon: ChartBar, color: 'text-purple-500' },
    { label: 'Avg Engagement', value: `${engagementRate}%`, icon: TrendUp, color: 'text-green-500' }
  ];

  const revenueStreams = summary?.revenueStreams || [
    { name: 'Ads', projected: '$0', status: 'Locked', progress: 10 },
    { name: 'Affiliates', projected: '$0', status: 'Planning', progress: 20 },
    { name: 'Sponsorships', projected: '$0', status: 'Locked', progress: 5 },
    { name: 'Digital Products', projected: '$0', status: 'Planning', progress: 40 }
  ];

  const milestones = summary?.gamifiedRoadmap || [
    { id: 1, title: 'First 100 Followers', status: 'in-progress', progress: 0 },
    { id: 2, title: 'First 5 Published Posts', status: 'in-progress', progress: 0 },
    { id: 3, title: 'First Monetization Effort', status: 'locked', progress: 0 }
  ];

  const handleShare = async (ms: any) => {
    setIsGenerating(true);
    setSharingMilestone(ms);
    
    setTimeout(async () => {
      if (cardRef.current) {
        try {
          const canvas = await html2canvas(cardRef.current, {
             backgroundColor: null,
             scale: 2
          });
          const dataUrl = canvas.toDataURL('image/png');
          const link = document.createElement('a');
          link.download = `creator-os-achievement-${ms.title.toLowerCase().replace(/\s+/g, '-')}.png`;
          link.href = dataUrl;
          link.click();
        } catch (err) {
          console.error("Failed to generate image", err);
        }
      }
      setIsGenerating(false);
      setSharingMilestone(null);
    }, 100);
  };

  return (
    <div className="space-y-8 pb-12 relative">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-[var(--label-primary)] flex items-center gap-3">
          <CurrencyDollar className="text-[var(--accent)]" weight="duotone" />
          First Dollar Dashboard
        </h1>
        <p className="text-[var(--label-secondary)]">Track your progress toward your first online earnings.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {metrics.map((m, i) => (
          <div key={i} className="ios-card p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className={cn("p-2 rounded-lg bg-[var(--bg-secondary)]", m.color)}>
                <m.icon size={24} weight="duotone" />
              </div>
              <span className="text-[var(--label-secondary)] font-medium">{m.label}</span>
            </div>
            <div className="text-3xl font-bold">{m.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-4">
          <h2 className="text-xl font-bold">Projected Revenue Streams</h2>
          <div className="ios-card p-5 space-y-4">
            {revenueStreams.map((stream, i) => (
              <div key={i} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-medium">{stream.name}</span>
                  <span className="text-[var(--label-secondary)]">{stream.projected}/mo</span>
                </div>
                <div className="h-2 bg-[var(--bg-primary)] rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-[var(--accent)] rounded-full transition-all duration-1000" 
                    style={{ width: `${stream.progress}%` }}
                  />
                </div>
                <div className="text-xs text-[var(--label-tertiary)] flex items-center gap-1">
                  {stream.progress === 100 ? <CheckCircle size={12} className="text-green-500" /> : <LockKey size={12} />}
                  {stream.status}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-bold">Gamified Roadmap</h2>
          <div className="space-y-4">
            {milestones.map((ms, i) => (
              <div key={ms.id} className={cn("ios-card p-5 flex flex-col gap-4 border-l-4", ms.progress > 0 ? "border-[var(--accent)]" : "border-[var(--separator)]")}>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className={cn("p-2 rounded-full", ms.progress > 0 ? "bg-[var(--accent)]/10 text-[var(--accent)]" : "bg-[var(--bg-secondary)] text-[var(--label-tertiary)]")}>
                      <Star size={20} weight={ms.progress > 0 ? "fill" : "regular"} />
                    </div>
                    <span className="font-bold">{ms.title}</span>
                  </div>
                  {ms.progress === 100 && (
                    <button 
                      onClick={() => handleShare(ms)}
                      disabled={isGenerating}
                      className="ios-button text-xs py-1 px-3 flex items-center gap-1"
                    >
                      {isGenerating && sharingMilestone?.id === ms.id ? (
                        <span className="animate-spin w-3 h-3 border-2 border-current border-t-transparent rounded-full" />
                      ) : (
                        <ShareNetwork size={14} />
                      )}
                      {isGenerating && sharingMilestone?.id === ms.id ? 'Generating...' : 'Share'}
                    </button>
                  )}
                </div>
                <div className="h-1.5 bg-[var(--bg-primary)] rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-[var(--accent)] rounded-full transition-all" 
                    style={{ width: `${ms.progress}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Hidden Achievement Card for Canvas Generation */}
      <div className="absolute top-[-9999px] left-[-9999px]">
        <div 
          ref={cardRef} 
          className="w-[800px] h-[450px] flex items-center justify-center p-10 bg-gradient-to-br from-gray-900 to-black text-white relative overflow-hidden"
          style={{ fontFamily: 'Inter, sans-serif' }}
        >
          {/* Abstract background shapes */}
          <div className="absolute top-[-20%] right-[-10%] w-[400px] h-[400px] bg-purple-500/20 rounded-full blur-[80px]" />
          <div className="absolute bottom-[-20%] left-[-10%] w-[300px] h-[300px] bg-blue-500/20 rounded-full blur-[80px]" />
          
          <div className="z-10 flex flex-col items-center justify-center space-y-6 text-center border border-white/10 bg-black/40 backdrop-blur-md p-12 rounded-3xl w-full h-full shadow-2xl">
            <div className="bg-gradient-to-tr from-yellow-400 to-orange-500 p-4 rounded-2xl shadow-lg">
              <Star size={48} weight="fill" className="text-white" />
            </div>
            <div className="space-y-2">
              <h2 className="text-sm font-bold tracking-widest uppercase text-gray-400">CreatorOS Achievement Unlocked</h2>
              <h1 className="text-5xl font-black tracking-tight text-white">{sharingMilestone?.title}</h1>
            </div>
            <div className="pt-6 mt-6 border-t border-white/10 flex items-center gap-4 text-gray-300">
              <CurrencyDollar size={24} weight="duotone" className="text-yellow-400" />
              <span className="font-medium text-lg">First Dollar Dashboard</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
