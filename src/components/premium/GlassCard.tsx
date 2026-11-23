import React from 'react';
import { cn } from '@/lib/utils';

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'thin' | 'regular' | 'thick' | 'hero' | 'elevated' | 'base';
  children: React.ReactNode;
}

const variantClasses = {
  thin: 'glass-thin',
  regular: 'glass-regular',
  thick: 'glass-thick',
  hero: 'card-hero',
  elevated: 'card-elevated',
  base: 'card-base',
};

export function GlassCard({ 
  variant = 'base', 
  className, 
  children, 
  ...props 
}: GlassCardProps) {
  return (
    <div 
      className={cn(
        'rounded-[var(--radius-xl)] border border-white/10',
        variantClasses[variant],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}