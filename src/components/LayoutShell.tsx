import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  UsersThree,
  List as Menu,
  X,
  SignOut as LogOut,
  UserCircle,
  House,
  PenNib,
  Hexagon,
  Path,
  ChartLineUp,
  BookOpen,
  ShieldCheck,
  GridFour,
  Columns,
  Sparkle,
  PenNib as PenTool,
  ArrowUpRight,
} from '@phosphor-icons/react';
import { Link, useLocation } from '@tanstack/react-router';
import { logout } from '@/firebase';
import VerificationBanner from '@/components/VerificationBanner';
import { RouteErrorBoundary } from '@/components/RouteErrorBoundary';
import BrandIcon from '@/components/BrandIcon';
import MadeWithLove from '@/components/MadeWithLove';
import { ContentStudioWorkflow } from '@/components/ContentStudioWorkflow';
import { RoadmapStepper } from '@/components/RoadmapStepper';

const NAV_ITEMS = [
  { id: 'home', label: 'Home', icon: House, path: '/dashboard' },
  { id: 'studio', label: 'Studio', icon: PenNib, path: '/studio' },
  { id: 'brand', label: 'Brand', icon: Hexagon, path: '/brand' },
  { id: 'roadmap', label: 'Roadmap', icon: Path, path: '/roadmap' },
  { id: 'hub', label: 'Creator Hub', icon: UsersThree, path: '/hub' },
  { id: 'reports', label: 'Reports', icon: ChartLineUp, path: '/reports' },
  { id: 'profile', label: 'Profile', icon: UserCircle, path: '/profile' },
  { id: 'help', label: 'Help', icon: BookOpen, path: '/help' },
  { id: 'support', label: 'Support', icon: ShieldCheck, path: '/support' },
];

const NAV_GROUPS = [
  { title: 'Workspace', items: ['home', 'studio', 'brand'] },
  { title: 'Growth', items: ['roadmap', 'hub', 'reports'] },
  { title: 'Settings', items: ['profile', 'help', 'support'] },
];

// Three-panel layout routes
const THREE_PANEL_ROUTES = ['/dashboard', '/studio', '/roadmap'];

