import React, { useState } from 'react';
import { ArrowsClockwise, Copy, Check } from '@phosphor-icons/react';
import { repurposeContent } from '../services/gemini';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

export default function ContentRepurposer() {
  const [inputContent, setInputContent] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [results, setResults] = useState<any>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!inputContent.trim()) return;
    
    setIsGenerating(true);
    setResults(null);
    setErrorMsg('');
    
    try {
      const repurposed = await repurposeContent(inputContent);
      setResults(repurposed);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to repurpose content');
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-8 pb-20">
      <h1 className="font-serif text-[36px] font-semibold tracking-[-0.015em] text-[var(--label-primary)] px-1 pt-4">Content Repurposer</h1>
      
      <div className="bg-[var(--bg-tertiary)] ios-card p-6">
        <label className="ios-label block mb-2">Original Content (e.g. YouTube script, blog post)</label>
        <textarea
          value={inputContent}
          onChange={(e) => setInputContent(e.target.value)}
          className="ios-input h-48 w-full resize-none p-4"
          placeholder="Paste your successful long-form content here..."
        />
        {errorMsg && (
          <p className="mt-2 text-sm text-[var(--system-red)]">{errorMsg}</p>
        )}
        <div className="mt-4 flex justify-end">
          <button
            onClick={handleGenerate}
            disabled={!inputContent.trim() || isGenerating}
            className="ios-btn ios-btn-primary"
          >
            {isGenerating ? (
              <span className="flex items-center gap-2">
                <ArrowsClockwise className="animate-spin" /> Analyzing Content...
              </span>
            ) : (
              'Repurpose Content'
            )}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {results?.platforms && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-10"
          >
            {results.platforms.map((platformData: any, pIndex: number) => (
              <section key={`platform-${pIndex}`}>
                <div className="flex items-center gap-3 mb-6" style={{ color: platformData.color || 'var(--label-primary)' }}>
                  <span className="text-3xl">{platformData.icon}</span>
                  <h2 className="text-2xl font-bold tracking-tight">{platformData.platform}</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {platformData.ideas?.map((item: any, i: number) => (
                    <div key={`idea-${pIndex}-${i}`} className="bg-[var(--bg-tertiary)] ios-card p-6 flex flex-col relative group shadow-sm border border-[var(--separator)] transition-shadow hover:shadow-md">
                      <button 
                        onClick={() => copyToClipboard(item.draft, `copy-${pIndex}-${i}`)}
                        className="absolute top-4 right-4 p-2 rounded-full bg-[var(--bg-secondary)] border border-[var(--separator)] text-[var(--label-secondary)] hover:text-[var(--label-primary)] transition-colors opacity-0 group-hover:opacity-100 shadow-sm z-10"
                        title="Copy Draft"
                      >
                        {copiedId === `copy-${pIndex}-${i}` ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                      </button>
                      
                      <h3 className="font-bold text-lg text-[var(--label-primary)] mb-4 pr-10 leading-tight">
                        {item.title}
                      </h3>

                      <div className="space-y-4 flex-1 flex flex-col">
                        <div>
                          <span className="text-[11px] font-bold text-[var(--label-tertiary)] uppercase tracking-wider mb-1 block">Transformation Concept</span>
                          <p className="text-[14px] font-medium text-[var(--label-secondary)] leading-relaxed">{item.transformation}</p>
                        </div>
                        
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                          <div className="bg-[var(--bg-secondary)] p-3 rounded-xl border border-[var(--separator)]">
                            <span className="text-[11px] font-bold text-[var(--label-tertiary)] uppercase tracking-wider mb-1 flex items-center gap-1">
                              Format
                            </span>
                            <p className="text-[13px] text-[var(--label-secondary)] leading-relaxed">{item.format_changes}</p>
                          </div>
                          <div className="bg-[var(--bg-secondary)] p-3 rounded-xl border border-[var(--separator)]">
                            <span className="text-[11px] font-bold text-[var(--label-tertiary)] uppercase tracking-wider mb-1 flex items-center gap-1">
                              Optimizations
                            </span>
                            <p className="text-[13px] text-[var(--label-secondary)] leading-relaxed">{item.optimizations}</p>
                          </div>
                        </div>

                        <div className="pt-4 mt-auto border-t border-[var(--separator)]">
                          <span className="text-[11px] font-bold text-[var(--label-tertiary)] uppercase tracking-wider mb-2 block">Generated Draft</span>
                          <div className="bg-[var(--bg-secondary)] rounded-xl p-4 border border-[var(--separator)] max-h-64 overflow-y-auto custom-scrollbar">
                            <p className="text-[14px] text-[var(--label-primary)] whitespace-pre-wrap font-serif leading-relaxed">{item.draft}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
