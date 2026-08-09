import React from 'react';
import { cn } from '../lib/utils';

interface IconProps {
  className?: string;
  size?: number;
  glow?: boolean;
}

const IconWrapper = ({ children, size, glow, className }: { children: React.ReactNode, size: number, glow?: boolean, className?: string }) => (
  <div className={cn("relative flex items-center justify-center text-current", className)}>
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 40 40" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      {glow && (
        <circle cx="20" cy="20" r="16" fill="currentColor" fillOpacity="0.1" className="animate-pulse" />
      )}
      {children}
    </svg>
  </div>
);

export const StudioIcon = ({ className, size = 24, glow }: IconProps) => (
  <IconWrapper size={size} glow={glow} className={className}>
    <rect x="8" y="8" width="24" height="24" rx="6" stroke="currentColor" strokeWidth="1.5" />
    <path d="M14 26L26 14M22 10L30 18L18 30L10 22L18 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </IconWrapper>
);

export const HubIcon = ({ className, size = 24, glow }: IconProps) => (
  <IconWrapper size={size} glow={glow} className={className}>
    <path d="M20 4L34 12V28L20 36L6 28V12L20 4Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    <path d="M20 4V36M6 12L34 28M34 12L6 28" stroke="currentColor" strokeWidth="1" strokeDasharray="1 3" />
    <circle cx="20" cy="20" r="5" stroke="currentColor" strokeWidth="1.5" />
  </IconWrapper>
);

export const IntelligenceIcon = ({ className, size = 24, glow }: IconProps) => (
  <IconWrapper size={size} glow={glow} className={className}>
    <path d="M20 6L32 20L20 34L8 20L20 6Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    <circle cx="20" cy="14" r="2.5" fill="currentColor" />
    <circle cx="14" cy="24" r="2.5" fill="currentColor" />
    <circle cx="26" cy="24" r="2.5" fill="currentColor" />
    <path d="M20 14L14 24M20 14L26 24M14 24L26 24" stroke="currentColor" strokeWidth="1" />
  </IconWrapper>
);

export const CommunityIcon = ({ className, size = 24, glow }: IconProps) => (
  <IconWrapper size={size} glow={glow} className={className}>
    <circle cx="20" cy="20" r="14" stroke="currentColor" strokeWidth="1.5" />
    <path d="M20 12C17.7909 12 16 13.7909 16 16C16 18.2091 17.7909 20 20 20C22.2091 20 24 18.2091 24 16C24 13.7909 22.2091 12 20 12Z" stroke="currentColor" strokeWidth="1.5" />
    <path d="M12 28C12 24.6863 15.5817 22 20 22C24.4183 22 28 24.6863 28 28" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </IconWrapper>
);

export const RoadmapIcon = ({ className, size = 24, glow }: IconProps) => (
  <IconWrapper size={size} glow={glow} className={className}>
    <circle cx="20" cy="20" r="14" stroke="currentColor" strokeWidth="1.5" />
    <path d="M20 8L28 32H12L20 8Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    <circle cx="20" cy="20" r="2.5" fill="currentColor" />
  </IconWrapper>
);

export const ProfileIcon = ({ className, size = 24, glow }: IconProps) => (
  <IconWrapper size={size} glow={glow} className={className}>
    <path d="M20 4L34 12V28L20 36L6 28V12L20 4Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    <circle cx="20" cy="16" r="4" stroke="currentColor" strokeWidth="1.5" />
    <path d="M12 28C12 25 15 23 20 23C25 23 28 25 28 28" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </IconWrapper>
);

export const SettingsIcon = ({ className, size = 24, glow }: IconProps) => (
  <IconWrapper size={size} glow={glow} className={className}>
    <circle cx="20" cy="20" r="10" stroke="currentColor" strokeWidth="1.5" />
    <path d="M20 11V14M20 26V29M11 20H14M26 20H29" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <circle cx="20" cy="20" r="2.5" fill="currentColor" />
  </IconWrapper>
);

export const SearchIcon = ({ className, size = 24, glow }: IconProps) => (
  <IconWrapper size={size} glow={glow} className={className}>
    <circle cx="18" cy="18" r="10" stroke="currentColor" strokeWidth="1.5" />
    <path d="M26 26L34 34" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </IconWrapper>
);

export const GrowthIcon = ({ className, size = 24, glow }: IconProps) => (
  <IconWrapper size={size} glow={glow} className={className}>
    <path d="M6 34L14 22L22 28L34 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="34" cy="10" r="3.5" fill="currentColor" />
  </IconWrapper>
);
