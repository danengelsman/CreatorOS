import React from 'react';
import { motion } from 'motion/react';
import { Shield, ArrowLeft } from '@phosphor-icons/react';

export default function PrivacyPolicy({ onBack }: { onBack: () => void }) {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)] p-6 md:p-12 pb-20">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-3xl mx-auto bg-[var(--bg-secondary)] ios-card p-8 md:p-12 shadow-xl border border-[var(--separator)]"
      >
        <div 
          onClick={onBack}
          role="button"
          className="flex items-center gap-2 text-[var(--label-secondary)] hover:text-[var(--label-primary)] mb-8 font-bold text-sm transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" strokeWidth={1.5} />
          Back to App
        </div>

        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{background: 'color-mix(in srgb, var(--accent) 12%, transparent)', color: 'var(--accent)'}}>
            <Shield className="w-6 h-6" strokeWidth={1.5} />
          </div>
          <h1 className="font-serif text-[36px] font-semibold tracking-[-0.015em] text-[var(--label-primary)]">Privacy Policy</h1>
        </div>

        <div className="prose max-w-none space-y-6 text-[var(--label-secondary)] leading-relaxed font-medium">
          <p className="text-[var(--label-primary)] font-bold">Effective Date: March 28, 2026</p>
          
          <section className="space-y-4">
            <h2 className="font-serif text-[24px] font-semibold tracking-[-0.015em] text-[var(--label-primary)]">1. Information We Collect</h2>
            <p>We collect information you provide directly to us when you create an account, such as your name, email address, and any brand-related data you input into CreatorOS. When you use our AI services, we may also collect the prompts and content you generate to improve our models.</p>
          </section>

          <section className="space-y-4">
            <h2 className="font-serif text-[24px] font-semibold tracking-[-0.015em] text-[var(--label-primary)]">2. Google OAuth and YouTube Data</h2>
            <p>CreatorOS uses Google OAuth to allow you to connect your YouTube channel. We only request the minimum permissions necessary to upload videos and retrieve channel analytics. We do not store your Google password. Your YouTube data is used solely to provide the features of the app and is not shared with third parties.</p>
          </section>

          <section className="space-y-4">
            <h2 className="font-serif text-[24px] font-semibold tracking-[-0.015em] text-[var(--label-primary)]">3. How We Use Your Information</h2>
            <p>We use the information we collect to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Provide, maintain, and improve our services.</li>
              <li>Develop new features and AI capabilities.</li>
              <li>Communicate with you about your account and updates.</li>
              <li>Monitor and analyze trends, usage, and activities.</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="font-serif text-[24px] font-semibold tracking-[-0.015em] text-[var(--label-primary)]">4. Data Retention</h2>
            <p>We retain your personal information for as long as necessary to provide the services you have requested, or for other essential purposes such as complying with our legal obligations, resolving disputes, and enforcing our policies.</p>
          </section>

          <section className="space-y-4">
            <h2 className="font-serif text-[24px] font-semibold tracking-[-0.015em] text-[var(--label-primary)]">5. Your Rights</h2>
            <p>Depending on your location, you may have the right to access, correct, or delete your personal data. You can manage your account settings within the app or contact us for assistance.</p>
          </section>

          <section className="space-y-4">
            <h2 className="font-serif text-[24px] font-semibold tracking-[-0.015em] text-[var(--label-primary)]">6. Contact Us</h2>
            <p>If you have any questions about this Privacy Policy, please contact us at <span className="text-[var(--accent)] font-bold">privacy@creatoros.ai</span>.</p>
          </section>
        </div>
      </motion.div>
    </div>
  );
}
