import React, { useState, useMemo } from 'react';
import { Calendar as CalendarIcon, Plus, CaretLeft as ChevronLeft, CaretRight as ChevronRight, Clock, CheckCircle as CheckCircle2, Stack as Layers, ShareNetwork as Share2, DotsThreeVertical as MoreVertical, Funnel as Filter } from '@phosphor-icons/react';
import { HubIcon } from './IdentityIcons';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

const PLATFORM_COLORS: Record<string, string> = {
  tiktok: 'bg-[#00f2ea] text-black',
  instagram: 'bg-gradient-to-tr from-[#f9ce34] via-[#ee2a7b] to-[#6228d7] text-white',
  youtube: 'bg-[#FF0000] text-white',
  linkedin: 'bg-[#0077b5] text-white',
  twitter: 'bg-[#1DA1F2] text-white',
  multi: 'bg-gradient-to-r from-accent-gold to-accent-emerald text-premium-bg',
};

interface ContentItem {
  id: string;
  title: string;
  platform: string;
  status: 'draft' | 'scheduled' | 'published';
  scheduledDate?: Date;
  platforms?: string[];
}

export default function CreatorHub({ projects = [] }: { projects: any[] }) {
  const [view, setView] = useState<'grid' | 'calendar'>('grid');
  const [currentDate, setCurrentDate] = useState(new Date());

  // Format projects into our content structure
  const content: ContentItem[] = useMemo(() => {
    return projects.map(p => ({
      id: p.id,
      title: p.name || 'Untitled Content',
      platform: p.data?.platform || 'multi',
      status: p.data?.status || 'draft',
      scheduledDate: p.createdAt?.toDate ? p.createdAt.toDate() : new Date(),
      platforms: p.data?.platforms || [p.data?.platform].filter(Boolean)
    }));
  }, [projects]);

  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const days = [];
    const totalDays = daysInMonth(year, month);
    const startDay = firstDayOfMonth(year, month);

    for (let i = 0; i < startDay; i++) days.push(null);
    for (let i = 1; i <= totalDays; i++) days.push(new Date(year, month, i));
    return days;
  }, [currentDate]);

  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      {/* iOS Segmented Control */}
      <div className="flex justify-center pt-4">
        <div className="inline-flex p-1 bg-[var(--bg-secondary)] rounded-[10px] w-full max-w-[400px]">
          <div 
            onClick={() => setView('grid')}
            role="button"
            className={cn(
              "flex-1 py-1.5 rounded-[8px] text-[13px] font-semibold transition-all",
              view === 'grid' ? "bg-[var(--bg-tertiary)] ios-elevated shadow-sm" : "text-[var(--label-secondary)]"
            )}
          >
            Grid
          </div>
          <div 
            onClick={() => setView('calendar')}
            role="button"
            className={cn(
              "flex-1 py-1.5 rounded-[8px] text-[13px] font-semibold transition-all",
              view === 'calendar' ? "bg-[var(--bg-tertiary)] ios-elevated shadow-sm" : "text-[var(--label-secondary)]"
            )}
          >
            Calendar
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {view === 'grid' ? (
          <motion.div 
            key="grid"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="space-y-6"
          >
            <section>
              <h4 className="ios-label">Active Drafts</h4>
              <div className="ios-card divide-y divide-[var(--separator)] overflow-hidden">
                {content.length > 0 ? content.map((item) => (
                  <ContentRow key={item.id} item={item} />
                )) : (
                  <div className="p-8 text-center text-[var(--label-secondary)]">No content found. Start a new project to see it here.</div>
                )}
                
                <div role="button" className="w-full p-4 flex items-center gap-3 text-[var(--accent)] active:bg-[var(--separator)] transition-colors group cursor-pointer">
                  <div className="w-8 h-8 rounded-full bg-[var(--accent)]/10 flex items-center justify-center">
                    <Plus size={18} strokeWidth={1.5} />
                  </div>
                  <span className="font-semibold text-[17px]">New Masterpiece</span>
                </div>
              </div>
            </section>
          </motion.div>
        ) : (
          <motion.div 
            key="calendar"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="ios-card p-6"
          >
            <div className="flex items-center justify-between mb-8 px-2">
              <h3 className="font-serif text-[20px] font-bold tracking-[-0.015em]">
                {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
              </h3>
              <div className="flex gap-2">
                <div role="button" onClick={prevMonth} className="p-2 text-[var(--accent)] active:opacity-40 cursor-pointer">
                  <ChevronLeft size={22} strokeWidth={1.5} />
                </div>
                <div role="button" onClick={nextMonth} className="p-2 text-[var(--accent)] active:opacity-40 cursor-pointer">
                  <ChevronRight size={22} strokeWidth={1.5} />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(day => (
                <div key={day} className="text-center text-[11px] font-bold text-[var(--label-tertiary)] pb-4">
                  {day}
                </div>
              ))}
              {calendarDays.map((date, i) => (
                <div 
                  key={i} 
                  className={cn(
                    "min-h-[60px] p-1 rounded-[8px] flex flex-col items-center gap-1",
                    date ? "bg-[var(--bg-secondary)]/30" : "opacity-0"
                  )}
                >
                  {date && (
                    <>
                      <div className={cn(
                        "text-[12px] font-medium p-1 w-6 h-6 flex items-center justify-center rounded-full",
                        date.toDateString() === new Date().toDateString() ? "bg-[var(--accent)] text-white" : "text-[var(--label-primary)]"
                      )}>
                        {date.getDate()}
                      </div>
                      <div className="flex gap-0.5">
                        {content
                          .filter(item => item.scheduledDate?.toDateString() === date.toDateString())
                          .slice(0, 3)
                          .map(item => (
                            <div key={item.id} className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
                          ))
                        }
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ContentRow({ item }: { item: ContentItem }) {
  const isMulti = item.platform === 'multi' || (item.platforms && item.platforms.length > 1);
  
  return (
    <div className="p-4 flex items-center justify-between active:bg-[var(--separator)] transition-colors cursor-pointer group">
      <div className="flex items-center gap-3 min-w-0">
        <div className={cn(
          "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-white font-bold text-[10px]",
          PLATFORM_COLORS[item.platform] || PLATFORM_COLORS.multi
        )}>
           {item.platform === 'tiktok' && 'T'}
           {item.platform === 'instagram' && 'I'}
           {item.platform === 'youtube' && 'Y'}
           {isMulti && 'M'}
        </div>
        <div className="flex flex-col min-w-0">
          <span className="font-semibold text-[17px] truncate">{item.title}</span>
          <div className="flex items-center gap-2 text-[13px] text-[var(--label-secondary)]">
            <span className="capitalize">{item.status}</span>
            <span className="opacity-30">•</span>
            <span>{item.scheduledDate?.toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
          </div>
        </div>
      </div>
      <ChevronRight size={18} strokeWidth={1.5} className="text-[var(--label-tertiary)] flex-shrink-0" />
    </div>
  );
}
