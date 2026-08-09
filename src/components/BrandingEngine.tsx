import React, { useState } from 'react';
import { PaperPlaneRight as Send, CheckCircle as CheckCircle2, ArrowsClockwise as RefreshCw, Chat as MessageSquare, CaretRight as ChevronRight, Palette, TextT as Type, Target, Lightning as Zap, Lightbulb } from '@phosphor-icons/react';
import { motion } from 'motion/react';
import { generateBrandKit, generateContentIdeas } from '../services/gemini';
import { cn } from '../lib/utils';
import { db, serverTimestamp, handleFirestoreError, OperationType } from '../firebase';
import { doc, setDoc, updateDoc } from 'firebase/firestore';
import BrandIcon from './BrandIcon';

export default function Brand({ brand, setBrand, user }: { brand: any, setBrand: any, user: any }) {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');


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
        <div className="flex flex-col gap-2 mb-8 text-center sm:text-left">
          <h1 className="font-serif text-[40px] font-semibold tracking-[-0.02em] text-[var(--label-primary)] leading-tight">Brand Kit</h1>
          <p className="text-[19px] text-[var(--label-secondary)] max-w-2xl font-medium">Your channel's core identity, visual language, and signature tone.</p>
        </div>

        {/* Identity Overview */}
        <section className="bg-[var(--bg-tertiary)] rounded-[32px] overflow-hidden border border-[var(--separator)] shadow-sm">
          <div className="p-8 sm:p-10 flex flex-col sm:flex-row items-center sm:items-start gap-8">
            <div className="w-24 h-24 bg-[var(--bg-secondary)] rounded-[28px] flex items-center justify-center flex-shrink-0 shadow-sm border border-[var(--separator)]">
              <BrandIcon size={48} strokeWidth={1.5} className="text-[var(--accent)]" />
            </div>
            <div className="flex-1 text-center sm:text-left space-y-2">
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
            <span className="shrink-0 mt-0.5">⚠️</span>
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
