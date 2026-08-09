import React from 'react';
import { motion } from 'motion/react';
import BrandIcon from './BrandIcon';

export default function LoadingScreen() {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex flex-col items-center justify-center relative overflow-hidden">
      {/* Background Atmosphere */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-[120px] animate-pulse" style={{backgroundColor: 'color-mix(in srgb, var(--accent) 10%, transparent)'}} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full blur-[100px] animate-pulse" style={{backgroundColor: 'color-mix(in srgb, var(--system-green) 5%, transparent)', animationDelay: '1s' }} />
      </div>

      {/* Icon Container */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.8, ease: [0.23, 1, 0.32, 1] }}
        className="relative z-10"
      >
        {/* Glassmorphism Icon Base */}
        <div className="w-24 h-24 bg-white/5 backdrop-blur-xl border border-white/10 rounded-[28px] flex items-center justify-center shadow-2xl relative group overflow-hidden">
          {/* Inner Glow */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-50" />
          
          {/* Brand Icon */}
          <motion.div
            animate={{ 
              scale: [1, 1.1, 1],
              rotate: [0, 5, -5, 0],
              filter: ['drop-shadow(0 0 0px rgba(255,255,255,0))', 'drop-shadow(0 0 15px rgba(255,255,255,0.5))', 'drop-shadow(0 0 0px rgba(255,255,255,0))']
            }}
            transition={{ 
              duration: 3, 
              repeat: Infinity,
              ease: "easeInOut" 
            }}
          >
            <BrandIcon size={40} className="text-white" strokeWidth={1.5} />
          </motion.div>

          {/* Shine Effect */}
          <motion.div 
            animate={{ 
              left: ['-100%', '200%'] 
            }}
            transition={{ 
              duration: 2, 
              repeat: Infinity, 
              repeatDelay: 3,
              ease: "easeInOut" 
            }}
            className="absolute top-0 bottom-0 w-1/2 bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12"
          />
        </div>
      </motion.div>

      {/* Text */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.6 }}
        className="mt-8 text-center z-10"
      >
        <h1 className="font-serif font-bold text-2xl text-[var(--label-primary)] tracking-tight mb-2">CreatorOS</h1>
        <div className="flex items-center justify-center gap-2">
          <div className="w-1 h-1 rounded-full bg-[var(--accent)] animate-pulse" />
          <span className="text-[10px] font-black text-[var(--label-tertiary)] tracking-[0.3em] uppercase">Initializing System</span>
        </div>
      </motion.div>

      {/* Progress Bar (Decorative) */}
      <div className="absolute bottom-12 left-1/2 -translate-x-1/2 w-48 h-[1px] bg-[var(--separator)] overflow-hidden">
        <motion.div 
          animate={{ 
            left: ['-100%', '100%'] 
          }}
          transition={{ 
            duration: 1.5, 
            repeat: Infinity, 
            ease: "easeInOut" 
          }}
          className="absolute inset-0 bg-gradient-to-r from-transparent via-[var(--accent)] to-transparent"
        />
      </div>
    </div>
  );
}
