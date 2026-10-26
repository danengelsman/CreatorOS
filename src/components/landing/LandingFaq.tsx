import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus } from '@phosphor-icons/react';
import { FAQS } from './landingData';

interface LandingFaqProps {
  expandedFaqIndex: number | null;
  setExpandedFaqIndex: (index: number | null) => void;
}

export default function LandingFaq({ expandedFaqIndex, setExpandedFaqIndex }: LandingFaqProps) {
  return (
    <section className="pt-[140px] pb-[100px] px-6 bg-[var(--bg-secondary)]/20 border-t border-[var(--separator)]">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-16 space-y-3">
          <span className="inline-block px-3 py-1 bg-amber-500/10 text-amber-500 text-xs font-bold rounded-full uppercase tracking-widest">
            Common Questions
          </span>
          <h2 className="font-serif text-[38px] sm:text-[54px] md:text-[64px] font-extrabold tracking-[-0.03em] leading-[1.1] text-[var(--label-primary)]">
            Frequently Asked Questions
          </h2>
          <p className="text-[16px] text-[var(--label-secondary)] font-medium">
            Find quick answers about settings, features, billing, and challenges.
          </p>
        </div>

        <div className="bg-[var(--bg-tertiary)] rounded-3xl border border-[var(--separator)] overflow-hidden divide-y divide-[var(--separator)] shadow-sm">
          {FAQS.map((faq, index) => {
            const isExpanded = expandedFaqIndex === index;
            return (
              <div key={index} className="flex flex-col">
                <button
                  onClick={() => setExpandedFaqIndex(isExpanded ? null : index)}
                  className="w-full text-left p-6 flex items-center justify-between hover:bg-[var(--bg-secondary)]/40 transition-colors focus:outline-none"
                >
                  <span className="font-bold text-[16px] sm:text-[17px] text-[var(--label-primary)] pr-6">
                    {faq.q}
                  </span>
                  <motion.div
                    animate={{ rotate: isExpanded ? 45 : 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                    className="text-[var(--label-tertiary)] flex-shrink-0"
                  >
                    <Plus size={18} weight="bold" />
                  </motion.div>
                </button>

                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                      className="overflow-hidden bg-[var(--bg-secondary)]/20"
                    >
                      <p className="p-6 pt-0 text-[15px] text-[var(--label-secondary)] leading-relaxed font-medium">
                        {faq.a}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
