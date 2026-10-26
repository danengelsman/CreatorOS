import React from 'react';
import { Check } from '@phosphor-icons/react';

interface LandingPricingProps {
  onSignIn: () => void;
}

export default function LandingPricing({ onSignIn }: LandingPricingProps) {
  return (
    <section
      id="pricing"
      className="pt-[140px] pb-[100px] px-6 border-t border-[var(--separator)] relative overflow-hidden"
    >
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[500px] bg-[var(--accent)] rounded-[100%] filter blur-[150px] opacity-[0.08] pointer-events-none" />
      <div className="max-w-3xl mx-auto relative z-10">
        <div className="text-center max-w-2xl mx-auto mb-12 space-y-4">
          <span className="inline-block px-3 py-1 bg-emerald-500/10 text-emerald-500 text-xs font-bold rounded-full uppercase tracking-widest">
            Early Access
          </span>
          <h2 className="font-serif text-[38px] sm:text-[54px] md:text-[64px] font-extrabold tracking-[-0.03em] leading-[1.1] text-[var(--label-primary)]">
            Free while CreatorOS is in early access.
          </h2>
          <p className="text-[16px] sm:text-[18px] text-[var(--label-secondary)] font-medium leading-relaxed">
            Every feature you see is included at no cost during early access. If paid plans are ever
            introduced, early users will be told first — before anything changes.
          </p>
        </div>

        <div className="bg-[var(--bg-tertiary)] p-8 rounded-[32px] border border-[var(--separator)] shadow-sm space-y-6">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-5xl font-serif font-bold">$0</span>
            <span className="text-sm text-[var(--label-secondary)] font-bold uppercase tracking-wider">
              during early access
            </span>
          </div>
          <div className="border-t border-[var(--separator)]/60 pt-6">
            <ul className="space-y-3.5 text-sm text-[var(--label-secondary)] font-medium">
              <li className="flex items-center gap-2.5">
                <Check size={16} weight="bold" className="text-emerald-500" />
                Everything included — AI writing tools, style planner, publishing calendar, and the
                30-day challenge
              </li>
              <li className="flex items-center gap-2.5">
                <Check size={16} weight="bold" className="text-emerald-500" />
                No credit card, no trial clock, no locked tiers
              </li>
              <li className="flex items-center gap-2.5">
                <Check size={16} weight="bold" className="text-emerald-500" />
                Honest product in active development — community and billing are coming soon
              </li>
            </ul>
          </div>
          <button
            onClick={onSignIn}
            className="ios-button ios-button-filled w-full h-12 text-[14px] font-bold"
          >
            Get Started Free
          </button>
        </div>
      </div>
    </section>
  );
}
