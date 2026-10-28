import React from 'react';
import { GithubLogo } from '@phosphor-icons/react';
import BrandIcon from '../BrandIcon';
import MadeWithLove from '../MadeWithLove';

interface LandingFooterProps {
  navigate?: (path: string) => void;
}

export default function LandingFooter({ navigate }: LandingFooterProps) {
  return (
    <footer className="py-20 px-6 border-t border-[var(--separator)] text-center sm:text-left bg-[var(--bg-tertiary)]">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12">
        <div className="space-y-4">
          <div
            className="flex items-center gap-2 justify-center sm:justify-start cursor-pointer"
            onClick={() => navigate?.('/')}
          >
            <div className="p-1.5 bg-[var(--accent)]/10 rounded-lg text-[var(--accent)]">
              <BrandIcon size={18} />
            </div>
            <span className="font-bold text-[19px] tracking-tight">CreatorOS</span>
          </div>
          <p className="text-[14px] text-[var(--label-secondary)] font-medium leading-relaxed max-w-xs mx-auto sm:mx-0">
            The simple writing and design workspace built to help you create beautiful content and
            grow your channel.
          </p>
        </div>

        <div className="space-y-4">
          <span className="ios-label p-0 uppercase tracking-widest text-xs font-bold text-[var(--label-tertiary)]">
            Product
          </span>
          <ul className="space-y-2.5 text-[14px] font-semibold text-[var(--label-secondary)]">
            <li>
              <a href="#features" className="hover:text-[var(--accent)] transition-colors">
                Features
              </a>
            </li>
            <li>
              <a href="#pricing" className="hover:text-[var(--accent)] transition-colors">
                Pricing
              </a>
            </li>
            <li>
              <button
                onClick={() => navigate?.('/roadmap')}
                className="hover:text-[var(--accent)] transition-colors text-left font-semibold"
              >
                30-Day challenge
              </button>
            </li>
          </ul>
        </div>

        <div className="space-y-4">
          <span className="ios-label p-0 uppercase tracking-widest text-xs font-bold text-[var(--label-tertiary)]">
            Company & Support
          </span>
          <ul className="space-y-2.5 text-[14px] font-semibold text-[var(--label-secondary)]">
            <li>
              <button
                onClick={() => navigate?.('/privacy')}
                className="hover:text-[var(--accent)] transition-colors text-left font-semibold"
              >
                Privacy Protection
              </button>
            </li>
            <li>
              <button
                onClick={() => navigate?.('/terms')}
                className="hover:text-[var(--accent)] transition-colors text-left font-semibold"
              >
                Terms of Service
              </button>
            </li>
            <li>
              <button
                onClick={() => navigate?.('/help')}
                className="hover:text-[var(--accent)] transition-colors text-left font-semibold"
              >
                Public Help Documentation
              </button>
            </li>
          </ul>
        </div>

        <div className="space-y-4">
          <span className="ios-label p-0 uppercase tracking-widest text-xs font-bold text-[var(--label-tertiary)]">
            Connect with us
          </span>
          <div className="flex items-center gap-3.5 justify-center sm:justify-start">
            {[{ icon: GithubLogo, href: 'https://github.com/danengelsman/CreatorOS' }].map(
              (social, i) => (
                <a
                  key={i}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-xl bg-[var(--bg-secondary)] flex items-center justify-center text-[var(--label-secondary)] hover:text-[var(--accent)] hover:bg-[var(--accent)]/5 transition-all border border-[var(--separator)] shadow-sm"
                >
                  <social.icon size={18} weight="bold" />
                </a>
              ),
            )}
          </div>
          <p className="text-[11px] text-[var(--label-tertiary)] font-semibold mt-2 block">
            Web-based — runs in any modern desktop or mobile browser
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto pt-10 mt-10 border-t border-[var(--separator)] flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-[13px] text-[var(--label-tertiary)] font-semibold">
          © 2026 CreatorOS. All rights reserved.
        </p>
        <MadeWithLove className="text-[13px]" />
        <a
          href="https://github.com/danengelsman/CreatorOS"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[13px] text-[var(--label-tertiary)] font-semibold flex items-center gap-1.5 underline hover:text-[var(--label-secondary)] transition-colors"
        >
          View source on GitHub
        </a>
      </div>
    </footer>
  );
}
