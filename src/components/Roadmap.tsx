import React from 'react';
import { MapTrifold as Map, Flag, Lightning as Zap, Trophy, Star, LockKey as Lock, CheckCircle as CheckCircle2, CaretRight as ChevronRight, Target, Medal as Award } from '@phosphor-icons/react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

const STAGES = [
  {
    id: 'idea_discovery',
    title: 'Idea Discovery',
    desc: 'Find your niche and define your brand identity.',
    days: [1, 2, 3, 4, 5, 6],
    icon: Target,
    color: 'var(--system-orange)'
  },
  {
    id: 'writing',
    title: 'Writing Habit',
    desc: 'Master the art of hooks and storytelling.',
    days: [7, 8, 9, 10, 11, 12],
    icon: Zap,
    color: 'var(--accent)'
  },
  {
    id: 'publishing',
    title: 'Consistent Publishing',
    desc: 'Build a system to post every single day.',
    days: [13, 14, 15, 16, 17, 18],
    icon: Flag,
    color: 'var(--system-green)'
  },
  {
    id: 'growth',
    title: 'Audience Growth',
    desc: 'Optimize for reach and engagement.',
    days: [19, 20, 21, 22, 23, 24],
    icon: Trophy,
    color: '#5856D6'
  },
  {
    id: 'monetization',
    title: 'First Dollar',
    desc: 'Set up your monetization engine.',
    days: [25, 26, 27, 28, 29, 30],
    icon: Award,
    color: 'var(--system-orange)'
  }
];

export default function Roadmap({ brand, user }: { brand: any, user: any }) {
  const currentDay = 1;
  const completedDays = [1];

  return (
    <div className="space-y-8 pb-20">
      <h1 className="font-serif text-[36px] font-semibold tracking-[-0.015em] text-[var(--label-primary)] px-1 pt-4">Roadmap</h1>

      {/* Progress Card */}
      <section className="bg-[var(--bg-tertiary)] ios-card p-6 flex items-center justify-between">
        <div className="flex-1">
          <span className="ios-label px-0 mb-1">Current Challenge</span>
          <h2 className="font-serif text-[28px] font-semibold tracking-[-0.015em]">30-Day Launch</h2>
          <p className="text-[17px] text-[var(--label-secondary)] font-medium">Your path to your first dollar.</p>
        </div>
        <div className="relative w-24 h-24 flex items-center justify-center">
            <svg className="w-full h-full -rotate-90">
              <circle cx="50%" cy="50%" r="42%" fill="none" stroke="var(--bg-secondary)" strokeWidth="6" />
              <motion.circle
                cx="50%" cy="50%" r="42%" fill="none" stroke="var(--system-green)" strokeWidth="6"
                strokeDasharray="264%"
                initial={{ strokeDashoffset: "264%" }}
                animate={{ strokeDashoffset: `${264 - (264 * 1) / 30}%` }}
                strokeLinecap="round"
              />
            </svg>
            <span className="absolute text-[20px] font-bold tracking-tighter">1/30</span>
        </div>
      </section>

      {/* Roadmap List */}
      <div className="space-y-10">
        {STAGES.map((stage, idx) => {
          const isUnlocked = idx === 0 || (user?.email === 'danengelsman@gmail.com');
          
          return (
            <section key={stage.id}>
              <span className="ios-label uppercase">{stage.title}</span>
              <div className={cn(
                "bg-[var(--bg-tertiary)] ios-card overflow-hidden",
                !isUnlocked && "opacity-40"
              )}>
                <div className="p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{background: `color-mix(in srgb, ${stage.color} 12%, transparent)`, color: stage.color}}>
                      <stage.icon size={24} strokeWidth={1.5} />
                    </div>
                    <div className="flex flex-col">
                      <span className="font-bold text-[17px] leading-tight flex items-center gap-2">
                        {stage.title}
                        {!isUnlocked && <Lock size={14} className="text-[var(--label-tertiary)]" strokeWidth={1.5} />}
                      </span>
                      <p className="text-[14px] text-[var(--label-secondary)] font-medium leading-tight mt-0.5">{stage.desc}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {stage.days.map(day => {
                      const isDayCompleted = completedDays.includes(day);
                      const isCurrentDay = day === currentDay;

                      return (
                        <div 
                          key={day}
                          className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center font-bold text-[13px] border transition-all",
                            isDayCompleted ? "bg-[var(--system-green)] border-[var(--system-green)] text-white" :
                            isCurrentDay ? "bg-[var(--accent)] border-[var(--accent)] text-white scale-110" :
                            "bg-[var(--bg-secondary)] border-transparent text-[var(--label-secondary)]"
                          )}
                        >
                          {isDayCompleted ? <CheckCircle2 size={16} strokeWidth={1.5} /> : day}
                        </div>
                      );
                    })}
                  </div>

                  <button className={cn(
                    "ios-button h-10 px-4 text-[14px]",
                    isUnlocked ? "ios-button-filled" : "ios-button-gray opacity-50"
                  )}>
                    {isUnlocked ? 'Continue' : 'Locked'}
                    <ChevronRight size={14} strokeWidth={1.5} />
                  </button>
                </div>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
