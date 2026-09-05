import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkle, ArrowRight, CheckCircle, X } from '@phosphor-icons/react';

const QUESTIONS = [
  {
    id: 1,
    question: "When creating content, what is your primary goal?",
    options: [
      { id: 'A', text: "Teach and share valuable knowledge", archetype: "Educator" },
      { id: 'B', text: "Make people laugh and stay entertained", archetype: "Entertainer" },
      { id: 'C', text: "Push boundaries and try new things", archetype: "Innovator" },
      { id: 'D', text: "Inspire, uplift, and motivate others", archetype: "Motivator" }
    ]
  },
  {
    id: 2,
    question: "Which visual vibe speaks to your style?",
    options: [
      { id: 'A', text: "Clean, structured, and minimalist", archetype: "Educator" },
      { id: 'B', text: "Bold, vibrant, and highly energetic", archetype: "Entertainer" },
      { id: 'C', text: "Sleek, futuristic, and experimental", archetype: "Innovator" },
      { id: 'D', text: "Warm, earthy, and inviting", archetype: "Motivator" }
    ]
  },
  {
    id: 3,
    question: "How do you want your audience to feel after watching?",
    options: [
      { id: 'A', text: "Informed, smarter, and capable", archetype: "Educator" },
      { id: 'B', text: "Amused, happy, and relaxed", archetype: "Entertainer" },
      { id: 'C', text: "Mind-blown, curious, and fascinated", archetype: "Innovator" },
      { id: 'D', text: "Empowered, seen, and ready to act", archetype: "Motivator" }
    ]
  },
  {
    id: 4,
    question: "If your channel were a physical space, what would it be?",
    options: [
      { id: 'A', text: "A modern, bright library or classroom", archetype: "Educator" },
      { id: 'B', text: "A lively comedy club, stage, or party", archetype: "Entertainer" },
      { id: 'C', text: "A high-tech lab or sleek studio", archetype: "Innovator" },
      { id: 'D', text: "A cozy retreat or comfortable coffee shop", archetype: "Motivator" }
    ]
  },
  {
    id: 5,
    question: "Which content format excites you the most?",
    options: [
      { id: 'A', text: "Deep-dive tutorials and step-by-step how-tos", archetype: "Educator" },
      { id: 'B', text: "Fast-paced vlogs, sketches, and challenges", archetype: "Entertainer" },
      { id: 'C', text: "Cutting-edge reviews and experimental edits", archetype: "Innovator" },
      { id: 'D', text: "Heartfelt stories, interviews, and vlogs", archetype: "Motivator" }
    ]
  }
];

const ARCHETYPES = {
  Educator: {
    name: "The Educator",
    description: "You thrive on structure, clarity, and providing immense value. Your brand personality should be trustworthy, clean, and highly organized, focusing on delivering actionable takeaways.",
    promptSeed: "My channel focuses on education and deep-dive tutorials. The vibe is clean, minimalist, structured, and trustworthy. I want my audience to feel informed and capable."
  },
  Entertainer: {
    name: "The Entertainer",
    description: "You bring high energy, humor, and captivation to the screen. Your brand personality should be bold, colorful, and dynamic, focusing on keeping the audience glued to the screen.",
    promptSeed: "My channel is all about entertainment, comedy, and high energy. The vibe is bold, vibrant, dynamic, and fun. I want my audience to feel amused and happy."
  },
  Innovator: {
    name: "The Innovator",
    description: "You are obsessed with aesthetics, new tech, and pushing the medium forward. Your brand personality should be sleek, futuristic, and premium, focusing on the cutting edge.",
    promptSeed: "My channel focuses on innovation, tech, and experimental formats. The vibe is sleek, futuristic, premium, and cutting-edge. I want my audience to feel mind-blown and curious."
  },
  Motivator: {
    name: "The Motivator",
    description: "You build deep emotional connections and foster community. Your brand personality should be warm, earthy, and inviting, focusing on personal growth and inspiration.",
    promptSeed: "My channel focuses on inspiration, personal growth, and heartfelt stories. The vibe is warm, earthy, inviting, and cozy. I want my audience to feel empowered and motivated."
  }
};

interface BrandArchetypeQuizProps {
  onComplete: (promptSeed: string) => void;
  onClose: () => void;
}

