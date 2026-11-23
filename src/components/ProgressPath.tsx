import { motion } from 'motion/react';
import { Check } from '@phosphor-icons/react';

interface ProgressPathProps {
  currentStep: number;
  totalSteps: number;
  className?: string;
}

export function ProgressPath({ currentStep, totalSteps, className }: ProgressPathProps) {
  const progress = currentStep / totalSteps;

  return (
    <div className={`relative w-full h-24 ${className || ''}`}>
      {/* Ambient glow background */}
      <div className="absolute inset-0 bg-gradient-to-r from-[var(--accent-soft)] via-transparent to-transparent opacity-30 blur-2xl" />

      {/* Mountain silhouette layers */}
      <svg 
        className="absolute bottom-0 left-0 right-0 h-20 w-full" 
        viewBox="0 0 400 80" 
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="mountain-gradient-1" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="var(--surface-3)" />
            <stop offset="100%" stopColor="var(--surface-2)" />
          </linearGradient>
          <linearGradient id="mountain-gradient-2" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="var(--surface-2)" />
            <stop offset="100%" stopColor="var(--surface-1)" />
          </linearGradient>
          <linearGradient id="path-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.6" />
            <stop offset="50%" stopColor="var(--accent)" stopOpacity="0.3" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.1" />
          </linearGradient>
        </defs>

        {/* Back mountain layer */}
        <path
          d="M0,80 L0,50 Q50,20 100,35 T200,25 T300,40 T400,55 L400,80 Z"
          fill="url(#mountain-gradient-1)"
          opacity="0.6"
        />

        {/* Mid mountain layer */}
        <path
          d="M0,80 L0,60 Q60,30 120,40 T240,35 T360,45 L400,80 Z"
          fill="url(#mountain-gradient-2)"
          opacity="0.8"
        />

        {/* Foreground mountain - darker */}
        <path
          d="M0,80 L0,70 Q80,45 150,55 T300,50 L400,80 Z"
          fill="var(--surface-1)"
        />

        {/* Illuminated path winding through mountains */}
        <path
          d="M20,75 Q80,55 140,50 T280,40 T380,35"
          stroke="url(#path-gradient)"
          strokeWidth="2.5"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter="drop-shadow(0 0 8px rgba(244, 162, 97, 0.4))"
        >
          <animateMotion
            path="M20,75 Q80,55 140,50 T280,40 T380,35"
            dur="8s"
            repeatCount="indefinite"
            rotate="auto"
          >
            <mpath href="#path-gradient" />
          </animateMotion>
        </path>

        {/* Progress indicator along path */}
        <motion.circle
          cx={20 + progress * 360}
          cy={75 - progress * 40}
          r={6}
          fill="var(--accent)"
          className="accent-glow"
          style={{ filter: 'drop-shadow(0 0 12px rgba(244, 162, 97, 0.6))' }}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.3, type: 'spring', stiffness: 200, damping: 15 }}
        />

        {/* Step markers along path */}
        {Array.from({ length: totalSteps }, (_, i) => {
          const stepProgress = (i + 1) / totalSteps;
          const isCompleted = i < currentStep;
          const isCurrent = i === currentStep - 1;
          return (
            <motion.circle
              key={i}
              cx={20 + stepProgress * 360}
              cy={75 - stepProgress * 40}
              r={isCurrent ? 5 : 4}
              fill={isCompleted || isCurrent ? 'var(--accent)' : 'var(--surface-2)'}
              stroke={isCompleted || isCurrent ? 'none' : 'var(--separator)'}
              strokeWidth={1.5}
              className={isCurrent ? 'accent-glow' : ''}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.1 * i + 0.2, type: 'spring', stiffness: 200, damping: 15 }}
            />
          );
        })}
      </svg>

      {/* Step labels */}
      <div className="absolute bottom-0 left-4 right-4 flex justify-between px-2 -translate-y-1">
        {Array.from({ length: totalSteps }, (_, i) => {
          const isCompleted = i < currentStep;
          const isCurrent = i === currentStep - 1;
          return (
            <motion.span
              key={i}
              className={`text-micro text-center w-[calc(100%/3)] ${
                isCurrent 
                  ? 'text-[var(--accent)] font-semibold' 
                  : isCompleted 
                    ? 'text-[var(--label-secondary)]' 
                    : 'text-[var(--label-tertiary)]'
              }`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * i + 0.4 }}
            >
              Step {i + 1}
            </motion.span>
          );
        })}
      </div>
    </div>
  );
}