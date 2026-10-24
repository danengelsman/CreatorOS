import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MagnifyingGlass, Lightning, CheckCircle, CircleNotch } from '@phosphor-icons/react';

export default function SignalScanner() {
  const [input, setInput] = useState('');
  const [status, setStatus] = useState<'idle' | 'scanning' | 'complete'>('idle');
  const [result, setResult] = useState<any>(null);

  const signals = [
    { label: 'Retention Analysis', color: 'text-blue-400' },
    { label: 'Niche Saturation', color: 'text-purple-400' },
    { label: 'Algorithm Alignment', color: 'text-emerald-400' },
    { label: 'Thumbnail Heatmap', color: 'text-orange-400' },
  ];

  const handleScan = async () => {
    if (!input) return;
    setStatus('scanning');

    // Simulate a "Deep Scan" experience
    await new Promise((r) => setTimeout(r, 2000));

    setResult({
      signal: 'Retention Spike at 0:42',
      insight:
        'Your viewers drop off during the transition to the main topic. A faster hook could increase watch time.',
      impact: 'Improved Watch Time',
    });
    setStatus('complete');
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-8 rounded-3xl border border-[var(--border)] bg-[var(--card)] shadow-2xl relative overflow-hidden">
      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-[var(--accent)]/20 text-[var(--accent)]">
            <MagnifyingGlass size={24} />
          </div>
          <h3 className="text-xl font-bold tracking-tight">Creator Signal Scanner</h3>
        </div>

        <div className="flex gap-3 mb-8">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Enter YouTube handle (@channel)"
            className="flex-1 bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[var(--accent)] outline-none transition-all"
          />
          <button
            onClick={handleScan}
            disabled={status === 'scanning' || !input}
            className="ios-button ios-button-tinted px-6 py-3 flex items-center gap-2 font-bold"
          >
            {status === 'scanning' ? (
              <CircleNotch className="animate-spin" size={18} />
            ) : (
              <Lightning size={18} />
            )}
            {status === 'scanning' ? 'Scanning...' : 'Scan'}
          </button>
        </div>

        <AnimatePresence mode="wait">
          {status === 'idle' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-2 gap-4"
            >
              {signals.map((s, i) => (
                <div
                  key={i}
                  className="p-4 rounded-2xl border border-[var(--border)] bg-[var(--bg-primary)]/50 flex items-center gap-3"
                >
                  <div className="w-2 h-2 rounded-full bg-[var(--accent)] animate-pulse" />
                  <span className="text-xs font-medium text-[var(--label-secondary)]">
                    {s.label}
                  </span>
                </div>
              ))}
            </motion.div>
          )}

          {status === 'scanning' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="py-12 flex flex-col items-center justify-center text-center"
            >
              <div className="relative w-24 h-24 mb-6">
                <div className="absolute inset-0 border-4 border-[var(--accent)]/20 rounded-full" />
                <div className="absolute inset-0 border-4 border-t-[var(--accent)] rounded-full animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Lightning size={32} className="text-[var(--accent)] animate-pulse" />
                </div>
              </div>
              <p className="text-sm font-medium text-[var(--label-secondary)] animate-pulse">
                Analyzing channel telemetry and algorithm alignment...
              </p>
            </motion.div>
          )}

          {status === 'complete' && result && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="p-6 rounded-2xl border border-[var(--accent)] bg-[var(--accent)]/5"
            >
              <div className="flex items-center gap-2 text-[var(--accent)] mb-2">
                <CheckCircle size={18} />
                <span className="text-xs font-bold uppercase tracking-widest">Signal Found</span>
              </div>
              <h4 className="text-lg font-bold mb-2">{result.signal}</h4>
              <p className="text-sm text-[var(--label-secondary)] mb-4 leading-relaxed">
                {result.insight}
              </p>
              <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border)]">
                <span className="text-xs font-medium">Estimated Impact:</span>
                <span className="text-xs font-bold text-[var(--accent)]">{result.impact}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Background glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--accent)]/10 blur-[100px] rounded-full -mr-32 -mt-32" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/10 blur-[100px] rounded-full -ml-32 -mb-32" />
    </div>
  );
}
