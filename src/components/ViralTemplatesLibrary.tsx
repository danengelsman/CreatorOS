import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkle, Copy, ArrowRight, Video, TwitterLogo, InstagramLogo, YoutubeLogo, TiktokLogo, FileText, CheckCircle, MagicWand, X, Cards } from '@phosphor-icons/react';
import { apiFetch } from '../firebase';
import { cn } from '../lib/utils';

const TEMPLATES = [
  {
    id: 't1',
    title: 'The Contrarian Thread',
    platform: 'Twitter',
    type: 'Thread',
    hook: 'Everyone says [Common Advice]. They are dead wrong. Here is what actually works:',
    body: '1. [Point 1]\n2. [Point 2]\n3. [Point 3]\n\nThe reality is that [Core Truth]. Stop doing [Common Mistake] and start [New Approach].',
    description: 'Perfect for challenging industry norms and driving engagement through debate.'
  },
  {
    id: 't2',
    title: '3 Reasons Why',
    platform: 'TikTok',
    type: 'Short Form Video',
    hook: '3 reasons why your [Pain Point] is actually because of [Surprising Cause].',
    body: 'Reason 1: [Explanation 1]\nReason 2: [Explanation 2]\nReason 3: [Explanation 3]\n\nIf you want to fix this, you need to [Actionable Advice]. Save this for later!',
    description: 'A classic, highly-retained format that holds attention with a numbered list.'
  },
  {
    id: 't3',
    title: 'Behind the Scenes Process',
    platform: 'Instagram',
    type: 'Reel',
    hook: 'Come with me to [Do Specific Task] as a [Your Profession].',
    body: 'First, I always start by [Step 1].\nThen, the most important part is [Step 2] because [Reason].\nFinally, we finish up with [Step 3].\n\nWhat does your process look like? Let me know below!',
    description: 'Builds connection and authority by showing the real work behind the results.'
  },
  {
    id: 't4',
    title: 'The "How I..." Story',
    platform: 'YouTube Shorts',
    type: 'Storytime',
    hook: 'How I went from [Negative State] to [Positive State] in just [Timeframe].',
    body: 'It started when I realized [Epiphany].\nInstead of doing [Normal Thing], I decided to try [Crazy Thing].\nAnd the results? [Show Results].\n\nHere is the exact framework I used:\n1. [Framework Step 1]\n2. [Framework Step 2]',
    description: 'A storytelling structure that hooks viewers with transformation.'
  },
  {
    id: 't5',
    title: 'The Common Mistake',
    platform: 'LinkedIn',
    type: 'Post',
    hook: '99% of people get [Topic] completely wrong. Here is the 1% truth:',
    body: 'Most people think you need to [Common Belief].\nBut actually, [Contrarian Truth].\n\nHere are 3 ways to apply this today:\n1. [Step 1]\n2. [Step 2]\n3. [Step 3]',
    description: 'Positions you as a thought leader by correcting a misconception.'
  },
  {
    id: 't6',
    title: 'The Quick Tutorial',
    platform: 'TikTok',
    type: 'Educational',
    hook: 'Here is exactly how to [Achieve Desired Result] without [Common Pain Point].',
    body: 'Step 1: Do [Action 1]. This ensures [Benefit].\nStep 2: Apply [Action 2]. This is crucial because [Reason].\nStep 3: Finish with [Action 3].\n\nTry this on your next [Project/Task] and thank me later!',
    description: 'Fast-paced, value-dense format that encourages saves and shares.'
  }
];

const PLATFORM_ICONS: Record<string, any> = {
  'Twitter': TwitterLogo,
  'TikTok': TiktokLogo,
  'Instagram': InstagramLogo,
  'YouTube Shorts': YoutubeLogo,
  'LinkedIn': FileText
};

