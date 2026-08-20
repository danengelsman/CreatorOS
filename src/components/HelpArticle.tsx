import React from 'react';
import { CaretLeft as ChevronLeft, PlayCircle, Info, Lightning, FilmScript, Layout, Sparkle } from '@phosphor-icons/react';

const ARTICLES: Record<string, { title: string; version: string; content: React.ReactNode }> = {
  'getting-started': {
    title: 'Getting Started',
    version: '1.2.0',
    content: (
      <div className="space-y-6">
        <p className="text-[15px] leading-relaxed text-[var(--label-secondary)]">
          Welcome to CreatorOS! This guide will help you set up your workspace, connect your accounts, and start creating content that converts.
        </p>
        
        <div className="bg-[var(--bg-secondary)] rounded-2xl overflow-hidden border border-[var(--separator)]">
          <div className="aspect-video bg-black/5 flex flex-col items-center justify-center relative">
            <img loading="lazy" src="https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?auto=format&fit=crop&w=800&q=80" alt="Getting Started Dashboard" className="absolute inset-0 w-full h-full object-cover opacity-50 mix-blend-overlay" />
            <PlayCircle size={48} className="text-[var(--accent)] z-10 cursor-pointer drop-shadow-md hover:scale-110 transition-transform" weight="fill" />
            <span className="mt-2 font-semibold text-[13px] z-10 text-[var(--label-primary)]">Watch: OS Setup Walkthrough (2:14)</span>
          </div>
        </div>

        <h3 className="font-bold text-[18px] text-[var(--label-primary)] mt-8">1. Profile & Connections</h3>
        <p className="text-[15px] leading-relaxed text-[var(--label-secondary)]">
          Start by heading to the <strong>Profile</strong> tab (bottom left). Connect your YouTube and TikTok accounts. We use read-only access to pull analytics directly into your First Dollar dashboard.
        </p>

        <h3 className="font-bold text-[18px] text-[var(--label-primary)] mt-8">2. Setting Up Your Brand</h3>
        <p className="text-[15px] leading-relaxed text-[var(--label-secondary)]">
          Before creating content, navigate to the <strong>Brand</strong> tab. Tell our AI about your niche (e.g., "Minimalist tech reviews"), and we'll generate a complete style guide—colors, typography, and voice—that will anchor all your generated content.
        </p>

        <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-xl flex items-start gap-3 mt-4">
          <Info size={20} className="text-blue-500 mt-0.5 flex-shrink-0" weight="fill" />
          <p className="text-[13px] text-blue-500/90 font-medium leading-relaxed">
            Pro Tip: Your Brand Voice is used across the OS. If you find your generated scripts sound too formal, adjust your Brand Voice in the Identity Architect to be "casual" or "witty."
          </p>
        </div>
      </div>
    )
  },
  'branding': {
    title: 'Branding Engine',
    version: '1.2.0',
    content: (
      <div className="space-y-6">
        <p className="text-[15px] leading-relaxed text-[var(--label-secondary)]">
          The Branding Engine (Identity Architect) is the heart of your digital DNA. It ensures consistency across all your platforms.
        </p>

        <div className="bg-[var(--bg-secondary)] rounded-2xl overflow-hidden border border-[var(--separator)]">
          <div className="aspect-video bg-black/5 flex flex-col items-center justify-center relative">
            <img loading="lazy" src="https://images.unsplash.com/photo-1561070791-2526d30994b5?auto=format&fit=crop&w=800&q=80" alt="Branding Engine" className="absolute inset-0 w-full h-full object-cover opacity-50 mix-blend-overlay" />
            <PlayCircle size={48} className="text-[var(--accent)] z-10 cursor-pointer drop-shadow-md hover:scale-110 transition-transform" weight="fill" />
            <span className="mt-2 font-semibold text-[13px] z-10 text-[var(--label-primary)]">Watch: Designing Your Digital DNA (3:45)</span>
          </div>
        </div>

        <h3 className="font-bold text-[18px] text-[var(--label-primary)] mt-8">Creating a Brand Guide</h3>
        <ol className="list-decimal list-inside space-y-3 text-[15px] leading-relaxed text-[var(--label-secondary)]">
          <li>Navigate to the <strong>Brand</strong> tab.</li>
          <li>Enter a description of your content and vibe (e.g., "High-energy fitness tutorials").</li>
          <li>Click <strong>Generate Brand Identity</strong>.</li>
          <li>Review your new Color Palette, Typography rules, and Tone of Voice.</li>
        </ol>

        <h3 className="font-bold text-[18px] text-[var(--label-primary)] mt-8">Generating a Logo</h3>
        <p className="text-[15px] leading-relaxed text-[var(--label-secondary)]">
          Once your brand is defined, scroll down to the Brand Logo section. The system will use your new color palette to generate custom vector-style icons representing your brand.
        </p>

        <h3 className="font-bold text-[18px] text-[var(--label-primary)] mt-8">AI Avatar Generator</h3>
        <p className="text-[15px] leading-relaxed text-[var(--label-secondary)]">
          Need a profile picture for your CreatorOS account? Navigate to the <strong>Profile</strong> tab (bottom left) and click the <strong>AI Avatar Generator</strong> button to create a custom profile picture using text prompts or photo transformations.
        </p>
      </div>
    )
  },
  'studio-workflow': {
    title: 'Content Studio Workflow',
    version: '1.2.0',
    content: (
      <div className="space-y-6">
        <p className="text-[15px] leading-relaxed text-[var(--label-secondary)]">
          The Content Studio is your primary writing environment. It includes a rich text editor, AI polish tools, and connects directly to the Scene Planner and Retention Lab.
        </p>

        <div className="bg-[var(--bg-secondary)] rounded-2xl overflow-hidden border border-[var(--separator)]">
          <div className="aspect-video bg-black/5 flex flex-col items-center justify-center relative">
            <img loading="lazy" src="https://images.unsplash.com/photo-1542435503-956c469947f6?auto=format&fit=crop&w=800&q=80" alt="Content Studio" className="absolute inset-0 w-full h-full object-cover opacity-50 mix-blend-overlay" />
            <PlayCircle size={48} className="text-[var(--accent)] z-10 cursor-pointer drop-shadow-md hover:scale-110 transition-transform" weight="fill" />
            <span className="mt-2 font-semibold text-[13px] z-10 text-[var(--label-primary)]">Watch: Writing Faster with AI (4:12)</span>
          </div>
        </div>

        <h3 className="font-bold text-[18px] text-[var(--label-primary)] mt-8">Drafting & Polishing</h3>
        <p className="text-[15px] leading-relaxed text-[var(--label-secondary)]">
          Start typing your script or blog post. Highlight any text and use the <strong>AI Polish</strong> button to fix grammar, adjust tone, or expand on ideas. 
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div className="p-4 rounded-xl border border-[var(--separator)] bg-[var(--bg-secondary)]">
            <Lightning size={24} className="text-amber-500 mb-2" weight="fill" />
            <h4 className="font-bold text-[14px] text-[var(--label-primary)]">Hook Optimization</h4>
            <p className="text-[12px] text-[var(--label-secondary)] mt-1">
              Once your draft is ready, switch to the <strong>Retention Lab</strong> tab to optimize your opening lines.
            </p>
          </div>
          <div className="p-4 rounded-xl border border-[var(--separator)] bg-[var(--bg-secondary)]">
            <Layout size={24} className="text-blue-500 mb-2" weight="fill" />
            <h4 className="font-bold text-[14px] text-[var(--label-primary)]">Visual Planning</h4>
            <p className="text-[12px] text-[var(--label-secondary)] mt-1">
              Switch to the <strong>Scene Planner</strong> tab to break your script down into camera shots.
            </p>
          </div>
        </div>
      </div>
    )
  },
  'scene-planner': {
    title: 'Scene Planner',
    version: '1.2.0',
    content: (
      <div className="space-y-6">
        <p className="text-[15px] leading-relaxed text-[var(--label-secondary)]">
          The Scene Planner takes your finished script and automatically segments it into timed visual beats, assigning camera shot lists and generating visual concepts.
        </p>

        <div className="bg-[var(--bg-secondary)] rounded-2xl overflow-hidden border border-[var(--separator)]">
          <div className="aspect-video bg-black/5 flex flex-col items-center justify-center relative">
            <img loading="lazy" src="https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?auto=format&fit=crop&w=800&q=80" alt="Scene Planner" className="absolute inset-0 w-full h-full object-cover opacity-50 mix-blend-overlay" />
            <PlayCircle size={48} className="text-[var(--accent)] z-10 cursor-pointer drop-shadow-md hover:scale-110 transition-transform" weight="fill" />
            <span className="mt-2 font-semibold text-[13px] z-10 text-[var(--label-primary)]">Watch: Automated Shot Lists (2:50)</span>
          </div>
        </div>

        <h3 className="font-bold text-[18px] text-[var(--label-primary)] mt-8">How to use the Scene Planner</h3>
        <ol className="list-decimal list-inside space-y-3 text-[15px] leading-relaxed text-[var(--label-secondary)]">
          <li>Write your script in the <strong>Content Studio (Editor)</strong>.</li>
          <li>Click the <strong>Scene Planner</strong> tab at the top of the editor.</li>
          <li>Click <strong>Segment Script into Visual Beats</strong>.</li>
          <li>The AI will read your script and generate a timeline with estimated durations.</li>
        </ol>

        <div className="bg-[var(--bg-tertiary)] p-5 rounded-2xl border border-[var(--separator)] mt-6">
          <h4 className="font-bold text-[15px] text-[var(--label-primary)] flex items-center gap-2 mb-2">
            <FilmScript size={18} className="text-[var(--accent)]" /> Understanding the Output
          </h4>
          <p className="text-[13px] leading-relaxed text-[var(--label-secondary)]">
            For every beat, the Planner gives you two options: <strong>Plan A</strong> (a generic search query you can use on stock video sites) and <strong>Plan B</strong> (a detailed AI image prompt you can use in the Video Studio).
          </p>
        </div>
      </div>
    )
  },
  'retention-lab': {
    title: 'Retention Lab',
    version: '1.2.0',
    content: (
      <div className="space-y-6">
        <p className="text-[15px] leading-relaxed text-[var(--label-secondary)]">
          80% of viewers drop off in the first 5 seconds. The Retention Lab diagnoses your video hook and provides algorithmic optimizations to keep viewers watching.
        </p>

        <div className="bg-[var(--bg-secondary)] rounded-2xl overflow-hidden border border-[var(--separator)]">
          <div className="aspect-video bg-black/5 flex flex-col items-center justify-center relative">
            <img loading="lazy" src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800&q=80" alt="Retention Lab" className="absolute inset-0 w-full h-full object-cover opacity-50 mix-blend-overlay" />
            <PlayCircle size={48} className="text-[var(--accent)] z-10 cursor-pointer drop-shadow-md hover:scale-110 transition-transform" weight="fill" />
            <span className="mt-2 font-semibold text-[13px] z-10 text-[var(--label-primary)]">Watch: Fixing Your Hooks (5:10)</span>
          </div>
        </div>

        <h3 className="font-bold text-[18px] text-[var(--label-primary)] mt-8">Diagnosing Your Hook</h3>
        <p className="text-[15px] leading-relaxed text-[var(--label-secondary)]">
          Paste the first 2-3 sentences of your script into the lab. Click analyze, and our AI will simulate a viewer's attention span, providing a score out of 100%.
        </p>

        <h3 className="font-bold text-[18px] text-[var(--label-primary)] mt-8">Applying Optimizations</h3>
        <p className="text-[15px] leading-relaxed text-[var(--label-secondary)]">
          The Lab will generate 5 alternative hooks (e.g., "Curiosity Gap", "Negative Framework"). Click <strong>Apply to Editor</strong> on the one you like best to replace your original draft. Pay attention to the <em>Visual Pattern Disrupt</em> suggestions to pair your words with sudden visual changes.
        </p>
      </div>
    )
  },
  'video-studio': {
    title: 'Video Studio',
    version: '1.2.0',
    content: (
      <div className="space-y-6">
        <p className="text-[15px] leading-relaxed text-[var(--label-secondary)]">
          The Video Studio brings your Scene Plan to life. Generate AI imagery, add panning effects, and synchronize text-to-speech voiceovers.
        </p>

        <div className="bg-[var(--bg-secondary)] rounded-2xl overflow-hidden border border-[var(--separator)]">
          <div className="aspect-video bg-black/5 flex flex-col items-center justify-center relative">
            <img loading="lazy" src="https://images.unsplash.com/photo-1600132806370-bf17e65e942f?auto=format&fit=crop&w=800&q=80" alt="Video Studio" className="absolute inset-0 w-full h-full object-cover opacity-50 mix-blend-overlay" />
            <PlayCircle size={48} className="text-[var(--accent)] z-10 cursor-pointer drop-shadow-md hover:scale-110 transition-transform" weight="fill" />
            <span className="mt-2 font-semibold text-[13px] z-10 text-[var(--label-primary)]">Watch: Prototyping a Video (6:22)</span>
          </div>
        </div>

        <h3 className="font-bold text-[18px] text-[var(--label-primary)] mt-8">Generating Assets</h3>
        <ul className="list-disc list-inside space-y-3 text-[15px] leading-relaxed text-[var(--label-secondary)]">
          <li><strong>Images:</strong> Enter a prompt (or paste from the Scene Planner) and generate a 16:9 cinematic image.</li>
          <li><strong>Voiceover:</strong> Type your script, select a voice profile, and generate a lifelike TTS audio file.</li>
          <li><strong>Motion:</strong> Apply simple Ken Burns effects (Pan Left, Zoom In) directly in the preview player.</li>
        </ul>
      </div>
    )
  },
  'first-dollar': {
    title: 'First Dollar Dashboard',
    version: '1.2.0',
    content: (
      <div className="space-y-6">
        <p className="text-[15px] leading-relaxed text-[var(--label-secondary)]">
          Don't wait for ad revenue. The First Dollar dashboard guides you through monetization strategies starting from 0 subscribers.
        </p>

        <div className="bg-[var(--bg-secondary)] rounded-2xl overflow-hidden border border-[var(--separator)]">
          <div className="aspect-video bg-black/5 flex flex-col items-center justify-center relative">
            <img loading="lazy" src="https://images.unsplash.com/photo-1553729459-efe14ef6055d?auto=format&fit=crop&w=800&q=80" alt="First Dollar" className="absolute inset-0 w-full h-full object-cover opacity-50 mix-blend-overlay" />
            <PlayCircle size={48} className="text-[var(--accent)] z-10 cursor-pointer drop-shadow-md hover:scale-110 transition-transform" weight="fill" />
            <span className="mt-2 font-semibold text-[13px] z-10 text-[var(--label-primary)]">Watch: Monetizing Your Micro-Audience (4:05)</span>
          </div>
        </div>

        <h3 className="font-bold text-[18px] text-[var(--label-primary)] mt-8">Strategy Scaling</h3>
        <p className="text-[15px] leading-relaxed text-[var(--label-secondary)]">
          The dashboard automatically adjusts based on your audience size. If you have under 1,000 subscribers, it will focus you on <strong>Affiliate Links</strong> and <strong>Digital Downloads (Gumroad)</strong>. If you are over 10,000, it unlocks strategies for <strong>Sponsorship Outbound</strong> and <strong>Cohorts</strong>.
        </p>
      </div>
    )
  }
};

