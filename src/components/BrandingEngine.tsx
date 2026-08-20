import React, { useState } from 'react';
import { PaperPlaneRight as Send, CheckCircle as CheckCircle2, ArrowsClockwise as RefreshCw, Chat as MessageSquare, CaretRight as ChevronRight, Palette, TextT as Type, Target, Lightning as Zap, Lightbulb, WarningCircle, FileText, X } from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import { generateBrandKit, generateContentIdeas, generateBrandLogo, generateStyleGuideSummary } from '../services/gemini';
import { cn } from '../lib/utils';
import { db, serverTimestamp, handleFirestoreError, OperationType } from '../firebase';
import { doc, setDoc, updateDoc } from 'firebase/firestore';
import BrandIcon from './BrandIcon';

export default function Brand({ brand, setBrand, user }: { brand: any, setBrand: any, user: any }) {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');


  const [isGeneratingLogo, setIsGeneratingLogo] = useState(false);
  const [isStyleGuideModalOpen, setIsStyleGuideModalOpen] = useState(false);
  const [styleGuideContent, setStyleGuideContent] = useState('');
  const [isGeneratingStyleGuide, setIsGeneratingStyleGuide] = useState(false);

  const handleGenerateStyleGuide = async () => {
    if (!brand) return;
    setIsStyleGuideModalOpen(true);
    if (brand.styleGuideSummary) {
      setStyleGuideContent(brand.styleGuideSummary);
      return;
    }
    
    setIsGeneratingStyleGuide(true);
    try {
      const summary = await generateStyleGuideSummary(brand);
      setStyleGuideContent(summary);
      
      const brandRef = doc(db, 'projects', `brand_${user.uid}`);
      await updateDoc(brandRef, {
        "data.styleGuideSummary": summary,
        updatedAt: serverTimestamp()
      }).catch(err => handleFirestoreError(err, OperationType.UPDATE, `projects/brand_${user.uid}`));
      
      setBrand({ ...brand, styleGuideSummary: summary });
    } catch (error: any) {
      console.error(error);
      setStyleGuideContent('Failed to generate style guide.');
    } finally {
      setIsGeneratingStyleGuide(false);
    }
  };

  const handleGenerateLogo = async () => {
    if (!user || !brand) return;
    setIsGeneratingLogo(true);
    try {
      const prompt = `A professional, minimalist vector brand logo for a channel with archetype '${brand.archetype}' and personality '${brand.personality}'. Primary color theme is ${brand.colors?.primary || '#000'}. Do not include text or letters, just a clean, simple flat icon or symbol. Minimalist style, thick strokes, solid colors. White background.`;
      const logoUrl = await generateBrandLogo(prompt, "1:1");
      
      const brandRef = doc(db, 'projects', `brand_${user.uid}`);
      await updateDoc(brandRef, {
        "data.logoUrl": logoUrl,
        updatedAt: serverTimestamp()
      }).catch(err => handleFirestoreError(err, OperationType.UPDATE, `projects/brand_${user.uid}`));
      
      setBrand({ ...brand, logoUrl });
    } catch (error: any) {
      console.error(error);
      setErrorMsg(error.message || 'Failed to generate logo.');
    } finally {
      setIsGeneratingLogo(false);
    }
  };

  const handleGenerate = async () => {
    if (!input || !user) return;
    setIsLoading(true);
    setErrorMsg('');
    try {
      const kit = await generateBrandKit(input);
      
      const brandRef = doc(db, 'projects', `brand_${user.uid}`);
      await setDoc(brandRef, {
        userId: user.uid,
        name: kit.name || 'Untitled Brand',
        type: 'brand_kit',
        data: kit,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }).catch(err => handleFirestoreError(err, OperationType.WRITE, `projects/brand_${user.uid}`));
      
      setBrand(kit);
    } catch (error: any) {
      console.error(error);
      setErrorMsg(error.message || 'An error occurred while generating the brand kit.');
    } finally {
      setIsLoading(false);
    }
  };

  if (brand) {
    return (
      <div className="max-w-4xl mx-auto space-y-10 pb-20 pt-6 px-4">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8 text-center sm:text-left">
          <div className="flex flex-col gap-2">
            <h1 className="font-serif text-[40px] font-semibold tracking-[-0.02em] text-[var(--label-primary)] leading-tight">Brand Kit</h1>
            <p className="text-[19px] text-[var(--label-secondary)] max-w-2xl font-medium">Your channel's core identity, visual language, and signature tone.</p>
          </div>
          <button 
            onClick={handleGenerateStyleGuide}
            className="ios-button ios-button-filled shrink-0 self-center sm:self-auto flex items-center gap-2"
          >
            <FileText size={18} weight="bold" />
            Generate Style Guide
          </button>
        </div>

        {/* Identity Overview */}
        <section className="space-y-5">
          <h3 className="text-[22px] font-semibold tracking-tight px-2 flex items-center gap-2">
            <Target size={24} className="text-[var(--accent)]" /> Identity Overview
          </h3>
          <div className="bg-[var(--bg-tertiary)] rounded-[32px] overflow-hidden border border-[var(--separator)] shadow-sm">
            <div className="p-8 sm:p-10 flex flex-col sm:flex-row items-center sm:items-start gap-8">
              <div className="flex flex-col items-center gap-4">
                <div className="relative w-24 h-24 bg-[var(--bg-secondary)] rounded-[28px] flex items-center justify-center flex-shrink-0 shadow-sm border border-[var(--separator)] overflow-hidden group">
                  {brand.logoUrl ? (
                    <>
                      <img src={brand.logoUrl} alt="Generated Brand Logo" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      <button 
                        onClick={handleGenerateLogo}
                        disabled={isGeneratingLogo}
                        className="absolute inset-0 bg-black/40 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"
                      >
                        {isGeneratingLogo ? <RefreshCw className="animate-spin" size={24} /> : <RefreshCw size={24} />}
                      </button>
                    </>
                  ) : (
                    <BrandIcon size={48} strokeWidth={1.5} className="text-[var(--accent)]" />
                  )}
                </div>
                {!brand.logoUrl && (
                  <button 
                    onClick={handleGenerateLogo}
                    disabled={isGeneratingLogo}
                    className="ios-button bg-[var(--bg-secondary)] border border-[var(--separator)] text-[var(--label-primary)] text-[13px] font-semibold px-4 py-2 rounded-full flex items-center gap-2 transition-colors hover:bg-[var(--separator)] whitespace-nowrap"
                  >
                    {isGeneratingLogo ? <RefreshCw className="animate-spin" size={16} /> : <Palette size={16} />}
                    {isGeneratingLogo ? 'Generating...' : 'Generate Logo'}
                  </button>
                )}
              </div>
              <div className="flex-1 text-center sm:text-left space-y-2 mt-2 sm:mt-0">
                <span className="text-[14px] font-semibold tracking-wider uppercase text-[var(--accent)]">Channel Archetype</span>
                <h2 className="text-[32px] font-serif font-semibold tracking-tight text-[var(--label-primary)] leading-tight">{brand.archetype}</h2>
              </div>
            </div>
            
            <div className="border-t border-[var(--separator)] p-8 sm:p-10 grid grid-cols-1 sm:grid-cols-2 gap-10 bg-[var(--bg-secondary)]/30">
               <div className="space-y-3">
                 <span className="text-[14px] font-semibold tracking-wider uppercase text-[var(--label-tertiary)] flex items-center gap-2">
                   <Target size={18} className="text-[var(--label-secondary)]" /> Personality
                 </span>
                 <p className="text-[17px] font-medium leading-relaxed text-[var(--label-primary)]">{brand.personality}</p>
               </div>
               <div className="space-y-3">
                 <span className="text-[14px] font-semibold tracking-wider uppercase text-[var(--label-tertiary)] flex items-center gap-2">
                   <Lightbulb size={18} className="text-[var(--label-secondary)]" /> Visual Style
                 </span>
                 <p className="text-[17px] font-medium leading-relaxed text-[var(--label-primary)]">{brand.visual_style}</p>
               </div>
            </div>
          </div>
        </section>

        {/* Assets & Voice Inset Grouped List */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <section className="space-y-5">
            <h3 className="text-[22px] font-semibold tracking-tight px-2 flex items-center gap-2">
              <Palette size={24} className="text-[var(--accent)]" /> Visual Identity
            </h3>
            <div className="bg-[var(--bg-tertiary)] rounded-[28px] overflow-hidden divide-y divide-[var(--separator)] border border-[var(--separator)] shadow-sm">
              <div className="p-8 flex flex-col gap-6">
                 <span className="font-semibold text-[19px]">Color Palette</span>
                 <div className="flex flex-wrap gap-5">
                    {Object.entries(brand.colors).map(([name, c]: [string, any], index: number) => {
                      return (
                        <div key={index} className="flex flex-col items-center gap-3">
                          <div 
                            className="w-16 h-16 sm:w-20 sm:h-20 rounded-[20px] shadow-sm border border-[var(--separator)] transition-transform hover:scale-105" 
                            style={{ backgroundColor: c }} 
                          />
                          <span className="text-[13px] font-medium text-[var(--label-secondary)] capitalize">{name}</span>
                        </div>
                      );
                    })}
                 </div>
              </div>
              <div className="p-8 flex items-center justify-between">
                 <div className="flex items-center gap-5">
                   <div className="w-12 h-12 rounded-[16px] flex items-center justify-center bg-[var(--bg-secondary)] border border-[var(--separator)] shadow-sm">
                     <Type size={24} className="text-[var(--accent)]" />
                   </div>
                   <div className="flex flex-col gap-1">
                     <span className="font-semibold text-[20px] tracking-tight">{brand.typography.heading}</span>
                     <span className="text-[15px] font-medium text-[var(--label-secondary)]">Primary Typeface</span>
                   </div>
                 </div>
              </div>
            </div>
          </section>

          {brand.avatar && (
            <section className="space-y-5 md:col-span-2">
              <h3 className="text-[22px] font-semibold tracking-tight px-2 flex items-center gap-2">
                <Target size={24} className="text-[var(--accent)]" /> AI Avatar Profile
              </h3>
              <div className="bg-[var(--bg-tertiary)] rounded-[28px] overflow-hidden divide-y divide-[var(--separator)] border border-[var(--separator)] shadow-sm">
                 <div className="p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="flex flex-col gap-2">
                      <span className="text-[13px] font-semibold tracking-wider uppercase text-[var(--label-tertiary)]">Gender</span>
                      <span className="text-[17px] font-medium">{brand.avatar.gender}</span>
                    </div>
                    <div className="flex flex-col gap-2">
                      <span className="text-[13px] font-semibold tracking-wider uppercase text-[var(--label-tertiary)]">Clothing</span>
                      <span className="text-[17px] font-medium">{brand.avatar.clothing}</span>
                    </div>
                    <div className="flex flex-col gap-2">
                      <span className="text-[13px] font-semibold tracking-wider uppercase text-[var(--label-tertiary)]">Sound & Voice</span>
                      <span className="text-[17px] font-medium">{brand.avatar.sound}</span>
                    </div>
                    <div className="flex flex-col gap-2">
                      <span className="text-[13px] font-semibold tracking-wider uppercase text-[var(--label-tertiary)]">Default Background</span>
                      <span className="text-[17px] font-medium">{brand.avatar.background}</span>
                    </div>
                 </div>
              </div>
            </section>
          )}

          <section className="space-y-5">
            <h3 className="text-[22px] font-semibold tracking-tight px-2 flex items-center gap-2">
              <MessageSquare size={24} className="text-[var(--accent)]" /> Writing & Tone
            </h3>
            <div className="bg-[var(--bg-tertiary)] rounded-[28px] overflow-hidden divide-y divide-[var(--separator)] border border-[var(--separator)] shadow-sm">
               <div className="p-8">
                  <span className="font-semibold text-[19px] block mb-5">Engaging Angles</span>
                  <div className="space-y-4">
                    {brand.content_hooks.slice(0, 3).map((hook: string, i: number) => (
                      <div key={i} className="p-5 bg-[var(--bg-secondary)] rounded-[20px] text-[16px] font-medium leading-relaxed border border-[var(--separator)] shadow-sm">
                        {hook}
                      </div>
                    ))}
                  </div>
               </div>
               <div className="p-8">
                  <span className="font-semibold text-[19px] block mb-5">Signature Phrases</span>
                  <div className="flex flex-wrap gap-3">
                    {brand.catchphrases.map((phrase: string, i: number) => (
                      <span key={i} className="px-5 py-2.5 bg-[var(--bg-secondary)] border border-[var(--separator)] text-[var(--label-primary)] rounded-full text-[15px] font-medium shadow-sm transition-colors hover:bg-[var(--separator)]">
                        "{phrase}"
                      </span>
                    ))}
                  </div>
               </div>
            </div>
          </section>
        </div>

        <section className="pt-8 flex justify-center">
          <button 
            onClick={() => setBrand(null)}
            className="ios-button bg-[var(--bg-secondary)] hover:bg-[var(--separator)] text-[var(--label-primary)] border border-[var(--separator)] px-8 py-3.5 rounded-full font-semibold text-[16px] transition-colors flex items-center shadow-sm"
          >
            <RefreshCw size={20} strokeWidth={2} className="mr-3" />
            Start Over / Redefine Style
          </button>
        </section>

        {/* Style Guide Modal */}
        <AnimatePresence>
          {isStyleGuideModalOpen && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsStyleGuideModalOpen(false)}
                className="absolute inset-0 bg-black/60 backdrop-blur-md"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative bg-[var(--bg-primary)] w-full max-w-3xl max-h-[85vh] rounded-[32px] shadow-2xl flex flex-col overflow-hidden border border-[var(--separator)]"
              >
                <div className="flex items-center justify-between p-6 sm:p-8 border-b border-[var(--separator)] bg-[var(--bg-secondary)]">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-[var(--accent)]/10 text-[var(--accent)] rounded-xl">
                      <FileText size={24} weight="fill" />
                    </div>
                    <div>
                      <h2 className="font-serif text-[24px] font-semibold text-[var(--label-primary)] leading-none">Brand Guidelines</h2>
                      <span className="text-[14px] font-medium text-[var(--label-secondary)] mt-1 block">Official Style Guide</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => setIsStyleGuideModalOpen(false)}
                    className="p-2 bg-[var(--bg-tertiary)] hover:bg-[var(--separator)] text-[var(--label-secondary)] rounded-full transition-colors"
                  >
                    <X size={24} />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-6 sm:p-8">
                  {isGeneratingStyleGuide ? (
                    <div className="flex flex-col items-center justify-center py-20 space-y-4">
                      <div className="w-12 h-12 border-4 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
                      <p className="text-[17px] font-medium text-[var(--label-secondary)]">Drafting official guidelines...</p>
                    </div>
                  ) : (
                    <div className="max-w-none space-y-4
                      [&>h1]:text-[32px] [&>h1]:font-serif [&>h1]:font-bold [&>h1]:text-[var(--label-primary)] [&>h1]:mt-8 [&>h1]:mb-4
                      [&>h2]:text-[24px] [&>h2]:font-serif [&>h2]:font-semibold [&>h2]:text-[var(--label-primary)] [&>h2]:mt-8 [&>h2]:mb-4
                      [&>h3]:text-[20px] [&>h3]:font-serif [&>h3]:font-semibold [&>h3]:text-[var(--label-primary)] [&>h3]:mt-6 [&>h3]:mb-3
                      [&>p]:text-[16px] [&>p]:leading-relaxed [&>p]:text-[var(--label-secondary)] [&>p]:mb-4
                      [&>ul]:list-disc [&>ul]:pl-5 [&>ul]:mb-4 [&>ul>li]:text-[16px] [&>ul>li]:text-[var(--label-secondary)] [&>ul>li]:mb-1
                      [&>ol]:list-decimal [&>ol]:pl-5 [&>ol]:mb-4 [&>ol>li]:text-[16px] [&>ol>li]:text-[var(--label-secondary)] [&>ol>li]:mb-1
                      [&_strong]:text-[var(--label-primary)] [&_strong]:font-semibold
                      [&>hr]:border-[var(--separator)] [&>hr]:my-8"
                    >
                      <Markdown>{styleGuideContent}</Markdown>
                    </div>
                  )}
                </div>
                {!isGeneratingStyleGuide && styleGuideContent && (
                  <div className="p-6 border-t border-[var(--separator)] bg-[var(--bg-secondary)]/50 flex justify-end">
                    <button 
                      onClick={() => {
                        const blob = new Blob([styleGuideContent], { type: 'text/markdown' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `${brand.name.replace(/\s+/g, '_')}_Style_Guide.md`;
                        a.click();
                        URL.revokeObjectURL(url);
                      }}
                      className="ios-button ios-button-filled px-6 py-2.5 rounded-xl font-semibold text-[15px] flex items-center gap-2"
                    >
                      Download Markdown
                    </button>
                  </div>
                )}
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    );
  }


  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-10 pb-20 pt-10 px-4">
      <div className="text-center flex flex-col items-center gap-6">
        <div className="w-24 h-24 bg-[var(--bg-secondary)] rounded-[28px] flex items-center justify-center shadow-sm border border-[var(--separator)]">
          <BrandIcon size={48} className="text-[var(--accent)]" />
        </div>
        <div className="space-y-3">
          <h1 className="font-serif text-[40px] font-semibold tracking-[-0.02em] text-[var(--label-primary)] leading-tight">Channel Identity</h1>
          <p className="text-[19px] text-[var(--label-secondary)] font-medium max-w-lg mx-auto leading-relaxed">
            Tell us about your channel idea in plain English, and we'll create a customized look, tone, and theme for your videos.
          </p>
        </div>
      </div>

      <div className="bg-[var(--bg-tertiary)] rounded-[32px] p-8 sm:p-10 space-y-8 border border-[var(--separator)] shadow-sm">
        <div className="flex justify-between items-center">
          <span className="text-[14px] font-semibold tracking-wider uppercase text-[var(--label-tertiary)]">Your Channel Idea</span>
          <button 
            onClick={() => setInput("Simple, healthy cooking for busy college students on a budget. Friendly, encouraging, and easy to follow.")}
            className="text-[15px] font-semibold text-[var(--accent)] hover:opacity-80 transition-opacity"
          >
            See Example
          </button>
        </div>
        <textarea 
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Describe your channel. Who is it for? What kind of videos do you want to make? What should the vibe be?"
          className="w-full bg-[var(--bg-secondary)] text-[var(--label-primary)] rounded-[20px] p-6 text-[17px] leading-relaxed border border-[var(--separator)] focus:border-[var(--accent)] outline-none transition-colors h-48 resize-none placeholder:text-[var(--label-tertiary)]"
        />
        
        {errorMsg && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 p-4 rounded-[16px] text-[15px] font-medium flex items-start gap-3 mt-4">
            <WarningCircle size={20} weight="fill" className="shrink-0 mt-0.5 text-red-500" />
            <span>{errorMsg}</span>
          </div>
        )}
        
        <button 
          onClick={handleGenerate}
          disabled={isLoading || !input.trim()}
          className="w-full bg-[var(--accent)] text-white h-[60px] rounded-[20px] font-semibold text-[18px] flex items-center justify-center gap-3 transition-opacity disabled:opacity-50"
        >
          {isLoading ? (
            <>
              <RefreshCw size={24} className="animate-spin" />
              Creating Style...
            </>
          ) : (
            "Create My Channel Style"
          )}
        </button>
      </div>
    </div>
  );
}