export default function ViralTemplatesLibrary({ brand, onSelectTemplate }: { brand: any, onSelectTemplate: (template: any) => void }) {
  const [selectedPlatform, setSelectedPlatform] = useState<string>('All');
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  
  // Customization state
  const [isTailoring, setIsTailoring] = useState(false);
  const [tailoredVersion, setTailoredVersion] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const platforms = ['All', ...Array.from(new Set(TEMPLATES.map(t => t.platform)))];
  const filteredTemplates = selectedPlatform === 'All' 
    ? TEMPLATES 
    : TEMPLATES.filter(t => t.platform === selectedPlatform);

  const handleTailorToBrand = async () => {
    if (!selectedTemplate) return;
    
    setIsTailoring(true);
    setErrorMsg('');
    try {
      const prompt = `Adapt the following viral content template specifically for this creator's brand and niche.
      
      Creator Brand Name: ${brand?.name || 'Content Creator'}
      Niche / Tagline: ${brand?.tagline || 'General content creation'}
      Archetype: ${brand?.archetype || 'Unknown'}

      Original Template Title: ${selectedTemplate.title}
      Original Hook: ${selectedTemplate.hook}
      Original Body: ${selectedTemplate.body}

      INSTRUCTIONS:
      1. Rewrite the hook and body to perfectly fit the creator's niche and tone.
      2. Fill in the placeholder brackets with highly specific, relevant examples from their industry.
      3. Keep the underlying psychological structure (the reason it's viral) intact.
      4. Do not just return brackets; actually write a ready-to-post script/post.

      Return a JSON object with:
      "tailored_title" (string)
      "tailored_hook" (string)
      "tailored_body" (string)`;

      const response = await apiFetch('/api/gemini/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: "gemini-3.8-flash",
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: "OBJECT",
              properties: {
                tailored_title: { type: "STRING" },
                tailored_hook: { type: "STRING" },
                tailored_body: { type: "STRING" }
              },
              required: ["tailored_title", "tailored_hook", "tailored_body"]
            }
          }
        })
      });

      if (!response.ok) { const err = await response.json().catch(()=>({})); throw new Error(err.error || "Failed to tailor template."); }
      const data = await response.json();
      
      if (data.text) {
        const parsed = JSON.parse(data.text);
        setTailoredVersion({
          title: parsed.tailored_title,
          hook: parsed.tailored_hook,
          body: parsed.tailored_body,
          platform: selectedTemplate.platform
        });
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error tailoring template.');
    } finally {
      setIsTailoring(false);
    }
  };

  const handleUseTemplate = () => {
    if (tailoredVersion) {
      onSelectTemplate(tailoredVersion);
    } else if (selectedTemplate) {
      onSelectTemplate(selectedTemplate);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto pb-20 relative">
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
        <div>
          <h2 className="font-serif text-[28px] font-semibold text-[var(--label-primary)] flex items-center gap-2">
            <Cards size={28} className="text-[var(--accent)]" weight="fill" />
            Viral Templates Library
          </h2>
          <p className="text-[15px] text-[var(--label-secondary)] mt-1">
            Proven structures for high-retention content. Use them as-is or let AI tailor them to your brand.
          </p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {platforms.map(platform => (
            <button
              key={platform}
              onClick={() => setSelectedPlatform(platform)}
              className={cn(
                "px-4 py-1.5 rounded-full text-[13px] font-bold transition-all duration-200",
                selectedPlatform === platform
                  ? "bg-[var(--accent)] text-white shadow-md"
                  : "bg-[var(--bg-secondary)] text-[var(--label-secondary)] hover:bg-[var(--separator)]"
              )}
            >
              {platform}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredTemplates.map((template, idx) => {
          const Icon = PLATFORM_ICONS[template.platform] || FileText;
          return (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              key={template.id}
              onClick={() => {
                setSelectedTemplate(template);
                setTailoredVersion(null);
                setErrorMsg('');
              }}
              className="bg-[var(--bg-secondary)] border border-[var(--separator)] rounded-2xl p-5 hover:border-[var(--accent)] hover:shadow-lg transition-all cursor-pointer group flex flex-col h-full"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-[var(--bg-tertiary)] rounded-full text-[var(--label-secondary)] group-hover:text-[var(--accent)] transition-colors">
                    <Icon size={18} weight="fill" />
                  </div>
                  <span className="text-[12px] font-bold text-[var(--label-secondary)] uppercase tracking-wider">
                    {template.platform} • {template.type}
                  </span>
                </div>
              </div>
              
              <h3 className="font-serif text-[18px] font-semibold text-[var(--label-primary)] mb-2">
                {template.title}
              </h3>
              
              <p className="text-[14px] text-[var(--label-secondary)] mb-4 flex-1">
                {template.description}
              </p>
              
              <div className="bg-[var(--bg-tertiary)] p-3 rounded-xl border border-[var(--separator)]/50 mt-auto">
                <span className="text-[11px] uppercase tracking-wider font-bold text-[var(--label-tertiary)] mb-1 block">Hook Preview</span>
                <p className="text-[13px] text-[var(--label-primary)] font-medium line-clamp-2 italic">
                  "{template.hook}"
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Detail / Customization Modal */}
      <AnimatePresence>
        {selectedTemplate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-[var(--bg-primary)] border border-[var(--separator)] shadow-2xl rounded-[24px] w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden"
            >
              <div className="flex items-center justify-between p-5 border-b border-[var(--separator)] bg-[var(--bg-secondary)]/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-[var(--bg-tertiary)] rounded-xl text-[var(--accent)]">
                    {React.createElement(PLATFORM_ICONS[selectedTemplate.platform] || FileText, { size: 24, weight: "fill" })}
                  </div>
                  <div>
                    <h3 className="font-serif text-[20px] font-bold text-[var(--label-primary)]">
                      {tailoredVersion ? tailoredVersion.title : selectedTemplate.title}
                    </h3>
                    <span className="text-[13px] text-[var(--label-secondary)] font-medium">
                      {selectedTemplate.platform} • {selectedTemplate.type}
                    </span>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedTemplate(null)}
                  className="p-2 text-[var(--label-secondary)] hover:bg-[var(--bg-tertiary)] rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 overflow-y-auto flex-1 space-y-6">
                {errorMsg && (
                  <div className="p-3 rounded-xl bg-red-500/10 text-red-500 text-[13px] font-bold border border-red-500/20">
                    {errorMsg}
                  </div>
                )}

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] uppercase tracking-wider font-bold text-[var(--label-tertiary)]">The Hook</span>
                    {tailoredVersion && <span className="text-[10px] font-bold uppercase bg-[var(--accent)]/10 text-[var(--accent)] px-2 py-0.5 rounded-sm">AI Tailored</span>}
                  </div>
                  <div className={cn(
                    "p-4 rounded-xl text-[15px] leading-relaxed font-medium border",
                    tailoredVersion 
                      ? "bg-[var(--accent)]/5 border-[var(--accent)]/20 text-[var(--label-primary)]" 
                      : "bg-[var(--bg-secondary)] border-[var(--separator)] text-[var(--label-secondary)] italic"
                  )}>
                    "{tailoredVersion ? tailoredVersion.hook : selectedTemplate.hook}"
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] uppercase tracking-wider font-bold text-[var(--label-tertiary)]">Script / Body</span>
                  </div>
                  <div className={cn(
                    "p-4 rounded-xl text-[14px] leading-relaxed whitespace-pre-wrap border",
                    tailoredVersion 
                      ? "bg-[var(--accent)]/5 border-[var(--accent)]/20 text-[var(--label-primary)]" 
                      : "bg-[var(--bg-secondary)] border-[var(--separator)] text-[var(--label-secondary)]"
                  )}>
                    {tailoredVersion ? tailoredVersion.body : selectedTemplate.body}
                  </div>
                </div>
              </div>

              <div className="p-5 border-t border-[var(--separator)] bg-[var(--bg-secondary)]/50 flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleTailorToBrand}
                  disabled={isTailoring || (!!tailoredVersion)}
                  className="flex-1 ios-button bg-[var(--bg-primary)] border border-[var(--accent)] text-[var(--accent)] px-4 py-3 rounded-xl text-[14px] font-bold hover:bg-[var(--accent)]/5 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isTailoring ? (
                    <>
                      <Sparkle size={18} className="animate-pulse" weight="fill" />
                      Tailoring to your brand...
                    </>
                  ) : tailoredVersion ? (
                    <>
                      <CheckCircle size={18} weight="fill" />
                      Tailored to Brand
                    </>
                  ) : (
                    <>
                      <MagicWand size={18} weight="fill" />
                      Tailor to my Brand with AI
                    </>
                  )}
                </button>
                
                <button
                  onClick={handleUseTemplate}
                  className="flex-1 ios-button bg-[var(--accent)] text-white px-4 py-3 rounded-xl text-[14px] font-bold hover:bg-[var(--accent)]/90 shadow-lg shadow-[var(--accent)]/20 transition-all flex items-center justify-center gap-2"
                >
                  Use Template in Editor
                  <ArrowRight size={18} weight="bold" />
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
