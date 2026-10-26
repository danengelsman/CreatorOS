import React, { useState, useEffect } from 'react';
import LandingHeader from './landing/LandingHeader';
import LandingHero from './landing/LandingHero';
import LandingSandbox from './landing/LandingSandbox';
import LandingFeatures from './landing/LandingFeatures';
import LandingPricing from './landing/LandingPricing';
import LandingFaq from './landing/LandingFaq';
import LandingContact from './landing/LandingContact';
import LandingFooter from './landing/LandingFooter';

interface LandingPageProps {
  navigate?: (path: string) => void;
}

export default function LandingPage({ navigate }: LandingPageProps) {
  // A/B test state for headline (50/50 split)
  const [headlineVariant] = useState<'A' | 'B'>(() => (Math.random() > 0.5 ? 'B' : 'A'));

  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Interactive Sandbox state
  const [selectedNiche, setSelectedNiche] = useState('tech');
  const [selectedVibe, setSelectedVibe] = useState('calm');
  const [isGeneratingSandbox, setIsGeneratingSandbox] = useState(false);

  // FAQ state
  const [expandedFaqIndex, setExpandedFaqIndex] = useState<number | null>(0);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);

    // Smooth scroll for anchor links
    const handleAnchorClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest('a[href^="#"]');
      if (anchor) {
        e.preventDefault();
        const targetId = anchor.getAttribute('href');
        if (targetId && targetId !== '#') {
          const targetElement = document.querySelector(targetId);
          if (targetElement) {
            targetElement.scrollIntoView({ behavior: 'smooth' });
            setIsMobileMenuOpen(false);
          }
        }
      }
    };
    document.addEventListener('click', handleAnchorClick);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('click', handleAnchorClick);
    };
  }, []);

  const handleSignIn = () => {
    if (navigate) {
      navigate('/login');
    } else {
      window.location.href = '/login';
    }
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

  return (
    <div className="bg-[var(--bg-primary)] text-[var(--label-primary)] font-sans selection:bg-[var(--accent)] selection:text-white overflow-x-hidden">
      <LandingHeader
        isScrolled={isScrolled}
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
        navigate={navigate}
        onSignIn={handleSignIn}
      />

      <LandingHero headlineVariant={headlineVariant} onSignIn={handleSignIn} />

      <LandingSandbox
        selectedNiche={selectedNiche}
        selectedVibe={selectedVibe}
        isGeneratingSandbox={isGeneratingSandbox}
        onSandboxChange={handleSandboxChange}
        onSignIn={handleSignIn}
      />

      <LandingFeatures onSignIn={handleSignIn} navigate={navigate} />

      <LandingPricing onSignIn={handleSignIn} />

      <LandingFaq expandedFaqIndex={expandedFaqIndex} setExpandedFaqIndex={setExpandedFaqIndex} />

      <LandingContact />

      <LandingFooter navigate={navigate} />
    </div>
  );
}