export default function LayoutShell({ children, user }: { children: React.ReactNode; user: any }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showThreePanel, setShowThreePanel] = useState(true);
  const location = useLocation();
  const userPhoto = user?.photoURL || '';
  const userName = user?.displayName || user?.email?.split('@')?.[0] || 'Creator';
  
  const isThreePanelRoute = THREE_PANEL_ROUTES.some(route => location.pathname.startsWith(route));

  return (
    <div className="flex h-screen bg-[var(--bg-primary)] text-[var(--label-primary)] font-sans overflow-hidden">
      {/* Mobile / Quick drawer rendered first so when opened, its links receive focus and clicks */}
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
              className="fixed top-[env(safe-area-inset-top,0px)] left-0 bottom-0 w-[280px] lg:top-[calc(env(safe-area-inset-top,0px)+60px)] lg:left-4 lg:bottom-auto lg:w-80 card-glass shadow-[var(--shadow-strong)] z-[65] max-h-[100dvh] lg:max-h-[80vh] overflow-y-auto custom-scrollbar border-r lg:border border-white/10"
            >
              <div className="p-4 lg:p-2 space-y-6 lg:space-y-4">
                <div className="flex lg:hidden items-center justify-between pb-2 border-b border-white/10">
                  <div className="flex items-center gap-2 text-[var(--accent)]">
                    <Menu size={24} strokeWidth={1.5} />
                    <span className="font-bold text-lg tracking-tight text-[var(--label-primary)]">
                      Creator<span className="text-[var(--accent)]">OS</span>
                    </span>
                  </div>
                  <button
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="p-2 text-[var(--label-secondary)] hover:text-[var(--label-primary)] focus-ring"
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
                        <h4 className="px-4 py-2 text-micro font-bold tracking-wider text-[var(--label-tertiary)] uppercase">
                          {group.title}
                        </h4>
                      )}
                      {groupItems.map((item) => (
                        <Link
                          key={item.id}
                          to={item.path as any}
                          onClick={() => setIsMobileMenuOpen(false)}
                          className="w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all group text-[var(--label-secondary)] hover:bg-white/5 hover:text-[var(--label-primary)] focus-ring"
                        >
                          <div className="flex items-center gap-3">
                            <item.icon size={20} className="flex-shrink-0" />
                            <span className="font-semibold text-base">{item.label}</span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  );
                })}

                <div className="my-4 border-t border-white/10" />
                <button
                  onClick={async () => {
                    try {
                      await logout();
                    } catch (err) {
                      console.error('Logout failed:', err);
                    }
                    window.location.href = '/login';
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-[var(--system-red)] hover:bg-white/5 transition-colors rounded-xl mb-8 lg:mb-0 focus-ring"
                >
                  <LogOut size={20} />
                  <span className="text-base font-semibold">Logout</span>
                </button>
              </div>
            </motion.nav>
          </>
        )}
      </AnimatePresence>

      {/* Persistent Desktop Sidebar matching 3D Mockup */}
      <aside className="hidden lg:flex flex-col w-64 bg-[var(--surface-2)] border-r border-white/10 shrink-0 h-screen select-none z-30">
        {/* Brand Wordmark & Hexagon Icon */}
        <div className="h-16 flex items-center px-5 border-b border-white/10 gap-3 shrink-0">
          <BrandIcon size={24} strokeWidth={1.8} className="text-[var(--accent)]" />
          <div className="flex flex-col">
            <div className="flex items-center tracking-tight text-[17px] font-bold">
              <span className="text-[var(--label-primary)]">Creator</span>
              <span className="text-[var(--accent)]">OS</span>
            </div>
            <span className="text-micro font-semibold tracking-wider text-[var(--label-tertiary)] uppercase">
              First Post to First Dollar
            </span>
          </div>
        </div>

        {/* Navigation list */}
        <div className="flex-1 overflow-y-auto p-3 space-y-5 custom-scrollbar">
          {NAV_GROUPS.map((group) => (
            <div key={group.title}>
              <div className="px-3 pb-2 text-micro font-bold uppercase tracking-wider text-[var(--label-tertiary)]">
                {group.title}
              </div>
              <div className="space-y-1">
                {group.items.map((id) => {
                  const item = NAV_ITEMS.find((entry) => entry.id === id);
                  if (!item) return null;
                  return (
                    <Link
                      key={item.id}
                      to={item.path as any}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-[var(--label-secondary)] hover:text-[var(--label-primary)] hover:bg-white/5 text-sm font-medium"
                      activeProps={{
                        className:
                          'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-[var(--accent)] bg-[var(--accent-soft)] border border-[var(--accent)]/30 text-sm font-semibold',
                      }}
                    >
                      <item.icon size={19} className="flex-shrink-0" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Sidebar user footer */}
        <div className="p-3 border-t border-white/10 space-y-2 shrink-0">
          <Link
            to="/profile"
            className="flex items-center gap-3 px-3 py-2 rounded-xl text-micro font-medium text-[var(--label-secondary)] hover:text-[var(--label-primary)] hover:bg-white/5 transition-colors focus-ring"
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
            className="w-full flex items-center gap-3 px-3 py-2 text-micro font-semibold text-[var(--system-red)] hover:bg-white/5 transition-colors rounded-xl focus-ring"
          >
            <LogOut size={16} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden relative">
        {/* Navigation Bar (Header) */}
        <header className="glass-regular border-b border-white/10 flex items-center justify-between px-4 lg:px-8 h-[52px] lg:h-[60px] shrink-0 z-20">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 -ml-2 flex items-center gap-2 text-[var(--accent)] hover:opacity-80 transition-opacity focus-ring"
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
              <span className="font-semibold text-[16px] text-[var(--label-primary)] tracking-tight">
                Your creator workspace
              </span>
              <span className="text-micro font-medium px-2 py-0.5 rounded-full border border-white/10 bg-white/5 text-[var(--label-tertiary)]">
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
              className="cursor-pointer active:scale-95 transition-transform flex items-center justify-center w-8 h-8 rounded-full border border-white/10 overflow-hidden bg-[var(--surface-2)] shadow-sm relative"
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
              <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-[var(--system-green)] border-2 border-[var(--surface-1)]" />
            </Link>
          </div>
        </header>

        {/* Phase A — soft email-verification nudge (never a hard block). */}
        <VerificationBanner user={user} />

        {/* Three-Panel Desktop Layout */}
        {isThreePanelRoute && showThreePanel && (
          <main className="flex-1 overflow-hidden flex lg:px-0 lg:py-0">
            <div className="flex flex-1 h-full lg:grid lg:grid-cols-[280px_1fr_320px] lg:gap-4 lg:p-4 lg:h-full">
              {/* Left Panel - Content Studio */}
              <aside className="hidden lg:flex flex-col h-full card-glass border border-white/10 overflow-hidden">
                <div className="p-4 border-b border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <GridFour size={18} className="text-[var(--accent)]" />
                    <h3 className="font-semibold text-[var(--label-primary)]">Content Studio</h3>
                  </div>
                  <span className="text-micro font-medium px-2 py-0.5 rounded-full bg-[var(--accent-soft)] text-[var(--accent)] border border-[var(--accent)]/30">
                    Ideas → Drafts → Published
                  </span>
                </div>
                <div className="flex-1 overflow-y-auto p-4">
                  <ContentStudioWorkflow
                    stages={[
                      { id: 'ideas', label: 'Ideas', count: 0, icon: <Sparkle className="h-5 w-5" weight="bold" />, color: 'var(--accent)', description: 'Capture & refine concepts' },
                      { id: 'drafts', label: 'Drafts', count: 0, icon: <PenTool className="h-5 w-5" weight="bold" />, color: '#8faa6e', description: 'Write & polish content' },
                      { id: 'published', label: 'Published', count: 0, icon: <ArrowUpRight className="h-5 w-5" weight="bold" />, color: '#d89b5c', description: 'Live & performing' },
                    ]}
                    activeStage="drafts"
                    onStageChange={() => {}}
                    onCreateContent={() => {}}
                  />
                </div>
              </aside>

              {/* Center Panel - Main Workspace */}
              <section className="flex-1 flex flex-col min-w-0 overflow-y-auto lg:overflow-y-auto">
                <RouteErrorBoundary
                  onGoHome={() => {
                    window.location.href = '/dashboard';
                  }}
                >
                  <div className="flex-1 flex flex-col min-h-0">{children}</div>
                </RouteErrorBoundary>

                <footer className="mt-16 pt-6 pb-2 border-t border-white/10 lg:border-t-0 lg:pt-0 lg:mt-0">
                  <MadeWithLove />
                </footer>
              </section>

              {/* Right Panel - Roadmap */}
              <aside className="hidden lg:flex flex-col h-full card-glass border border-white/10 overflow-hidden">
                <div className="p-4 border-b border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Columns size={18} className="text-[var(--accent)]" />
                    <h3 className="font-semibold text-[var(--label-primary)]">Roadmap</h3>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-4">
                  <RoadmapStepper
                    steps={[
                      { id: 'direction', title: 'Choose a direction', description: 'Write down one skill, experience, or interest you could share.', phase: 'discover' as const },
                      { id: 'person', title: 'Name one person', description: 'Describe a specific person and one problem they have.', phase: 'discover' as const },
                      { id: 'small_offer', title: 'Sketch a small way to help', description: 'Describe one small, concrete thing you could make.', phase: 'build' as const },
                      { id: 'brand', title: 'Build brand system', description: 'Visual identity, voice, and positioning for your channel.', phase: 'build' as const },
                      { id: 'first_content', title: 'Create first content', description: 'Script, record, and publish your first piece.', phase: 'build' as const },
                      { id: 'audience', title: 'Grow audience', description: 'Consistent publishing and engagement.', phase: 'monetize' as const },
                      { id: 'offer', title: 'Design your offer', description: 'Productize your expertise into a paid offer.', phase: 'monetize' as const },
                      { id: 'launch', title: 'Launch & iterate', description: 'First dollar to sustainable revenue.', phase: 'monetize' as const },
                    ]}
                    currentStepId="direction"
                    onStepClick={() => {}}
                  />
                </div>
              </aside>
            </div>
          </main>
        )}

        {/* Single Panel Mobile / Other Routes */}
        {!isThreePanelRoute || !showThreePanel ? (
          <main className="flex-1 overflow-y-auto px-4 lg:px-10 py-6 pb-[calc(env(safe-area-inset-bottom,0px)+80px)] lg:pb-12">
            <div className="max-w-[1400px] mx-auto min-h-full flex flex-col justify-between">
              <RouteErrorBoundary
                onGoHome={() => {
                  window.location.href = '/dashboard';
                }}
              >
                <div className="flex-1">{children}</div>
              </RouteErrorBoundary>

              <footer className="mt-16 pt-6 pb-2 border-t border-white/10">
                <MadeWithLove />
              </footer>
            </div>
          </main>
        ) : null}

        {/* Bottom Navigation - Safe Area Aware */}
        <nav className="fixed bottom-0 left-0 right-0 z-[60] lg:hidden glass-thick border-t border-white/10 px-2 pb-[env(safe-area-inset-bottom,4px)] pt-1 h-[calc(env(safe-area-inset-bottom,0px)+64px)]">
          <div className="flex items-center justify-around h-full">
            {NAV_ITEMS.filter((item) =>
              ['home', 'studio', 'brand', 'roadmap', 'profile'].includes(item.id),
            ).map((item) => (
              <Link
                key={item.id}
                to={item.path}
                className="flex flex-col items-center justify-center flex-1 gap-1 py-2 text-[var(--label-secondary)] hover:text-[var(--accent)] transition-colors active:scale-95 focus-ring"
              >
                <item.icon size={23} />
                <span className="text-micro font-medium tracking-[0.01em]">{item.label}</span>
              </Link>
            ))}
          </div>
        </nav>
      </div>
    </div>
  );
}