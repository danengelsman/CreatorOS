import React, { useState } from 'react';
import { ArrowsClockwise, Copy, Check, TiktokLogo, TwitterLogo, LinkedinLogo } from '@phosphor-icons/react';
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
          placeholder="Paste your successful content here..."
        />
        <div className="mt-4 flex justify-end">
          <button
            onClick={handleGenerate}
            disabled={!inputContent.trim() || isGenerating}
            className="ios-btn ios-btn-primary"
          >
            {isGenerating ? (
              <span className="flex items-center gap-2">
                <ArrowsClockwise className="animate-spin" /> Analyzing...
              </span>
            ) : (
              'Repurpose Content'
            )}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {results && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            {/* TikTok */}
            <section>
              <div className="flex items-center gap-2 mb-4 text-[#00f2fe]">
                <TiktokLogo size={24} weight="fill" />
                <h2 className="text-xl font-bold">TikTok Shorts</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {results.tiktok?.map((item: any, i: number) => (
                  <div key={`tk-${i}`} className="bg-[var(--bg-tertiary)] ios-card p-4 space-y-3 relative group">
                    <button 
                      onClick={() => copyToClipboard(item.script, `tk-${i}`)}
                      className="absolute top-4 right-4 p-2 rounded-full bg-[var(--separator)] text-[var(--label-secondary)] hover:text-[var(--label-primary)] transition-colors opacity-0 group-hover:opacity-100"
                    >
                      {copiedId === `tk-${i}` ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                    </button>
                    <div>
                      <span className="text-xs font-semibold text-[#00f2fe] uppercase tracking-wider">Hook</span>
                      <p className="font-medium text-[var(--label-primary)]">{item.hook}</p>
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-[var(--label-secondary)] uppercase tracking-wider">Script</span>
                      <p className="text-sm text-[var(--label-secondary)] whitespace-pre-wrap">{item.script}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Twitter */}
            <section>
              <div className="flex items-center gap-2 mb-4 text-[#1DA1F2]">
                <TwitterLogo size={24} weight="fill" />
                <h2 className="text-xl font-bold">Twitter Threads</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {results.twitter?.map((item: any, i: number) => (
                  <div key={`tw-${i}`} className="bg-[var(--bg-tertiary)] ios-card p-4 relative group">
                    <button 
                      onClick={() => copyToClipboard(item.tweet, `tw-${i}`)}
                      className="absolute top-4 right-4 p-2 rounded-full bg-[var(--separator)] text-[var(--label-secondary)] hover:text-[var(--label-primary)] transition-colors opacity-0 group-hover:opacity-100"
                    >
                      {copiedId === `tw-${i}` ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                    </button>
                    <p className="text-[var(--label-primary)] whitespace-pre-wrap">{item.tweet}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* LinkedIn */}
            <section>
              <div className="flex items-center gap-2 mb-4 text-[#0A66C2]">
                <LinkedinLogo size={24} weight="fill" />
                <h2 className="text-xl font-bold">LinkedIn Posts</h2>
              </div>
              <div className="grid grid-cols-1 gap-4">
                {results.linkedin?.map((item: any, i: number) => (
                  <div key={`li-${i}`} className="bg-[var(--bg-tertiary)] ios-card p-6 relative group">
                    <button 
                      onClick={() => copyToClipboard(item.post, `li-${i}`)}
                      className="absolute top-6 right-6 p-2 rounded-full bg-[var(--separator)] text-[var(--label-secondary)] hover:text-[var(--label-primary)] transition-colors opacity-0 group-hover:opacity-100"
                    >
                      {copiedId === `li-${i}` ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                    </button>
                    <h3 className="font-bold text-lg text-[var(--label-primary)] mb-2">{item.title}</h3>
                    <p className="text-[var(--label-secondary)] whitespace-pre-wrap">{item.post}</p>
                  </div>
                ))}
              </div>
            </section>

          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
