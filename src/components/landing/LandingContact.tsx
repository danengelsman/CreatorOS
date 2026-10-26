import React from 'react';
import { Envelope } from '@phosphor-icons/react';

export default function LandingContact() {
  return (
    <section className="pt-[140px] pb-[100px] px-6 border-t border-[var(--separator)]">
      <div className="max-w-3xl mx-auto">
        <div className="bg-[var(--bg-tertiary)] rounded-[40px] border border-[var(--separator)] p-8 sm:p-12 shadow-xl relative overflow-hidden">
          <div className="absolute -top-12 -right-12 w-32 h-32 bg-[var(--accent)] rounded-full filter blur-[50px] opacity-15 pointer-events-none" />

          <div className="text-center max-w-2xl mx-auto mb-10 space-y-3">
            <div className="w-12 h-12 bg-[var(--accent)]/10 text-[var(--accent)] rounded-2xl flex items-center justify-center mx-auto">
              <Envelope size={24} weight="duotone" />
            </div>
            <h3 className="font-serif text-[32px] sm:text-[38px] font-extrabold tracking-[-0.03em] leading-[1.1]">
              Have a question?
            </h3>
            <p className="text-[15px] text-[var(--label-secondary)] font-medium">
              CreatorOS is built by one developer early in its journey. The honest answer beats a
              fake form: reach out directly and it will be read.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="mailto:danengelsman@gmail.com?subject=CreatorOS%20question"
              className="ios-button ios-button-filled w-full sm:w-auto h-14 px-10 text-[15px] font-bold flex items-center justify-center gap-2 shadow-lg shadow-[var(--accent)]/10"
            >
              Email the Builder
              <Envelope size={16} weight="bold" />
            </a>
            <a
              href="https://github.com/danengelsman/CreatorOS"
              target="_blank"
              rel="noopener noreferrer"
              className="ios-button ios-button-gray w-full sm:w-auto h-14 px-10 text-[15px] font-semibold"
            >
              Open a GitHub Issue
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
