import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowRight, 
  Check, 
  Star, 
  Globe, 
  TwitterLogo as Twitter, 
  YoutubeLogo as Youtube, 
  InstagramLogo as Instagram, 
  Lightning as Zap, 
  ShieldCheck, 
  List as Menu, 
  X, 
  CaretRight as ChevronRight, 
  TrendUp as TrendingUp, 
  Target, 
  Palette, 
  BookOpen, 
  Sparkle,
  ChatCircleText,
  Clock,
  ArrowCircleUp,
  User,
  CaretDown,
  Envelope
} from '@phosphor-icons/react';
import { cn } from '../lib/utils';
import BrandIcon from './BrandIcon';
import { loginWithGoogle } from '../firebase';

// Sandbox presets for the interactive Brand Kit planner
const SANDBOX_PRESETS: Record<string, Record<string, any>> = {
  cooking: {
    calm: {
      name: "The Slow Apron",
      tagline: "Mindful cooking from scratch with natural ingredients.",
      colors: { primary: "#7F9F7F", secondary: "#D2B48C", accent: "#E9967A", background: "#F5F5EC" },
      fontHeading: "Playfair Display",
      fontBody: "Inter",
      hook: "In a world that never stops rushing, let's take ten minutes to watch fresh butter melt, bread rise, and food slowly cook to golden perfection.",
      catchphrase: "Eat slowly, live deeply. Until next time in the kitchen.",
      vibeDesc: "Soft lighting, gentle cooking sounds, beautiful wooden plates, and natural ingredients."
    },
    bold: {
      name: "WOK & ROLL",
      tagline: "High-heat, high-energy Asian street food recipes.",
      colors: { primary: "#FF4500", secondary: "#1A1A1A", accent: "#FFD700", background: "#1C1917" },
      fontHeading: "Space Grotesk",
      fontBody: "Fira Code",
      hook: "Turn up your stove to the highest heat! Today we are making a classic street-style stir fry in just four minutes.",
      catchphrase: "Keep cooking, stay active! See you next time!",
      vibeDesc: "Fast-paced video cuts, steaming hot pans, bright colorful titles, and high-energy music."
    },
    educational: {
      name: "Culinary Science",
      tagline: "Discovering how cooking really works.",
      colors: { primary: "#007AFF", secondary: "#8E8E93", accent: "#FF9500", background: "#FFFFFF" },
      fontHeading: "Outfit",
      fontBody: "Inter",
      hook: "Did you know that adding a pinch of salt to onions actually helps them cook more evenly? Today we are learning the science of cooking heat.",
      catchphrase: "Keep learning, and enjoy your food!",
      vibeDesc: "Bright clean lighting, simple diagrams, exact measurements, and side-by-side comparisons."
    }
  },
  tech: {
    calm: {
      name: "Cozy Coding",
      tagline: "Quiet coding sessions and cozy workspace designs.",
      colors: { primary: "#4A5568", secondary: "#EDF2F7", accent: "#805AD5", background: "#F7FAFC" },
      fontHeading: "Inter",
      fontBody: "JetBrains Mono",
      hook: "The rain is tapping gently on the window. Let's make a warm drink and write some clean, simple code together.",
      catchphrase: "Happy coding!",
      vibeDesc: "Relaxing background music, warm desk lighting, quiet keyboard typing, and dark screen themes."
    },
    bold: {
      name: "CYBER CORE",
      tagline: "Latest technology, software tips, and smart AI tools.",
      colors: { primary: "#00FF66", secondary: "#0A0A0C", accent: "#00E5FF", background: "#0D0D11" },
      fontHeading: "Space Grotesk",
      fontBody: "Fira Code",
      hook: "A brand new AI model just launched! We are building a smart assistant that improves your code in under three seconds.",
      catchphrase: "Build faster. Create more. See you next time!",
      vibeDesc: "Futuristic screen graphics, glowing neon colors, digital dashboards, and engaging transitions."
    },
    educational: {
      name: "Byte Sized",
      tagline: "Computer science made incredibly simple.",
      colors: { primary: "#34C759", secondary: "#F2F2F7", accent: "#007AFF", background: "#FFFFFF" },
      fontHeading: "Outfit",
      fontBody: "Inter",
      hook: "How does computer memory actually work? Think of your computer memory as a hotel, where each file gets its own room key card.",
      catchphrase: "Explaining technology, one step at a time.",
      vibeDesc: "Clear whiteboard drawings, color-coded highlights, and simple examples."
    }
  },
  finance: {
    calm: {
      name: "The Steady Investor",
      tagline: "Simple, low-stress investing for everyday people.",
      colors: { primary: "#2E7D32", secondary: "#F1F8E9", accent: "#7CB342", background: "#FAFAFA" },
      fontHeading: "Playfair Display",
      fontBody: "Inter",
      hook: "You don't need to trade complex stocks to build your savings. Let's look at how a simple index fund grows over thirty years.",
      catchphrase: "Start small, stay consistent. Take care.",
      vibeDesc: "Warm friendly backgrounds, simple line charts, and clean handwritten notes."
    },
    bold: {
      name: "ALPHA VENTURES",
      tagline: "Company analysis and global market trends.",
      colors: { primary: "#FF3B30", secondary: "#1C1C1E", accent: "#5856D6", background: "#0B0B0C" },
      fontHeading: "Space Grotesk",
      fontBody: "Fira Code",
      hook: "Three small energy companies are quietly growing very fast. Let's look at their financial reports before everyone else does.",
      catchphrase: "Protect your savings, grow your future.",
      vibeDesc: "Professional charts, clean financial spreadsheets, and clear red and green accents."
    },
    educational: {
      name: "Finance Academy",
      tagline: "Building solid personal financial foundations.",
      colors: { primary: "#10B981", secondary: "#F3F4F6", accent: "#3B82F6", background: "#FFFFFF" },
      fontHeading: "Outfit",
      fontBody: "Inter",
      hook: "Many people spend money on things that actually cost them money over time. Let's break down how to make your money work for you.",
      catchphrase: "Take control of your money, take control of your future.",
      vibeDesc: "Clear animated charts, helpful percentage highlights, and real-life examples."
    }
  }
};

