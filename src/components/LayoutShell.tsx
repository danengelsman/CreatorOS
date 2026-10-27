import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  UsersThree,
  List as Menu,
  X,
  CurrencyDollar as DollarSign,
  SignOut as LogOut,
  UserCircle,
  House,
  PenNib,
  Hexagon,
  Path,
  ChatsCircle,
  ChartLineUp,
  BookOpen,
  Sparkle,
  ShieldCheck,
  Recycle,
  Lightbulb,
  Lightning,
  VideoCamera,
} from '@phosphor-icons/react';
import { Link } from '@tanstack/react-router';
import { logout } from '@/firebase';
import VerificationBanner from '@/components/VerificationBanner';
import { RouteErrorBoundary } from '@/components/RouteErrorBoundary';
import BrandIcon from '@/components/BrandIcon';

const FEATURE_COMMUNITY = import.meta.env.VITE_FEATURE_COMMUNITY === 'true';

const baseNavItems = [
  { id: 'home', label: 'Home', icon: House, path: '/dashboard' },
  { id: 'first_dollar', label: 'First Dollar', icon: DollarSign, path: '/first-dollar' },
  { id: 'create', label: 'Create', icon: PenNib, path: '/create' },
  { id: 'retention', label: 'Retention Lab', icon: Lightning, path: '/retention' },
  { id: 'analyzer', label: 'Video Analyzer', icon: VideoCamera, path: '/analyzer' },
  { id: 'repurpose', label: 'Repurpose', icon: Recycle, path: '/repurpose' },
  { id: 'brand', label: 'Brand', icon: Hexagon, path: '/brand' },
  { id: 'ideas', label: 'Ideas', icon: Lightbulb, path: '/ideas' },
  { id: 'roadmap', label: 'Roadmap', icon: Path, path: '/roadmap' },
  { id: 'hub', label: 'Creator Hub', icon: UsersThree, path: '/hub' },
  { id: 'community', label: 'Community', icon: ChatsCircle, path: '/community' },
  { id: 'reports', label: 'Reports', icon: ChartLineUp, path: '/reports' },
  { id: 'help', label: 'Help', icon: BookOpen, path: '/help' },
  { id: 'prompts', label: 'Co-Pilot', icon: Sparkle, path: '/prompts' },
  { id: 'profile', label: 'Profile', icon: UserCircle, path: '/profile' },
  { id: 'support', label: 'Support Hub', icon: ShieldCheck, path: '/support' },
];

const NAV_ITEMS = FEATURE_COMMUNITY
  ? baseNavItems
  : baseNavItems.filter((item) => item.id !== 'community');

// The 6 prominent primary items from the 3D product concept mockup
const MOCKUP_PRIMARY_IDS = ['home', 'create', 'brand', 'roadmap', 'community', 'reports'];
const PRIMARY_NAV_ITEMS = NAV_ITEMS.filter((item) => MOCKUP_PRIMARY_IDS.includes(item.id));
const STUDIO_NAV_ITEMS = NAV_ITEMS.filter(
  (item) =>
    !MOCKUP_PRIMARY_IDS.includes(item.id) && !['profile', 'help', 'support'].includes(item.id),
);

const baseNavGroups = [
  { title: 'Main', items: ['home'] },
  {
    title: 'Studio',
    items: ['create', 'retention', 'analyzer', 'repurpose', 'brand', 'ideas', 'prompts'],
  },
  { title: 'Growth', items: ['first_dollar', 'hub', 'reports', 'roadmap', 'community'] },
  { title: 'Settings', items: ['profile', 'help', 'support'] },
];

const NAV_GROUPS = baseNavGroups.map((group) => ({
  title: group.title,
  items: FEATURE_COMMUNITY ? group.items : group.items.filter((item) => item !== 'community'),
}));

