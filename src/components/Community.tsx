import React from 'react';
import { Users, ChatsCircle as MessageCircle, Trophy, Lightning as Zap, MagnifyingGlass as Search, ArrowUpRight, Globe, CaretRight as ChevronRight, ChartLine as LineChart, Chats as MessageCircleMore } from '@phosphor-icons/react';
import { cn } from '../lib/utils';
import BrandIcon from './BrandIcon';

const LEADERBOARD = [
  { name: 'Alex Rivera', niche: 'Tech Productivity', streak: 42, score: 98, avatar: 'https://picsum.photos/seed/alex/100/100' },
  { name: 'Sarah Chen', niche: 'Digital Art', streak: 31, score: 95, avatar: 'https://picsum.photos/seed/sarah/100/100' },
  { name: 'Marcus Thorne', niche: 'Solo Entrepreneurship', streak: 28, score: 92, avatar: 'https://picsum.photos/seed/marcus/100/100' },
  { name: 'Elena Rodriguez', niche: 'Sustainable Living', streak: 25, score: 90, avatar: 'https://picsum.photos/seed/elena/100/100' },
];

export default function Community({ user, userData, setActiveTab }: { user: any, userData: any, setActiveTab: (tab: string) => void }) {
  return (
    <div className="space-y-8 pb-20">
      <h1 className="font-serif text-[36px] font-semibold tracking-[-0.015em] text-[var(--label-primary)] px-1 pt-4">Community</h1>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Feed */}
        <div className="lg:col-span-8 space-y-8">
          <section className="bg-[var(--bg-tertiary)] ios-card p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-[var(--bg-secondary)] overflow-hidden flex-shrink-0">
              {(userData?.photoURL || user?.photoURL) ? (
                <img src={userData?.photoURL || user?.photoURL} alt={userData?.displayName || user?.displayName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <Users className="w-5 h-5 text-[var(--label-tertiary)] m-2.5" strokeWidth={1.5} />
              )}
            </div>
            <input 
              type="text" 
              placeholder={`Share your progress, ${user?.displayName?.split(' ')[0] || 'Creator'}...`} 
              className="flex-1 bg-transparent outline-none text-[17px] font-medium placeholder:text-[var(--label-tertiary)]"
            />
          </section>

          <section className="space-y-4">
            <div className="flex items-center justify-between pr-4">
              <span className="ios-label uppercase">Live Momentum</span>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-[var(--system-green)] rounded-full animate-pulse" />
                <span className="text-[12px] font-bold text-[var(--system-green)] uppercase tracking-wider">1,204 Active</span>
              </div>
            </div>
            
            <div className="space-y-4">
              {[
                { name: 'Sarah Chen', platform: 'LinkedIn', score: 92, content: "Just finished Day 12 of the 30-Day Challenge! The AI coach suggested I tighten my hook and it really worked. Seeing 2x engagement already.", boosts: 12, comments: 3 },
                { name: 'Marcus Thorne', platform: 'Twitter', score: 88, content: "The branding engine just gave me a tagline that actually feels like me. Finally moving past the 'blank page' phase.", boosts: 8, comments: 5 },
                { name: 'Elena Rodriguez', platform: 'Instagram', score: 95, content: "Hit 1,000 followers today! The content scoring system is basically a cheat code for growth.", boosts: 24, comments: 12 }
              ].map((item, i) => (
                <div key={i} className="bg-[var(--bg-tertiary)] ios-card p-6 transition-all active:scale-[0.99]">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[var(--bg-secondary)] flex-shrink-0" />
                      <div className="flex flex-col">
                        <span className="font-bold text-[17px] tracking-tight">{item.name}</span>
                        <span className="text-[13px] text-[var(--label-secondary)]">{item.platform} • 2m ago</span>
                      </div>
                    </div>
                    <div className="bg-[var(--bg-secondary)] px-2 py-1 rounded-lg flex items-center gap-1">
                      <BrandIcon size={12} strokeWidth={1.5} className="text-[var(--system-green)]" />
                      <span className="text-[13px] font-bold tabular-nums">{item.score}</span>
                    </div>
                  </div>
                  
                  <p className="text-[17px] leading-snug font-medium mb-6">
                    {item.content}
                  </p>
                  
                  <div className="flex items-center gap-6 pt-4 border-t border-[var(--separator)]">
                    <div className="flex items-center gap-2 text-[14px] font-bold text-[var(--label-secondary)] active:text-[var(--accent)] cursor-pointer">
                      <Zap size={18} strokeWidth={1.5} />
                      {item.boosts}
                    </div>
                    <div className="flex items-center gap-2 text-[14px] font-bold text-[var(--label-secondary)] active:text-[var(--accent)] cursor-pointer">
                      <MessageCircle size={18} strokeWidth={1.5} />
                      {item.comments}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Community Sidebar */}
        <div className="lg:col-span-4 space-y-8">
           <section>
              <span className="ios-label uppercase">Elite Creators</span>
              <div className="bg-[var(--bg-tertiary)] ios-card overflow-hidden divide-y divide-[var(--separator)]">
                {LEADERBOARD.map((user, i) => (
                  <div key={i} className="p-4 flex items-center justify-between active:bg-[var(--separator)] transition-colors cursor-pointer">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <img 
                          src={user.avatar} 
                          alt={user.name} 
                          className="w-10 h-10 rounded-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-[var(--label-primary)] text-[var(--bg-primary)] rounded-full flex items-center justify-center text-[10px] font-bold border-2 border-[var(--bg-tertiary)]">
                          {i + 1}
                        </div>
                      </div>
                      <div className="flex flex-col">
                        <span className="font-bold text-[15px]">{user.name}</span>
                        <span className="text-[12px] text-[var(--label-secondary)]">{user.niche}</span>
                      </div>
                    </div>
                    <div className="text-right">
                       <span className="block font-bold text-[15px]">{user.streak}d</span>
                       <span className="block text-[10px] text-[var(--label-tertiary)] font-bold uppercase">Streak</span>
                    </div>
                  </div>
                ))}
              </div>
           </section>

           <section>
              <div className="bg-[var(--accent)] p-6 rounded-[24px] text-white space-y-4 shadow-[inset_0px_2px_4px_rgba(255,255,255,0.1),0px_4px_12px_color-mix(in_srgb,var(--accent)_20%,transparent)]">
                 <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                    <Globe size={20} strokeWidth={1.5} className="text-white" />
                 </div>
                 <div className="space-y-1">
                    <h3 className="font-serif text-[24px] font-semibold tracking-tight">Public Presence</h3>
                    <p className="text-white/90 text-[14px] leading-tight font-medium">
                      Your portfolio updates in real-time as you build. Share your momentum with the world.
                    </p>
                 </div>
                 <button 
                   onClick={() => setActiveTab('profile')}
                   className="ios-button ios-button-filled w-full"
                 >
                   View My Page
                 </button>
              </div>
           </section>
        </div>
      </div>
    </div>
  );
}
