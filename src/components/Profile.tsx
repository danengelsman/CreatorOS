import React, { useState, useRef } from 'react';
import { UserCircle as User, Envelope as Mail, Calendar, Shield, ArrowSquareOut as ExternalLink, ShareNetwork as Share2, Medal as Award, Lightning as Zap, TrendUp as TrendingUp, Globe, Camera, CircleNotch as Loader2, SignOut as LogOut, Crown, Sparkle } from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { auth, db, updateProfile, handleFirestoreError, OperationType, compressBase64Image } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import AvatarGenerator from './AvatarGenerator';
import Integrations from './Integrations';
import { authorizedFetch } from '../firebase';

import { User as FirebaseUser } from 'firebase/auth';

export default function Profile({ user, userData, brand }: { user: FirebaseUser, userData: any, brand: any }) {
  const [isUploading, setIsUploading] = useState(false);
  const [showAvatarGenerator, setShowAvatarGenerator] = useState(false);
  const [stats, setStats] = useState({ reach: '---', score: '0', streak: '0' });
  const fileInputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    const fetchStats = async () => {
      try {
        const [yt, tt] = await Promise.all([
          authorizedFetch('/api/analytics/youtube').catch(() => null),
          authorizedFetch('/api/analytics/tiktok').catch(() => null)
        ]);
        
        let totalViews = 0;
        if (yt?.views) totalViews += yt.views;
        if (tt?.views) totalViews += tt.views;

        const formattedReach = totalViews > 1000 
          ? `${(totalViews / 1000).toFixed(1)}K` 
          : totalViews.toString();

        setStats(prev => ({
          ...prev,
          reach: totalViews > 0 ? formattedReach : '---'
        }));
      } catch (error) {
        console.error('Error fetching profile stats:', error);
      }
    };
    fetchStats();
  }, []);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !auth.currentUser) return;

    setIsUploading(true);
    try {
      // Convert to base64 for storage since we don't have Firebase Storage set up
      const reader = new FileReader();
      reader.onloadend = async () => {
        const rawBase64 = reader.result as string;
        
        try {
          const compressedBase64 = await compressBase64Image(rawBase64);
          
          // 1. Update Firestore User Document
          const userRef = doc(db, 'users', auth.currentUser!.uid);
          await updateDoc(userRef, {
            photoURL: compressedBase64,
            avatarType: 'uploaded',
            updatedAt: new Date().toISOString()
          });
        } catch (error) {
          handleFirestoreError(error, OperationType.UPDATE, `users/${auth.currentUser?.uid}`);
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Error uploading photo:", error);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex flex-col gap-10">
      <AnimatePresence>
        {showAvatarGenerator && (
          <AvatarGenerator 
            onClose={() => setShowAvatarGenerator(false)} 
            onAvatarSet={() => {}} 
          />
        )}
      </AnimatePresence>

      <section className="ios-card bg-[var(--bg-secondary)] p-8 ios-elevated relative overflow-hidden border-t border-white/5">
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
          <div className="relative shrink-0">
            <div className="relative w-32 h-32 rounded-3xl overflow-hidden ios-elevated border-4 border-white/10 flex items-center justify-center bg-[var(--bg-tertiary)]">
              {(userData?.photoURL || user?.photoURL) ? (
                <img 
                  src={userData?.photoURL || user?.photoURL} 
                  alt={userData?.displayName || user?.displayName || 'User'} 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <User size={64} weight="duotone" className="text-[var(--label-tertiary)]" />
              )}
              {isUploading && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm">
                  <Loader2 size={32} strokeWidth={1.5} className="text-white animate-spin" />
                </div>
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="ios-button ios-button-gray p-3"
                >
                  <Camera size={24} strokeWidth={1.5} className="text-white" />
                </button>
              </div>
            </div>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handlePhotoUpload} 
              accept="image/*" 
              className="hidden" 
            />
          </div>
          
          <div className="flex-1 text-center md:text-left space-y-4">
            <div>
              <div className="flex flex-col sm:flex-row items-center md:items-start md:justify-start gap-2 mb-2">
                <h1 className="font-serif text-[36px] font-semibold tracking-[-0.015em] text-[var(--label-primary)]">{userData?.displayName || user?.displayName || 'Creator'}</h1>
                <div className="flex gap-2 items-center">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium text-[var(--label-secondary)] bg-[var(--bg-secondary)] border border-[var(--separator)]">
                    Free Plan
                  </span>
                </div>
              </div>
              <p className="text-[17px] text-[var(--label-secondary)] font-medium flex items-center justify-center md:justify-start gap-2">
                <Mail size={16} strokeWidth={1.5} />
                {user?.email}
              </p>
            </div>
            
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
              <span className="px-3 py-1 bg-[var(--bg-tertiary)] rounded-full text-[13px] font-semibold text-[var(--label-secondary)] border border-[var(--separator)]">
                {brand?.archetype || 'Visionary'}
              </span>
              <span className="px-3 py-1 bg-[var(--bg-tertiary)] rounded-full text-[13px] font-semibold text-[var(--label-secondary)] border border-[var(--separator)]">
                Joined {new Date(user?.metadata.creationTime || Date.now()).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-3 min-w-[200px]">
            <button 
              onClick={() => setShowAvatarGenerator(true)}
              className="ios-button ios-button-tinted w-full"
            >
              <Sparkle size={18} weight="duotone" className="mr-2" />
              AI Avatar Generator
            </button>
            <button className="ios-button ios-button-gray w-full">
              Edit Account
            </button>
          </div>
        </div>

        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-[var(--accent)]/5 rounded-full blur-[100px] -mr-20 -mt-20" />
      </section>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Total Reach', value: stats.reach, icon: TrendingUp, color: 'text-[var(--accent)]' },
          { label: 'Content Score', value: stats.score, icon: Award, color: 'text-[var(--accent)]' },
          { label: 'Streak Days', value: stats.streak, icon: Zap, color: 'text-[var(--system-green)]' },
        ].map((stat, i) => (
          <div key={i} className="ios-card bg-[var(--bg-secondary)] p-6 flex flex-col gap-1">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-[var(--label-secondary)] uppercase tracking-[0.2em]">{stat.label}</span>
              <stat.icon size={18} strokeWidth={1.5} className={stat.color} />
            </div>
            <p className="text-[28px] font-bold tracking-tight">{stat.value}</p>
          </div>
        ))}
      </div>

      <section className="bg-[var(--bg-secondary)] ios-card p-8">
        <Integrations />
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <section>
          <h4 className="ios-label">Profile Settings</h4>
          <div className="ios-card bg-[var(--bg-tertiary)] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-[var(--separator)]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{background: 'color-mix(in srgb, var(--accent) 12%, transparent)', color: 'var(--accent)'}}>
                  <Globe size={18} strokeWidth={1.5} />
                </div>
                <span className="text-[17px] font-medium">Public Portfolio</span>
              </div>
              <ExternalLink size={16} strokeWidth={1.5} className="text-[var(--label-tertiary)]" />
            </div>
            <div className="p-4 bg-[var(--bg-secondary)]/50">
              <div className="p-3 bg-[var(--bg-tertiary)] rounded-xl border border-[var(--separator)] mb-4">
                <code className="text-[13px] font-mono text-[var(--accent)] font-bold break-all">
                  creatoros.app/profile/{user?.uid?.slice(0, 8)}
                </code>
              </div>
              <p className="text-[14px] text-[var(--label-secondary)] leading-relaxed mb-4">
                Your portfolio is live. Content published in Studio is featured here automatically.
              </p>
              <button className="ios-button ios-button-tinted w-full mt-4">Customize URL</button>
            </div>
          </div>
        </section>

        <section>
          <h4 className="ios-label">Subscription & Account</h4>
          <div className="ios-card bg-[var(--bg-tertiary)] divide-y divide-[var(--separator)]">
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{background: 'color-mix(in srgb, var(--accent) 12%, transparent)', color: 'var(--accent)'}}>
                  <Award size={18} strokeWidth={1.5} />
                </div>
                <span className="text-[17px] font-medium">Current Plan</span>
              </div>
              <span className="text-[17px] font-serif italic text-[var(--label-primary)]">Free Plan</span>
            </div>
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{background: 'color-mix(in srgb, var(--system-green) 12%, transparent)', color: 'var(--system-green)'}}>
                  <Shield size={18} strokeWidth={1.5} />
                </div>
                <span className="text-[17px] font-medium">Status</span>
              </div>
              <span className="text-[17px] font-serif italic text-[var(--system-green)]">Active</span>
            </div>
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{background: 'color-mix(in srgb, var(--accent) 12%, transparent)', color: 'var(--accent)'}}>
                  <Share2 size={18} strokeWidth={1.5} />
                </div>
                <span className="text-[17px] font-medium">Auto-Publish</span>
              </div>
              <div className="w-12 h-6 bg-[var(--accent)] rounded-full relative">
                <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm" />
              </div>
            </div>
          </div>
          <div className="mt-8">
            <button 
              onClick={() => auth.signOut()}
              className="ios-button ios-button-tinted w-full mt-6"
              style={{
                color: 'var(--system-red)',
                background: 'color-mix(in srgb, var(--system-red) 8%, transparent)'
              }}
            >
              <LogOut size={17} strokeWidth={1.5} className="mr-2" />
              Sign Out
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