export default function LayoutShell({ children, user }: { children: React.ReactNode; user: any }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const userPhoto = user?.photoURL || '';
  const userName = user?.displayName || user?.email?.split('@')?.[0] || 'Creator';

  return (
    <div className="flex h-screen bg-[var(--bg-primary)] text-[var(--label-primary)] font-sans overflow-hidden">
      {/* Persistent Desktop Sidebar matching 3D Mockup */}
      <aside className="hidden lg:flex flex-col w-64 bg-[#0c0c12] border-r border-white/10 shrink-0 h-screen select-none z-30">
        {/* Brand Wordmark & Hexagon Icon */}
        <div className="h-16 flex items-center px-5 border-b border-white/[0.08] gap-3 shrink-0">
          <BrandIcon size={24} strokeWidth={1.8} className="text-[var(--accent)]" />
          <div className="flex flex-col">
            <div className="flex items-center tracking-tight text-[17px] font-bold">
              <span className="text-[#f3f1ed]">Creator</span>
              <span className="text-[var(--accent)]">OS</span>
            </div>
            <span className="text-[9px] font-semibold tracking-wider text-white/40 uppercase">
              First Post to First Dollar
            </span>
          </div>
        </div>

        {/* Navigation list */}
        <div className="flex-1 overflow-y-auto p-3 space-y-5 custom-scrollbar">
          <div>
            <div className="px-3 pb-2 text-[11px] font-bold uppercase tracking-wider text-white/40">
              Workspace
            </div>
            <div className="space-y-1">
              {PRIMARY_NAV_ITEMS.map((item) => (
                <Link
                  key={item.id}
                  to={item.path as any}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-white/70 hover:text-white hover:bg-white/[0.05] text-sm font-medium"
                  activeProps={{
                    className:
                      'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-[var(--accent)] bg-[var(--accent)]/15 border border-[var(--accent)]/30 text-sm font-semibold shadow-[0_0_15px_rgba(244,162,97,0.06)]',
                  }}
                >
                  <item.icon size={19} className="flex-shrink-0" />
                  <span>{item.label}</span>
                </Link>
              ))}
            </div>
          </div>

          <div>
            <div className="px-3 pb-2 text-[11px] font-bold uppercase tracking-wider text-white/40">
              Studio Tools
            </div>
            <div className="space-y-1">
              {STUDIO_NAV_ITEMS.map((item) => (
                <Link
                  key={item.id}
                  to={item.path as any}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-all text-white/60 hover:text-white hover:bg-white/[0.04] text-xs font-medium"
                  activeProps={{
                    className:
                      'w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-all text-[var(--accent)] bg-[var(--accent)]/10 border border-[var(--accent)]/20 text-xs font-semibold',
                  }}
                >
                  <item.icon size={17} className="flex-shrink-0" />
                  <span>{item.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar user footer */}
        <div className="p-3 border-t border-white/[0.08] space-y-2 shrink-0">
          <Link
            to="/profile"
            className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-white/70 hover:text-white hover:bg-white/[0.04] transition-colors"
          >
            <UserCircle size={18} />
            <span className="truncate">{userName}</span>
          </Link>
          <button
            onClick={async () => {
              try {
                await logout();
              } catch (err) {
                console.error('Logout failed:', err);
              }
              window.location.href = '/login';
            }}
            className="w-full flex items-center gap-3 px-3 py-2 text-xs font-semibold text-[var(--system-red)] hover:bg-white/[0.04] transition-colors rounded-xl"
          >
            <LogOut size={16} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden relative">
        {/* Navigation Bar (Header) */}
        <header className="material-thin border-b border-[var(--separator)] flex items-center justify-between px-4 lg:px-8 h-[52px] lg:h-[60px] shrink-0 z-20">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 -ml-2 flex items-center gap-2 text-[var(--accent)] hover:opacity-80 transition-opacity"
              aria-label="Toggle navigation menu"
            >
              {isMobileMenuOpen ? (
                <X size={22} strokeWidth={1.5} />
              ) : (
                <Menu size={22} strokeWidth={1.5} />
              )}
              <span className="font-bold text-lg lg:hidden tracking-tight text-[var(--label-primary)]">
                Creator<span className="text-[var(--accent)]">OS</span>
              </span>
            </button>

            <div className="hidden lg:flex items-center gap-3">
              <span className="font-semibold text-[16px] text-[#f3f1ed] tracking-tight">
                Your creator workspace
              </span>
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full border border-white/10 bg-white/5 text-white/60">
                Demo workspace
              </span>
            </div>
          </div>

          <div className="flex lg:hidden flex-col items-center flex-1 justify-center h-full">
            <span className="font-semibold text-[15px] tracking-[-0.014em]">Workspace</span>
          </div>

          <div className="flex justify-end items-center gap-3">
            <Link
              to="/profile"
              className="cursor-pointer active:scale-95 transition-transform flex items-center justify-center w-8 h-8 rounded-full border border-[var(--separator)] overflow-hidden bg-[var(--bg-secondary)] shadow-sm relative"
            >
              {userPhoto ? (
                <img
                  src={userPhoto}
                  alt=""
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <UserCircle size={20} weight="fill" className="text-[var(--label-tertiary)]" />
              )}
              <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-400 border border-[#050507]" />
            </Link>
          </div>
        </header>

        {/* Phase A — soft email-verification nudge (never a hard block). */}
        <VerificationBanner user={user} />

        <AnimatePresence>
          {isMobileMenuOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/40 lg:bg-black/20 z-[60] backdrop-blur-sm lg:backdrop-blur-none"
                onClick={() => setIsMobileMenuOpen(false)}
              />
              <motion.nav
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="fixed top-[env(safe-area-inset-top,0px)] left-0 bottom-0 w-[280px] lg:top-[calc(env(safe-area-inset-top,0px)+60px)] lg:left-4 lg:bottom-auto lg:w-80 bg-[var(--bg-secondary)] ios-card shadow-2xl z-[65] max-h-[100dvh] lg:max-h-[80vh] overflow-y-auto custom-scrollbar border-r lg:border border-[var(--separator)]"
              >
                <div className="p-4 lg:p-2 space-y-6 lg:space-y-4">
                  <div className="flex lg:hidden items-center justify-between pb-2 border-b border-[var(--separator)]">
                    <div className="flex items-center gap-2 text-[var(--accent)]">
                      <Menu size={24} strokeWidth={1.5} />
                      <span className="font-bold text-lg tracking-tight text-[var(--label-primary)]">
                        Creator<span className="text-[var(--accent)]">OS</span>
                      </span>
                    </div>
                    <button
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="p-2 text-[var(--label-secondary)] hover:text-[var(--label-primary)]"
                    >
                      <X size={24} />
                    </button>
                  </div>

                  {NAV_GROUPS.map((group, groupIdx) => {
                    const groupItems = group.items
                      .map((id) => NAV_ITEMS.find((item) => item.id === id))
                      .filter((item): item is (typeof NAV_ITEMS)[number] => Boolean(item));
                    if (groupItems.length === 0) return null;

                    return (
                      <div key={groupIdx} className="space-y-1">
                        {group.title !== 'Main' && (
                          <h4 className="px-4 py-2 text-[12px] font-bold tracking-wider text-[var(--label-tertiary)] uppercase">
                            {group.title}
                          </h4>
                        )}
                        {groupItems.map((item) => (
                          <Link
                            key={item.id}
                            to={item.path as any}
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all group text-[var(--label-secondary)] hover:bg-[var(--separator)]"
                          >
                            <div className="flex items-center gap-3">
                              <item.icon size={20} className="flex-shrink-0" />
                              <span className="font-semibold text-[15px]">{item.label}</span>
                            </div>
                          </Link>
                        ))}
                      </div>
                    );
                  })}

                  <div className="my-4 border-t border-[var(--separator)]" />
                  <button
                    onClick={async () => {
                      try {
                        await logout();
                      } catch (err) {
                        console.error('Logout failed:', err);
                      }
                      window.location.href = '/login';
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-[var(--system-red)] hover:bg-[var(--separator)] transition-colors rounded-xl mb-8 lg:mb-0"
                  >
                    <LogOut size={20} />
                    <span className="text-[15px] font-semibold">Logout</span>
                  </button>
                </div>
              </motion.nav>
            </>
          )}
        </AnimatePresence>

        <main className="flex-1 overflow-y-auto px-4 lg:px-10 py-6 pb-24 lg:pb-12">
          <div className="max-w-[1400px] mx-auto">
            <RouteErrorBoundary
              onGoHome={() => {
                window.location.href = '/dashboard';
              }}
            >
              {children}
            </RouteErrorBoundary>
          </div>
        </main>

        <nav className="fixed bottom-0 left-0 right-0 z-[60] lg:hidden material-thick border-t border-[var(--separator)] px-2 pb-[env(safe-area-inset-bottom,4px)] pt-1 h-[calc(env(safe-area-inset-bottom,0px)+49px)]">
          <div className="flex items-center justify-around h-full">
            {NAV_ITEMS.filter((item) =>
              ['home', 'create', 'repurpose', 'brand', 'profile'].includes(item.id),
            ).map((item) => (
              <Link
                key={item.id}
                to={item.path}
                className="flex flex-col items-center justify-center flex-1 gap-1 py-1 text-[var(--label-secondary)] hover:text-[var(--accent)] transition-colors"
              >
                <item.icon size={23} />
                <span className="text-[10px] font-medium tracking-[0.01em]">{item.label}</span>
              </Link>
            ))}
          </div>
        </nav>
      </div>
    </div>
  );
}
