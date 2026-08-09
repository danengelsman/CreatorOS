import React from 'react';
import { cn } from '../lib/utils';

interface BrandIconProps {
  className?: string;
  size?: number;
  glow?: boolean;
  strokeWidth?: number;
}

export default function BrandIcon({ className, size = 24, glow = false, strokeWidth = 1.5 }: BrandIconProps) {
  return (
    <div className="relative flex items-center justify-center">
      <svg 
        width={size} 
        height={size} 
        viewBox="0 0 40 40" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className={cn("relative z-10", className)}
      >
        <path 
          d="M20 4L34 11V29L20 36L6 29V11L20 4Z" 
          stroke="currentColor" 
          strokeWidth={strokeWidth}
          strokeLinejoin="round"
        />
        <path 
          d="M20 12V28M12 20H28" 
          stroke="currentColor" 
          strokeWidth={strokeWidth} 
          strokeLinecap="round" 
        />
        <circle cx="20" cy="20" r={strokeWidth * 0.6} fill="currentColor" />
      </svg>
      {glow && (
        <div className="absolute inset-0 bg-current opacity-20 blur-[8px] rounded-full animate-pulse" />
      )}
    </div>
  );
}
