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
import { logout, sendVerificationEmail } from '@/firebase';

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
  const [verificationSendState, setVerificationSendState] = useState<'idle' | 'sending' | 'sent'>(
    'idle',
  );
  const [verificationBannerDismissed, setVerificationBannerDismissed] = useState(false);
  const userPhoto = user?.photoURL || '';

  const needsEmailVerification = Boolean(
    user &&
    !user.emailVerified &&
    (user.providerData?.[0]?.providerId ?? 'password') === 'password',
  );
  const showVerificationBanner =
    needsEmailVerification && !verificationBannerDismissed && verificationSendState !== 'sent';

  const handleResendVerification = async () => {
    if (!user || verificationSendState === 'sending') return;
    setVerificationSendState('sending');
    try {
      await sendVerificationEmail(user);
      setVerificationSendState('sent');
    } catch (error) {
      console.warn('Resend verification failed:', error);
      setVerificationSendState('idle');
    }
  };

  return (
    <div className="flex h-screen bg-[var(--bg-primary)] text-[var(--label-primary)] font-sans overflow-hidden relative">
      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* iOS Navigation Bar (Header) */}
        <header className="fixed top-0 left-0 right-0 lg:absolute z-[70] material-thin border-b border-[var(--separator)] flex items-center justify-between px-4 pb-2 pt-[env(safe-area-inset-top,16px)] h-[calc(env(safe-area-inset-top,0px)+52px)]">
          <div className="flex-1 flex items-center h-full">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 -ml-2 flex items-center gap-2 text-[var(--accent)] hover:opacity-80 transition-opacity"
            >
              {isMobileMenuOpen ? (
                <X size={24} strokeWidth={1.5} />
              ) : (
                <Menu size={24} strokeWidth={1.5} />
              )}
              <span className="font-bold text-lg hidden sm:block tracking-tight text-[var(--label-primary)]">
                CreatorOS
              </span>
            </button>
          </div>

          <div className="flex flex-col items-center flex-1 justify-center h-full">
            <span className="font-semibold text-[17px] tracking-[-0.014em]">Workspace</span>
          </div>

          <div className="flex-1 flex justify-end h-full items-center gap-3">
            <Link
              to="/profile"
              className="cursor-pointer active:scale-95 transition-transform flex items-center justify-center w-8 h-8 rounded-full border border-[var(--separator)] overflow-hidden bg-[var(--bg-secondary)] shadow-sm"
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
            </Link>
          </div>
        </header>

        {/* Phase A — soft email-verification nudge (never a hard block). */}
        {showVerificationBanner && (
          <div
            className="fixed lg:absolute top-[calc(env(safe-area-inset-top,0px)+52px)] left-0 right-0 z-[55] px-4 lg:px-10"
            data-testid="email-verification-banner"
          >
            <div className="max-w-[1400px] mx-auto mt-2 flex items-center justify-between gap-3 p-3 rounded-xl border border-[var(--separator)] bg-[var(--bg-secondary)] ios-card">
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                  style={{
                    background: 'color-mix(in srgb, var(--system-green) 12%, transparent)',
                    color: 'var(--system-green)',
                  }}
                >
                  <ShieldCheck size={18} strokeWidth={1.5} />
                </div>
                <p className="text-[13px] font-medium text-[var(--label-secondary)] truncate">
                  Verify your email address ({user?.email}) to secure your account.
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={handleResendVerification}
                  disabled={verificationSendState === 'sending'}
                  className="ios-button ios-button-tinted h-8 px-3 text-[13px]"
                >
                  {verificationSendState === 'sending' ? 'Sending…' : 'Resend email'}
                </button>
                <button
                  onClick={() => setVerificationBannerDismissed(true)}
                  aria-label="Dismiss verification banner"
                  className="p-2 text-[var(--label-tertiary)] hover:text-[var(--label-primary)] transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          </div>
        )}

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
                        CreatorOS
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

        <main className="flex-1 overflow-y-auto pt-[calc(env(safe-area-inset-top,0px)+64px)] pb-[calc(env(safe-area-inset-bottom,0px)+83px)] lg:pb-12 px-4 lg:px-10">
          <div className="max-w-[1400px] mx-auto">{children}</div>
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
