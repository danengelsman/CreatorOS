import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { List as Menu, X } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import BrandIcon from '../BrandIcon';

interface LandingHeaderProps {
  isScrolled: boolean;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (open: boolean) => void;
  navigate?: (path: string) => void;
  onSignIn: () => void;
}

export default function LandingHeader({
  isScrolled,
  isMobileMenuOpen,
  setIsMobileMenuOpen,
  navigate,
  onSignIn,
}: LandingHeaderProps) {
  return (
    <>
      <nav
        className={cn(
          'fixed top-0 left-0 right-0 z-[100] transition-all duration-300 px-6 h-16 flex items-center',
          isScrolled
            ? 'bg-[var(--bg-primary)]/70 backdrop-blur-2xl border-b border-[var(--separator)] shadow-sm saturate-150'
            : 'bg-transparent border-b border-transparent',
        )}
      >
        <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate?.('/')}>
            <div className="p-1.5 bg-[var(--accent)]/10 rounded-lg text-[var(--accent)]">
              <BrandIcon size={20} strokeWidth={2} />
            </div>
            <span className="font-bold text-[20px] tracking-tight">CreatorOS</span>
          </div>

          {/* Desktop Links */}
          <div className="hidden md:flex items-center gap-8">
            <a
              href="#features"
              className="text-[14px] font-semibold text-[var(--label-secondary)] hover:text-[var(--accent)] transition-colors"
            >
              Features
            </a>
            <a
              href="#sandbox"
              className="text-[14px] font-semibold text-[var(--label-secondary)] hover:text-[var(--accent)] transition-colors"
            >
              Style Planner
            </a>
            <a
              href="#pricing"
              className="text-[14px] font-semibold text-[var(--label-secondary)] hover:text-[var(--accent)] transition-colors"
            >
              Pricing
            </a>
            <button
              onClick={() => navigate?.('/roadmap')}
              className="text-[14px] font-semibold text-[var(--label-secondary)] hover:text-[var(--accent)] transition-colors text-left"
            >
              Public Roadmap
            </button>
            <button
              onClick={() => navigate?.('/help')}
              className="text-[14px] font-semibold text-[var(--label-secondary)] hover:text-[var(--accent)] transition-colors text-left"
            >
              Help Center
            </button>
            <div className="h-4 w-[1px] bg-[var(--separator)]" />
            <button
              onClick={onSignIn}
              className="text-[14px] font-bold text-[var(--accent)] hover:opacity-80 transition-opacity"
            >
              Sign In
            </button>
            <button
              onClick={onSignIn}
              className="ios-button ios-button-filled h-9 px-5 text-[13px] font-semibold"
            >
              Get Started
            </button>
          </div>

          {/* Mobile Menu Button */}
          <div
            className="md:hidden p-2 text-[var(--label-secondary)] cursor-pointer hover:bg-[var(--separator)] rounded-xl transition-colors"
            role="button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X size={22} weight="bold" /> : <Menu size={22} weight="bold" />}
          </div>
        </div>
      </nav>

      {/* Mobile Menu Backdrop & Drawer */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 z-80 bg-black/40 backdrop-blur-md md:hidden"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 bottom-0 w-[80%] max-w-[360px] z-[90] bg-[var(--bg-secondary)] border-l border-[var(--separator)] p-6 pt-24 flex flex-col gap-6 md:hidden shadow-2xl"
            >
              <div className="flex flex-col gap-4">
                <a
                  href="#features"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="text-[18px] font-bold text-[var(--label-primary)] hover:text-[var(--accent)] p-2 rounded-xl hover:bg-[var(--bg-tertiary)] transition-colors"
                >
                  Features
                </a>
                <a
                  href="#sandbox"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="text-[18px] font-bold text-[var(--label-primary)] hover:text-[var(--accent)] p-2 rounded-xl hover:bg-[var(--bg-tertiary)] transition-colors"
                >
                  Style Planner
                </a>
                <a
                  href="#pricing"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="text-[18px] font-bold text-[var(--label-primary)] hover:text-[var(--accent)] p-2 rounded-xl hover:bg-[var(--bg-tertiary)] transition-colors"
                >
                  Pricing
                </a>
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    navigate?.('/roadmap');
                  }}
                  className="text-[18px] font-bold text-left text-[var(--label-primary)] hover:text-[var(--accent)] p-2 rounded-xl hover:bg-[var(--bg-tertiary)] transition-colors"
                >
                  Public Roadmap
                </button>
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    navigate?.('/help');
                  }}
                  className="text-[18px] font-bold text-left text-[var(--label-primary)] hover:text-[var(--accent)] p-2 rounded-xl hover:bg-[var(--bg-tertiary)] transition-colors"
                >
                  Help Center
                </button>
              </div>

              <div className="mt-auto space-y-3">
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onSignIn();
                  }}
                  className="w-full ios-button ios-button-gray h-12 text-[15px] font-semibold"
                >
                  Sign In
                </button>
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onSignIn();
                  }}
                  className="w-full ios-button ios-button-filled h-12 text-[15px] font-semibold"
                >
                  Get Started Free
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