export default function BrandArchetypeQuiz({ onComplete, onClose }: BrandArchetypeQuizProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [result, setResult] = useState<keyof typeof ARCHETYPES | null>(null);

  const handleSelectOption = (archetype: string) => {
    const newAnswers = [...answers, archetype];
    
    if (currentStep < QUESTIONS.length - 1) {
      setAnswers(newAnswers);
      setCurrentStep(currentStep + 1);
    } else {
      // Calculate Result
      const counts = newAnswers.reduce((acc, curr) => {
        acc[curr] = (acc[curr] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      const dominantArchetype = Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b) as keyof typeof ARCHETYPES;
      setResult(dominantArchetype);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-md"
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative bg-[var(--bg-primary)] w-full max-w-2xl min-h-[450px] rounded-[32px] shadow-2xl flex flex-col overflow-hidden border border-[var(--separator)]"
      >
        <div className="flex items-center justify-between p-6 border-b border-[var(--separator)] bg-[var(--bg-secondary)]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[var(--accent)]/10 text-[var(--accent)] rounded-xl">
              <Sparkle size={24} weight="fill" />
            </div>
            <div>
              <h2 className="font-serif text-[20px] font-semibold text-[var(--label-primary)] leading-none">Brand Archetype Quiz</h2>
              <span className="text-[13px] font-medium text-[var(--label-secondary)] mt-1 block">Find your creator personality</span>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 bg-[var(--bg-tertiary)] hover:bg-[var(--separator)] text-[var(--label-secondary)] rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 p-8 sm:p-10 flex flex-col relative">
          <AnimatePresence mode="wait">
            {!result ? (
              <motion.div 
                key={`step-${currentStep}`}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col h-full"
              >
                <div className="mb-8">
                  <div className="flex items-center gap-2 mb-4">
                    {QUESTIONS.map((_, idx) => (
                      <div 
                        key={idx} 
                        className={`h-1.5 flex-1 rounded-full ${idx <= currentStep ? 'bg-[var(--accent)]' : 'bg-[var(--separator)]'}`} 
                      />
                    ))}
                  </div>
                  <span className="text-[13px] font-semibold tracking-wider uppercase text-[var(--accent)] mb-2 block">Question {currentStep + 1} of {QUESTIONS.length}</span>
                  <h3 className="font-serif text-[28px] font-semibold text-[var(--label-primary)] leading-tight">
                    {QUESTIONS[currentStep].question}
                  </h3>
                </div>

                <div className="flex flex-col gap-3">
                  {QUESTIONS[currentStep].options.map((option, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSelectOption(option.archetype)}
                      className="text-left p-5 rounded-[20px] border border-[var(--separator)] bg-[var(--bg-secondary)] hover:border-[var(--accent)] hover:bg-[var(--accent)]/5 transition-all group flex items-center justify-between"
                    >
                      <span className="text-[16px] font-medium text-[var(--label-primary)]">{option.text}</span>
                      <ArrowRight size={20} className="text-[var(--label-tertiary)] group-hover:text-[var(--accent)] transition-colors" />
                    </button>
                  ))}
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="result"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center text-center py-6"
              >
                <div className="w-20 h-20 bg-[var(--accent)]/10 rounded-full flex items-center justify-center mb-6">
                  <CheckCircle size={40} className="text-[var(--accent)]" weight="fill" />
                </div>
                <h3 className="text-[14px] font-semibold tracking-wider uppercase text-[var(--label-secondary)] mb-2">Your Primary Archetype</h3>
                <h2 className="font-serif text-[40px] font-bold text-[var(--label-primary)] mb-4">{ARCHETYPES[result].name}</h2>
                <p className="text-[17px] text-[var(--label-secondary)] leading-relaxed max-w-lg mb-10">
                  {ARCHETYPES[result].description}
                </p>
                <button
                  onClick={() => onComplete(ARCHETYPES[result].promptSeed)}
                  className="ios-button ios-button-filled w-full sm:w-auto px-8 py-4 rounded-[20px] font-semibold text-[17px] flex items-center justify-center gap-2"
                >
                  <Sparkle size={20} weight="fill" />
                  Use this as my Channel Idea
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