const FAQS = [
  {
    q: "Do I need any design or coding experience to use CreatorOS?",
    a: "Absolutely not! CreatorOS is designed with simplicity in mind. Our AI Design Assistant automatically picks matching colors, selects beautiful fonts, and organizes your entire brand theme so you can focus 100% on making your videos."
  },
  {
    q: "How does the AI Video Intro Maker work?",
    a: "It looks at your selected topic, style, and who your videos are for. Then, it uses simple, proven patterns (like starting with an interesting question or a bold statement) to help you write video openings that catch people's attention immediately."
  },
  {
    q: "What is the 30-Day Growth Challenge?",
    a: "It's an interactive guide built right into the app. It walks you through simple daily steps—from choosing your main topic on Day 1, to writing video intros on Day 7, to building a consistent publishing routine by Day 30."
  },
  {
    q: "Can I cancel my plan at any time?",
    a: "Yes, you can upgrade, downgrade, or cancel your subscription at any time directly from your Profile settings with a single click. There are no hidden fees or contracts."
  }
];

interface LandingPageProps {
  navigate?: (path: string) => void;
}

export default function LandingPage({ navigate }: LandingPageProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Interactive Sandbox state
  const [selectedNiche, setSelectedNiche] = useState('tech');
  const [selectedVibe, setSelectedVibe] = useState('calm');
  const [isGeneratingSandbox, setIsGeneratingSandbox] = useState(false);
  
  // Pricing toggle state
  const [isYearlyBilling, setIsYearlyBilling] = useState(true);
  
  // FAQ state
  const [expandedFaqIndex, setExpandedFaqIndex] = useState<number | null>(0);
  
  // Pre-sales Contact form state
  const [contactEmail, setContactEmail] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [isSubmittingContact, setIsSubmittingContact] = useState(false);
  const [contactSuccess, setContactSuccess] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSignIn = () => {
    navigate('/login');
  };

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactEmail || !contactMessage) return;
    setIsSubmittingContact(true);
    setTimeout(() => {
      setIsSubmittingContact(false);
      setContactSuccess(true);
      setContactEmail('');
      setContactMessage('');
      setTimeout(() => setContactSuccess(false), 5000);
    }, 1200);
  };

  // Trigger a brief simulated loader when presets change in the sandbox
  const handleSandboxChange = (niche: string, vibe: string) => {
    setIsGeneratingSandbox(true);
    setSelectedNiche(niche);
    setSelectedVibe(vibe);
    const timer = setTimeout(() => {
      setIsGeneratingSandbox(false);
    }, 350);
    return () => clearTimeout(timer);
  };

  const currentPreset = SANDBOX_PRESETS[selectedNiche]?.[selectedVibe] || SANDBOX_PRESETS.tech.calm;

  return (
    <div className="bg-[var(--bg-primary)] text-[var(--label-primary)] font-sans selection:bg-[var(--accent)] selection:text-white overflow-x-hidden">
      {/* Sticky Top Navigation */}
      <nav className={cn(
        "fixed top-0 left-0 right-0 z-[100] transition-all duration-300 px-6 h-16 flex items-center",
        isScrolled 
          ? "bg-[var(--bg-material-thick)] backdrop-blur-xl border-b border-[var(--separator)] shadow-sm" 
          : "bg-transparent border-b border-transparent"
      )}>
        <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate?.('/')}>
            <div className="p-1.5 bg-[var(--accent)]/10 rounded-lg text-[var(--accent)]">
              <BrandIcon size={20} strokeWidth={2} />
            </div>
            <span className="font-bold text-[20px] tracking-tight">CreatorOS</span>
          </div>

          {/* Desktop Links */}
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-[14px] font-semibold text-[var(--label-secondary)] hover:text-[var(--accent)] transition-colors">Features</a>
            <a href="#sandbox" className="text-[14px] font-semibold text-[var(--label-secondary)] hover:text-[var(--accent)] transition-colors">Style Planner</a>
            <a href="#pricing" className="text-[14px] font-semibold text-[var(--label-secondary)] hover:text-[var(--accent)] transition-colors">Pricing</a>
            <button 
              onClick={() => navigate?.('/roadmap')}
              className="text-[14px] font-semibold text-[var(--label-secondary)] hover:text-[var(--accent)] transition-colors text-left"
            >
              Public Roadmap
            </button>
            <button 
              onClick={() => navigate?.('/help')}
              className="text-[14px] font-semibold text-[var(--label-secondary)] hover:text-[var(--accent)] transition-colors text-left"
            >
              Help Center
            </button>
            <div className="h-4 w-[1px] bg-[var(--separator)]" />
            <button 
              onClick={handleSignIn}
              className="text-[14px] font-bold text-[var(--accent)] hover:opacity-80 transition-opacity"
            >
              Sign In
            </button>
            <button 
              onClick={handleSignIn}
              className="ios-button ios-button-filled h-9 px-5 text-[13px] font-semibold"
            >
              Get Started
            </button>
          </div>

          {/* Mobile Menu Button */}
          <div 
            className="md:hidden p-2 text-[var(--label-secondary)] cursor-pointer hover:bg-[var(--separator)] rounded-xl transition-colors"
            role="button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X size={22} weight="bold" /> : <Menu size={22} weight="bold" />}
          </div>
        </div>
      </nav>

      {/* Mobile Menu Backdrop & Drawer */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 z-80 bg-black/40 backdrop-blur-md md:hidden"
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 bottom-0 w-[80%] max-w-[360px] z-[90] bg-[var(--bg-secondary)] border-l border-[var(--separator)] p-6 pt-24 flex flex-col gap-6 md:hidden shadow-2xl"
            >
              <div className="flex flex-col gap-4">
                <a 
                  href="#features" 
                  onClick={() => setIsMobileMenuOpen(false)} 
                  className="text-[18px] font-bold text-[var(--label-primary)] hover:text-[var(--accent)] p-2 rounded-xl hover:bg-[var(--bg-tertiary)] transition-colors"
                >
                  Features
                </a>
                <a 
                  href="#sandbox" 
                  onClick={() => setIsMobileMenuOpen(false)} 
                  className="text-[18px] font-bold text-[var(--label-primary)] hover:text-[var(--accent)] p-2 rounded-xl hover:bg-[var(--bg-tertiary)] transition-colors"
                >
                  Style Planner
                </a>
                <a 
                  href="#pricing" 
                  onClick={() => setIsMobileMenuOpen(false)} 
                  className="text-[18px] font-bold text-[var(--label-primary)] hover:text-[var(--accent)] p-2 rounded-xl hover:bg-[var(--bg-tertiary)] transition-colors"
                >
                  Pricing
                </a>
                <button 
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    navigate?.('/roadmap');
                  }}
                  className="text-[18px] font-bold text-left text-[var(--label-primary)] hover:text-[var(--accent)] p-2 rounded-xl hover:bg-[var(--bg-tertiary)] transition-colors"
                >
                  Public Roadmap
                </button>
                <button 
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    navigate?.('/help');
                  }}
                  className="text-[18px] font-bold text-left text-[var(--label-primary)] hover:text-[var(--accent)] p-2 rounded-xl hover:bg-[var(--bg-tertiary)] transition-colors"
                >
                  Help Center
                </button>
              </div>

              <div className="mt-auto space-y-3">
                <button 
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    handleSignIn();
                  }}
                  className="w-full ios-button ios-button-gray h-12 text-[15px] font-semibold"
                >
                  Sign In
                </button>
                <button 
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    handleSignIn();
                  }}
                  className="w-full ios-button ios-button-filled h-12 text-[15px] font-semibold"
                >
                  Get Started Free
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Hero Section */}
      <section className="relative pt-36 pb-20 px-6 overflow-hidden">
        {/* Abstract Glowing ambient orbs */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[var(--accent)] rounded-full filter blur-[150px] opacity-[0.08] pointer-events-none" />
        <div className="absolute top-10 right-10 w-[300px] h-[300px] bg-[#5856D6] rounded-full filter blur-[120px] opacity-[0.06] pointer-events-none" />

        <div className="max-w-5xl mx-auto text-center space-y-8 relative z-10">
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3 py-1 bg-[var(--bg-secondary)] border border-[var(--separator)] rounded-full text-[12px] font-bold text-[var(--label-secondary)] uppercase tracking-wider shadow-sm"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--accent)] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--accent)]"></span>
            </span>
            Newest Version Live
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="font-serif text-[48px] sm:text-[76px] md:text-[104px] font-extrabold tracking-[-0.03em] text-[var(--label-primary)] leading-[1.0] text-balance"
          >
            Plan, write, and <br className="hidden sm:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--accent)] via-[#5856D6] to-[var(--accent)]">grow your channel</span>.
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-[18px] sm:text-[21px] text-[var(--label-secondary)] font-medium max-w-3xl mx-auto leading-relaxed text-balance"
          >
            An easy-to-use writing and planning assistant. Create a beautiful visual style, write videos that keep viewers interested, and build consistent habits with daily challenges.
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4"
          >
            <button 
              onClick={handleSignIn}
              className="ios-button ios-button-filled w-full sm:w-auto h-14 px-10 text-[16px] font-semibold shadow-lg shadow-[var(--accent)]/10 hover:shadow-[var(--accent)]/20 transition-all"
            >
              Start Free Trial
              <ArrowRight size={18} weight="bold" className="ml-1" />
            </button>
            <a 
              href="#sandbox" 
              className="ios-button ios-button-gray w-full sm:w-auto h-14 px-10 text-[16px] font-semibold"
            >
              Try Live Planner
            </a>
          </motion.div>

          {/* Core high-level stats banner */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="pt-16 grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto border-t border-[var(--separator)]/60 mt-16"
          >
            <div className="text-center">
              <span className="block text-4xl sm:text-5xl font-extrabold tracking-[-0.05em] font-serif text-[var(--accent)]">15K+</span>
              <span className="text-[10px] sm:text-[11px] uppercase font-bold tracking-widest text-[var(--label-secondary)] mt-1 block">Happy Creators</span>
            </div>
            <div className="text-center">
              <span className="block text-4xl sm:text-5xl font-extrabold tracking-[-0.05em] font-serif text-[var(--accent)]">30 Min</span>
              <span className="text-[10px] sm:text-[11px] uppercase font-bold tracking-widest text-[var(--label-secondary)] mt-1 block">Quick Setup</span>
            </div>
            <div className="text-center">
              <span className="block text-4xl sm:text-5xl font-extrabold tracking-[-0.05em] font-serif text-[var(--accent)]">1.2M+</span>
              <span className="text-[10px] sm:text-[11px] uppercase font-bold tracking-widest text-[var(--label-secondary)] mt-1 block">Scripts Written</span>
            </div>
            <div className="text-center">
              <span className="block text-4xl sm:text-5xl font-extrabold tracking-[-0.05em] font-serif text-[var(--accent)]">4.9/5</span>
              <span className="text-[10px] sm:text-[11px] uppercase font-bold tracking-widest text-[var(--label-secondary)] mt-1 block">User Rating</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Interactive Style Planner Sandbox */}
      <section id="sandbox" className="py-24 px-6 bg-[var(--bg-secondary)]/40 relative border-y border-[var(--separator)]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
            <span className="inline-block px-3 py-1 bg-[var(--accent)]/10 text-[var(--accent)] text-xs font-bold rounded-full uppercase tracking-widest">
              Live Style Planner
            </span>
            <h2 className="font-serif text-[38px] sm:text-[54px] md:text-[64px] font-extrabold tracking-[-0.03em] leading-[1.05] text-[var(--label-primary)]">
              Find your video style in seconds.
            </h2>
            <p className="text-[16px] sm:text-[18px] text-[var(--label-secondary)] font-medium leading-relaxed">
              Try the interactive style planner! Choose a topic and a visual style to see how easily our design helper creates a beautiful color palette and theme.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
            {/* Sandbox Controls (Left) */}
            <div className="lg:col-span-5 flex flex-col justify-between space-y-8 bg-[var(--bg-tertiary)] p-8 rounded-[32px] border border-[var(--separator)] shadow-sm">
              <div className="space-y-6">
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--label-secondary)] block mb-3">
                    1. Select Your Video Topic
                  </label>
                  <div className="grid grid-cols-1 gap-2.5">
                    {[
                      { id: 'tech', label: '💻 Technology & Coding Tips' },
                      { id: 'cooking', label: '🍳 Cooking & Delicious Recipes' },
                      { id: 'finance', label: '📈 Personal Finance & Savings' }
                    ].map(niche => (
                      <button
                        key={niche.id}
                        onClick={() => handleSandboxChange(niche.id, selectedVibe)}
                        className={cn(
                          "w-full text-left px-5 py-4 rounded-2xl text-[15px] font-semibold border transition-all flex items-center justify-between",
                          selectedNiche === niche.id
                            ? "bg-[var(--accent)] text-white border-[var(--accent)] shadow-md"
                            : "bg-[var(--bg-secondary)] text-[var(--label-primary)] border-[var(--separator)] hover:bg-[var(--bg-secondary)]/80"
                        )}
                      >
                        <span>{niche.label}</span>
                        {selectedNiche === niche.id && <Check size={16} weight="bold" />}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--label-secondary)] block mb-3">
                    2. Choose Your Visual Style
                  </label>
                  <div className="flex flex-wrap gap-2.5">
                    {[
                      { id: 'calm', label: '🧘 Soft & Peaceful' },
                      { id: 'bold', label: '🎭 Bright & Bold' },
                      { id: 'educational', label: '🎓 Simple & Educational' }
                    ].map(vibe => (
                      <button
                        key={vibe.id}
                        onClick={() => handleSandboxChange(selectedNiche, vibe.id)}
                        className={cn(
                          "px-5 py-3 rounded-xl text-[14px] font-semibold border transition-all flex-1 text-center whitespace-nowrap",
                          selectedVibe === vibe.id
                            ? "bg-[var(--label-primary)] text-[var(--bg-primary)] border-[var(--label-primary)]"
                            : "bg-[var(--bg-secondary)] text-[var(--label-secondary)] border-[var(--separator)] hover:bg-[var(--bg-secondary)]/80"
                        )}
                      >
                        {vibe.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-[var(--separator)]">
                <div className="flex gap-4 items-start">
                  <div className="p-2.5 bg-yellow-500/10 text-yellow-500 rounded-xl">
                    <Sparkle size={20} weight="fill" className="animate-spin" style={{ animationDuration: '6s' }} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold">Create Your Own Styles</h4>
                    <p className="text-xs text-[var(--label-secondary)] leading-relaxed mt-1">
                      The full version supports dozens of topics, custom color pickers, beautiful font pairings, and ready-to-use video writing templates.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Sandbox Live Mockup Card (Right) */}
            <div className="lg:col-span-7 flex flex-col justify-center">
              <div className="bg-[var(--bg-tertiary)] p-6 sm:p-8 rounded-[32px] border border-[var(--separator)] shadow-xl relative overflow-hidden min-h-[500px] flex flex-col justify-between">
                
                {/* Loader overlay */}
                <AnimatePresence>
                  {isGeneratingSandbox && (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 bg-[var(--bg-tertiary)]/80 backdrop-blur-sm z-20 flex flex-col items-center justify-center space-y-4"
                    >
                      <div className="w-10 h-10 border-4 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
                      <span className="text-xs font-bold uppercase tracking-wider text-[var(--label-secondary)]">Creating custom style...</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Simulated Channel Identity Header */}
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[var(--separator)]">
                    <div className="space-y-1">
                      <span className="text-[10px] font-extrabold uppercase tracking-[0.2em] px-2 py-0.5 bg-[var(--accent)]/10 text-[var(--accent)] rounded-md">
                        Your Custom Style Guide
                      </span>
                      <h3 className="text-2xl font-bold tracking-tight mt-1" style={{ fontFamily: currentPreset.fontHeading }}>
                        {currentPreset.name}
                      </h3>
                      <p className="text-sm text-[var(--label-secondary)] font-medium">
                        {currentPreset.tagline}
                      </p>
                    </div>

                    {/* Palette swatches */}
                    <div className="flex gap-2 items-center">
                      {Object.entries(currentPreset.colors).map(([key, val]: [string, any]) => (
                        <div key={key} className="flex flex-col items-center gap-1">
                          <div 
                            className="w-8 h-8 rounded-full border border-black/10 shadow-sm"
                            style={{ backgroundColor: val }}
                          />
                          <span className="text-[9px] font-mono font-semibold uppercase text-[var(--label-tertiary)]">{val}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Channel specifics */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-sm">
                    <div className="space-y-1">
                      <span className="text-[11px] font-bold text-[var(--label-secondary)] uppercase tracking-wider block">Recommended Video Style</span>
                      <p className="text-[13px] leading-relaxed font-semibold text-[var(--label-primary)]">
                        {currentPreset.vibeDesc}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[11px] font-bold text-[var(--label-secondary)] uppercase tracking-wider block">Beautiful Fonts</span>
                      <div className="flex gap-3 text-xs font-mono font-bold text-[var(--label-primary)]">
                        <span className="px-2 py-1 bg-[var(--bg-secondary)] rounded-md border border-[var(--separator)]">Title: {currentPreset.fontHeading}</span>
                        <span className="px-2 py-1 bg-[var(--bg-secondary)] rounded-md border border-[var(--separator)]">Body: {currentPreset.fontBody}</span>
                      </div>
                    </div>
                  </div>

                  {/* Curated Script Hook Template */}
                  <div className="bg-[var(--bg-secondary)] p-5 rounded-2xl border border-[var(--separator)] space-y-2 relative">
                    <span className="text-[10px] font-bold text-[var(--accent)] uppercase tracking-widest block">Your Engaging Video Intro</span>
                    <p className="text-[14px] leading-relaxed font-medium italic text-[var(--label-primary)]">
                      "{currentPreset.hook}"
                    </p>
                  </div>

                  {/* Community Signature Catchphrase */}
                  <div className="flex items-center gap-3 text-sm">
                    <span className="text-[11px] font-bold text-[var(--label-secondary)] uppercase tracking-wider">Your Closing Words:</span>
                    <span className="px-3 py-1 bg-emerald-500/10 text-emerald-500 rounded-full font-bold text-xs">
                      {currentPreset.catchphrase}
                    </span>
                  </div>
                </div>

                {/* Action footer inside the card */}
                <div className="pt-6 border-t border-[var(--separator)]/60 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <span className="text-xs text-[var(--label-secondary)] font-medium">Like this aesthetic? Save it permanently to your account.</span>
                  <button 
                    onClick={handleSignIn}
                    className="ios-button ios-button-tinted w-full sm:w-auto h-10 px-5 text-[13px] font-bold flex items-center justify-center gap-1 whitespace-nowrap"
                  >
                    Save This Style
                    <ArrowRight size={14} weight="bold" />
                  </button>
                </div>

              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Detailed Bento Features Grid */}
      <section id="features" className="py-24 px-6 relative">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-20 space-y-4">
            <span className="inline-block px-3 py-1 bg-[#5856D6]/10 text-[#5856D6] text-xs font-bold rounded-full uppercase tracking-widest">
              Everything You Need
            </span>
            <h2 className="font-serif text-[38px] sm:text-[54px] md:text-[64px] font-extrabold tracking-[-0.03em] leading-[1.05] text-[var(--label-primary)]">
              Built to make video creation simple.
            </h2>
            <p className="text-[16px] sm:text-[18px] text-[var(--label-secondary)] font-medium leading-relaxed">
              No more messy notes, confusing spreadsheets, or lost ideas. We bring your channel style, video drafts, and daily schedule into one simple, clean space.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            
            {/* Feature 1: Identity Architect */}
            <div className="ios-card bg-[var(--bg-tertiary)] p-8 flex flex-col justify-between border border-[var(--separator)] shadow-sm hover:shadow-md transition-all group">
              <div className="space-y-6">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Palette size={24} weight="duotone" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-bold tracking-tight">Design Assistant</h3>
                  <p className="text-[15px] text-[var(--label-secondary)] leading-relaxed font-medium">
                    Our design assistant guides you through three simple questions. Instantly get a beautiful color palette, matching fonts, a unique style description, and ideas for video intros.
                  </p>
                </div>
              </div>
              <div className="pt-6 border-t border-[var(--separator)]/60 mt-6 flex items-center gap-1.5 text-xs font-bold text-[var(--accent)] cursor-pointer hover:underline" onClick={handleSignIn}>
                Learn how it works <ChevronRight size={12} weight="bold" />
              </div>
            </div>

            {/* Feature 2: Studio Workflow & Script Scoring */}
            <div className="ios-card bg-[var(--bg-tertiary)] p-8 flex flex-col justify-between border border-[var(--separator)] shadow-sm hover:shadow-md transition-all group">
              <div className="space-y-6">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Sparkle size={24} weight="duotone" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-bold tracking-tight">Video Writer & Intro Builder</h3>
                  <p className="text-[15px] text-[var(--label-secondary)] leading-relaxed font-medium">
                    Draft your videos in a clean, distraction-free space. Get helpful writing checklists, video length estimators, and feedback to ensure your intros are highly engaging.
                  </p>
                </div>
              </div>
              <div className="pt-6 border-t border-[var(--separator)]/60 mt-6 flex items-center gap-1.5 text-xs font-bold text-[var(--accent)] cursor-pointer hover:underline" onClick={handleSignIn}>
                View writing features <ChevronRight size={12} weight="bold" />
              </div>
            </div>

            {/* Feature 3: Habit Tracking & 30-Day challenge */}
            <div className="ios-card bg-[var(--bg-tertiary)] p-8 flex flex-col justify-between border border-[var(--separator)] shadow-sm hover:shadow-md transition-all group">
              <div className="space-y-6">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Clock size={24} weight="duotone" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-bold tracking-tight">30-Day Writing Habit</h3>
                  <p className="text-[15px] text-[var(--label-secondary)] leading-relaxed font-medium">
                    Never run out of ideas with our friendly 30-day plan. Form consistent writing habits, track your daily progress, and stay motivated as you build your library of video drafts.
                  </p>
                </div>
              </div>
              <div className="pt-6 border-t border-[var(--separator)]/60 mt-6 flex items-center gap-1.5 text-xs font-bold text-[var(--accent)] cursor-pointer hover:underline" onClick={() => navigate?.('/roadmap')}>
                Explore the challenge <ChevronRight size={12} weight="bold" />
              </div>
            </div>

            {/* Feature 4: Centralized Creator Hub */}
            <div className="ios-card bg-[var(--bg-tertiary)] p-8 flex flex-col justify-between border border-[var(--separator)] shadow-sm hover:shadow-md transition-all group">
              <div className="space-y-6">
                <div className="w-12 h-12 rounded-2xl bg-sky-500/10 text-sky-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Globe size={24} weight="duotone" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-bold tracking-tight">Video Publishing Calendar</h3>
                  <p className="text-[15px] text-[var(--label-secondary)] leading-relaxed font-medium">
                    Ready to share? Plan and organize your publishing schedule across YouTube, TikTok, and Instagram, and keep track of all your upcoming posts in one simple calendar.
                  </p>
                </div>
              </div>
              <div className="pt-6 border-t border-[var(--separator)]/60 mt-6 flex items-center gap-1.5 text-xs font-bold text-[var(--accent)] cursor-pointer hover:underline" onClick={handleSignIn}>
                Learn about calendars <ChevronRight size={12} weight="bold" />
              </div>
            </div>

            {/* Feature 5: Real-time Analytics Intelligence */}
            <div className="ios-card bg-[var(--bg-tertiary)] p-8 flex flex-col justify-between border border-[var(--separator)] shadow-sm hover:shadow-md transition-all group">
              <div className="space-y-6">
                <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <TrendingUp size={24} weight="duotone" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-bold tracking-tight">Simple Progress Charts</h3>
                  <p className="text-[15px] text-[var(--label-secondary)] leading-relaxed font-medium">
                    See your progress over time with easy-to-read charts. Track how many videos you've written, check your average writing quality scores, and stay motivated with clear visual targets.
                  </p>
                </div>
              </div>
              <div className="pt-6 border-t border-[var(--separator)]/60 mt-6 flex items-center gap-1.5 text-xs font-bold text-[var(--accent)] cursor-pointer hover:underline" onClick={handleSignIn}>
                View progress features <ChevronRight size={12} weight="bold" />
              </div>
            </div>

            {/* Feature 6: Interactive Prompt Architect */}
            <div className="ios-card bg-[var(--bg-tertiary)] p-8 flex flex-col justify-between border border-[var(--separator)] shadow-sm hover:shadow-md transition-all group">
              <div className="space-y-6">
                <div className="w-12 h-12 rounded-2xl bg-[#5856D6]/10 text-[#5856D6] flex items-center justify-center group-hover:scale-110 transition-transform">
                  <ChatCircleText size={24} weight="duotone" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-bold tracking-tight">AI Writing Settings</h3>
                  <p className="text-[15px] text-[var(--label-secondary)] leading-relaxed font-medium">
                    Customize how the AI assistant helps you write. Easily set your preferred video length, vocabulary style, and tone of voice with simple, friendly switches.
                  </p>
                </div>
              </div>
              <div className="pt-6 border-t border-[var(--separator)]/60 mt-6 flex items-center gap-1.5 text-xs font-bold text-[var(--accent)] cursor-pointer hover:underline" onClick={handleSignIn}>
                Try writing settings <ChevronRight size={12} weight="bold" />
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Interactive Pricing Grid */}
      <section id="pricing" className="py-24 px-6 border-t border-[var(--separator)]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-12 space-y-4">
            <span className="inline-block px-3 py-1 bg-emerald-500/10 text-emerald-500 text-xs font-bold rounded-full uppercase tracking-widest">
              Friendly Plans
            </span>
            <h2 className="font-serif text-[38px] sm:text-[54px] md:text-[64px] font-extrabold tracking-[-0.03em] leading-[1.05] text-[var(--label-primary)]">
              Simple plans for every writer.
            </h2>
            <p className="text-[16px] sm:text-[18px] text-[var(--label-secondary)] font-medium leading-relaxed">
              Choose the plan that is right for you. Save up to 20% with our easy yearly option.
            </p>

            {/* Toggle Billing */}
            <div className="inline-flex items-center gap-3 bg-[var(--bg-tertiary)] p-1.5 rounded-2xl border border-[var(--separator)] mt-6">
              <button 
                onClick={() => setIsYearlyBilling(false)}
                className={cn(
                  "px-4 py-2 text-xs font-bold rounded-xl transition-all",
                  !isYearlyBilling 
                    ? "bg-[var(--bg-secondary)] text-[var(--label-primary)] shadow-sm" 
                    : "text-[var(--label-secondary)] hover:text-[var(--label-primary)]"
                )}
              >
                Monthly Billing
              </button>
              <button 
                onClick={() => setIsYearlyBilling(true)}
                className={cn(
                  "px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5",
                  isYearlyBilling 
                    ? "bg-[var(--bg-secondary)] text-[var(--label-primary)] shadow-sm" 
                    : "text-[var(--label-secondary)] hover:text-[var(--label-primary)]"
                )}
              >
                Yearly Billing
                <span className="px-1.5 py-0.5 bg-emerald-500/10 text-emerald-500 text-[10px] font-extrabold rounded-md uppercase">
                  Save 20%
                </span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
            
            {/* Free Tier */}
            <div className="bg-[var(--bg-tertiary)] p-8 rounded-[32px] border border-[var(--separator)] shadow-sm flex flex-col justify-between space-y-8 relative">
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-bold">Free Starter Plan</h3>
                  <p className="text-xs text-[var(--label-secondary)] font-medium mt-1">Perfect for getting started.</p>
                </div>

                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-serif font-bold">$0</span>
                  <span className="text-xs text-[var(--label-tertiary)] font-bold uppercase tracking-wider">/ Lifetime</span>
                </div>

                <div className="border-t border-[var(--separator)]/60 pt-6">
                  <ul className="space-y-3.5 text-sm text-[var(--label-secondary)] font-medium">
                    <li className="flex items-center gap-2.5">
                      <Check size={16} weight="bold" className="text-emerald-500" />
                      1 Custom Style Guide
                    </li>
                    <li className="flex items-center gap-2.5">
                      <Check size={16} weight="bold" className="text-emerald-500" />
                      Basic video intro suggestions
                    </li>
                    <li className="flex items-center gap-2.5">
                      <Check size={16} weight="bold" className="text-emerald-500" />
                      Simple publishing calendar
                    </li>
                    <li className="flex items-center gap-2.5">
                      <Check size={16} weight="bold" className="text-emerald-500" />
                      Access to help guides
                    </li>
                  </ul>
                </div>
              </div>

              <button 
                onClick={handleSignIn}
                className="ios-button ios-button-gray w-full h-12 text-[14px] font-bold"
              >
                Get Started Free
              </button>
            </div>

            {/* Pro Tier (Popular) */}
            <div className="bg-[var(--bg-tertiary)] p-8 rounded-[32px] border-2 border-[var(--accent)] shadow-md flex flex-col justify-between space-y-8 relative scale-100 md:scale-[1.03]">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-[var(--accent)] text-white text-[10px] font-extrabold uppercase tracking-[0.15em] rounded-full shadow-md whitespace-nowrap">
                Most Popular Choice
              </div>

              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-bold flex items-center gap-2">
                    Pro Writer Plan
                    <span className="px-2 py-0.5 bg-amber-500/15 text-amber-500 text-[9px] font-extrabold rounded-md uppercase tracking-wider">Unlock AI</span>
                  </h3>
                  <p className="text-xs text-[var(--label-secondary)] font-medium mt-1">Write faster and stay consistent.</p>
                </div>

                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-serif font-bold">
                    ${isYearlyBilling ? "23" : "29"}
                  </span>
                  <span className="text-xs text-[var(--label-tertiary)] font-bold uppercase tracking-wider">/ Month</span>
                </div>

                <div className="border-t border-[var(--separator)]/60 pt-6">
                  <ul className="space-y-3.5 text-sm text-[var(--label-secondary)] font-medium">
                    <li className="flex items-center gap-2.5">
                      <Check size={16} weight="bold" className="text-[var(--accent)]" />
                      <strong>Unlimited</strong> Style Guides
                    </li>
                    <li className="flex items-center gap-2.5">
                      <Check size={16} weight="bold" className="text-[var(--accent)]" />
                      <strong>AI Video Intros & Checks</strong>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <Check size={16} weight="bold" className="text-[var(--accent)]" />
                      30-Day writing habits challenge
                    </li>
                    <li className="flex items-center gap-2.5">
                      <Check size={16} weight="bold" className="text-[var(--accent)]" />
                      Progress charts & history logs
                    </li>
                    <li className="flex items-center gap-2.5">
                      <Check size={16} weight="bold" className="text-[var(--accent)]" />
                      AI writing customizer
                    </li>
                  </ul>
                </div>
              </div>

              <button 
                onClick={handleSignIn}
                className="ios-button ios-button-filled w-full h-12 text-[14px] font-bold"
              >
                Try Pro for Free
              </button>
            </div>

            {/* Elite Tier */}
            <div className="bg-[var(--bg-tertiary)] p-8 rounded-[32px] border border-[var(--separator)] shadow-sm flex flex-col justify-between space-y-8 relative">
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-bold">Team & Network Plan</h3>
                  <p className="text-xs text-[var(--label-secondary)] font-medium mt-1">For teams and professional creators.</p>
                </div>

                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-serif font-bold">
                    ${isYearlyBilling ? "79" : "99"}
                  </span>
                  <span className="text-xs text-[var(--label-tertiary)] font-bold uppercase tracking-wider">/ Month</span>
                </div>

                <div className="border-t border-[var(--separator)]/60 pt-6">
                  <ul className="space-y-3.5 text-sm text-[var(--label-secondary)] font-medium">
                    <li className="flex items-center gap-2.5">
                      <Check size={16} weight="bold" className="text-purple-500" />
                      All features in Pro plan
                    </li>
                    <li className="flex items-center gap-2.5">
                      <Check size={16} weight="bold" className="text-purple-500" />
                      <strong>Team sharing & collaboration</strong>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <Check size={16} weight="bold" className="text-purple-500" />
                      Secure cloud backup storage
                    </li>
                    <li className="flex items-center gap-2.5">
                      <Check size={16} weight="bold" className="text-purple-500" />
                      Custom team settings
                    </li>
                    <li className="flex items-center gap-2.5">
                      <Check size={16} weight="bold" className="text-purple-500" />
                      Priority support anytime
                    </li>
                  </ul>
                </div>
              </div>

              <button 
                onClick={handleSignIn}
                className="ios-button ios-button-tinted w-full h-12 text-[14px] font-bold"
              >
                Contact Our Team
              </button>
            </div>

          </div>
        </div>
      </section>

      {/* FAQ Accordion Section */}
      <section className="py-24 px-6 bg-[var(--bg-secondary)]/20 border-t border-[var(--separator)]">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16 space-y-3">
            <span className="inline-block px-3 py-1 bg-amber-500/10 text-amber-500 text-xs font-bold rounded-full uppercase tracking-widest">
              Common Questions
            </span>
            <h2 className="font-serif text-[38px] sm:text-[54px] md:text-[64px] font-extrabold tracking-[-0.03em] leading-[1.05] text-[var(--label-primary)]">
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
                      animate={{ rotate: isExpanded ? 180 : 0 }}
                      transition={{ type: "spring", stiffness: 300, damping: 20 }}
                      className="text-[var(--label-tertiary)] flex-shrink-0"
                    >
                      <CaretDown size={18} weight="bold" />
                    </motion.div>
                  </button>

                  <AnimatePresence initial={false}>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: "easeInOut" }}
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

      {/* Pre-sales Guest Support Form */}
      <section className="py-24 px-6 border-t border-[var(--separator)]">
        <div className="max-w-3xl mx-auto">
          <div className="bg-[var(--bg-tertiary)] rounded-[40px] border border-[var(--separator)] p-8 sm:p-12 shadow-xl relative overflow-hidden">
            <div className="absolute -top-12 -right-12 w-32 h-32 bg-[var(--accent)] rounded-full filter blur-[50px] opacity-15 pointer-events-none" />

            <div className="text-center max-w-2xl mx-auto mb-10 space-y-3">
              <div className="w-12 h-12 bg-[var(--accent)]/10 text-[var(--accent)] rounded-2xl flex items-center justify-center mx-auto">
                <Envelope size={24} weight="duotone" />
              </div>
              <h3 className="font-serif text-[32px] sm:text-[38px] font-extrabold tracking-[-0.03em] leading-[1.05]">Have a question?</h3>
              <p className="text-[15px] text-[var(--label-secondary)] font-medium">
                We are here to help! Our team typically replies within an hour. Send us your question below.
              </p>
            </div>

            <form onSubmit={handleContactSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--label-secondary)] ml-1">Your Email Address</label>
                <input 
                  type="email"
                  required
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="ios-input w-full bg-[var(--bg-secondary)] border border-[var(--separator)] rounded-2xl px-5 h-14 text-[15px] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition-colors text-[var(--label-primary)]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--label-secondary)] ml-1">Your Message</label>
                <textarea 
                  required
                  rows={4}
                  value={contactMessage}
                  onChange={(e) => setContactMessage(e.target.value)}
                  placeholder="How can we help you today?"
                  className="ios-input w-full bg-[var(--bg-secondary)] border border-[var(--separator)] rounded-2xl px-5 py-4 text-[15px] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition-colors text-[var(--label-primary)] resize-none h-32"
                />
              </div>

              <button 
                type="submit"
                disabled={isSubmittingContact || !contactEmail || !contactMessage}
                className="ios-button ios-button-filled w-full h-14 text-[15px] font-bold flex items-center justify-center gap-2 shadow-lg shadow-[var(--accent)]/10"
              >
                {isSubmittingContact ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    Send Message
                    <ArrowRight size={16} weight="bold" />
                  </>
                )}
              </button>

              <AnimatePresence>
                {contactSuccess && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-2xl text-center text-sm font-bold"
                  >
                    Your message was sent successfully! Our team will follow up via email shortly.
                  </motion.div>
                )}
              </AnimatePresence>
            </form>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-20 px-6 border-t border-[var(--separator)] text-center sm:text-left bg-[var(--bg-tertiary)]">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12">
          <div className="space-y-4">
            <div className="flex items-center gap-2 justify-center sm:justify-start cursor-pointer" onClick={() => navigate?.('/')}>
               <div className="p-1.5 bg-[var(--accent)]/10 rounded-lg text-[var(--accent)]">
                 <BrandIcon size={18} />
               </div>
               <span className="font-bold text-[19px] tracking-tight">CreatorOS</span>
            </div>
            <p className="text-[14px] text-[var(--label-secondary)] font-medium leading-relaxed max-w-xs mx-auto sm:mx-0">
              The simple writing and design workspace built to help you create beautiful content and grow your channel.
            </p>
          </div>
          
          <div className="space-y-4">
            <span className="ios-label p-0 uppercase tracking-widest text-xs font-bold text-[var(--label-tertiary)]">Product</span>
            <ul className="space-y-2.5 text-[14px] font-semibold text-[var(--label-secondary)]">
               <li><a href="#features" className="hover:text-[var(--accent)] transition-colors">Features</a></li>
               <li><a href="#pricing" className="hover:text-[var(--accent)] transition-colors">Pricing</a></li>
               <li>
                 <button onClick={() => navigate?.('/roadmap')} className="hover:text-[var(--accent)] transition-colors text-left font-semibold">
                   30-Day challenge
                 </button>
               </li>
            </ul>
          </div>

          <div className="space-y-4">
            <span className="ios-label p-0 uppercase tracking-widest text-xs font-bold text-[var(--label-tertiary)]">Company & Support</span>
            <ul className="space-y-2.5 text-[14px] font-semibold text-[var(--label-secondary)]">
               <li>
                 <button onClick={() => navigate?.('/privacy')} className="hover:text-[var(--accent)] transition-colors text-left font-semibold">
                   Privacy Protection
                 </button>
               </li>
               <li>
                 <button onClick={() => navigate?.('/terms')} className="hover:text-[var(--accent)] transition-colors text-left font-semibold">
                   Terms of Service
                 </button>
               </li>
               <li>
                 <button onClick={() => navigate?.('/help')} className="hover:text-[var(--accent)] transition-colors text-left font-semibold">
                   Public Help Documentation
                 </button>
               </li>
            </ul>
          </div>

          <div className="space-y-4">
            <span className="ios-label p-0 uppercase tracking-widest text-xs font-bold text-[var(--label-tertiary)]">Connect with us</span>
            <div className="flex items-center gap-3.5 justify-center sm:justify-start">
               {[
                 { icon: Twitter, href: "https://twitter.com" },
                 { icon: Youtube, href: "https://youtube.com" },
                 { icon: Instagram, href: "https://instagram.com" }
               ].map((social, i) => (
                 <a 
                   key={i} 
                   href={social.href}
                   target="_blank"
                   rel="noopener noreferrer"
                   className="w-10 h-10 rounded-xl bg-[var(--bg-secondary)] flex items-center justify-center text-[var(--label-secondary)] hover:text-[var(--accent)] hover:bg-[var(--accent)]/5 transition-all border border-[var(--separator)] shadow-sm"
                 >
                    <social.icon size={18} weight="bold" />
                 </a>
               ))}
            </div>
            <p className="text-[11px] text-[var(--label-tertiary)] font-semibold mt-2 block">Available internationally on all desktop platforms</p>
          </div>
        </div>
        
        <div className="max-w-7xl mx-auto pt-10 mt-10 border-t border-[var(--separator)] flex flex-col sm:flex-row items-center justify-between gap-4">
           <p className="text-[13px] text-[var(--label-tertiary)] font-semibold">© 2026 CreatorOS. All rights reserved.</p>
           <p className="text-[13px] text-[var(--label-tertiary)] font-semibold flex items-center gap-1.5 underline cursor-pointer">
             <span className="w-2 h-2 rounded-full bg-[var(--system-green)] block animate-pulse" />
             All Systems Operational
           </p>
        </div>
      </footer>
    </div>
  );
}
