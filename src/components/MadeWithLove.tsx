import React from 'react';
import { Heart } from '@phosphor-icons/react';

interface MadeWithLoveProps {
  className?: string;
}

export default function MadeWithLove({ className = '' }: MadeWithLoveProps) {
  return (
    <p
      className={`text-xs text-[var(--label-tertiary)] flex items-center justify-center gap-1.5 font-medium select-none ${className}`}
      data-testid="founder-credit"
    >
      <span>Made with</span>
      <Heart
        size={14}
        weight="fill"
        className="text-rose-500 shrink-0 inline-block"
        aria-hidden="true"
      />
      <span>love in Holland, MI by Daniel Engelsman</span>
    </p>
  );
}