export default function HelpArticle({ topic, onBack }: { topic: string, onBack: () => void }) {
  const article = ARTICLES[topic] || {
    title: topic.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
    version: '1.0.0',
    content: (
      <p className="text-[17px] leading-relaxed text-[var(--label-secondary)]">
        Documentation for this topic is coming soon.
      </p>
    )
  };

  return (
    <div className="space-y-8 pb-20 max-w-4xl mx-auto w-full">
      <div className="pt-4 border-b border-[var(--separator)] pb-6">
        <button 
          onClick={onBack}
          className="flex items-center gap-1 text-[15px] font-semibold text-[var(--accent)] hover:opacity-80 transition-opacity mb-6"
        >
          <ChevronLeft size={18} strokeWidth={2} />
          Back to Help Center
        </button>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <h1 className="font-serif text-[36px] font-semibold tracking-[-0.015em] text-[var(--label-primary)]">
            {article.title}
          </h1>
          <span className="px-2.5 py-1 rounded-full bg-[var(--bg-secondary)] border border-[var(--separator)] text-[11px] font-bold text-[var(--label-tertiary)] uppercase tracking-wider">
            Updated for v{article.version}
          </span>
        </div>
      </div>

      <section className="bg-[var(--bg-tertiary)] ios-card p-6 md:p-10 shadow-sm border border-[var(--separator)]/50">
        {article.content}
      </section>
      
      <div className="flex items-center justify-center pt-8 border-t border-[var(--separator)]">
        <p className="text-[13px] text-[var(--label-tertiary)] flex items-center gap-2">
          <Sparkle size={16} /> Was this article helpful?
          <button className="ml-2 px-3 py-1 rounded-lg bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] border border-[var(--separator)] transition-colors">Yes</button>
          <button className="px-3 py-1 rounded-lg bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] border border-[var(--separator)] transition-colors">No</button>
        </p>
      </div>
    </div>
  );
}
