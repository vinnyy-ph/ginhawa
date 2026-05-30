'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export function Chip({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'px-3 py-1.5 rounded-full text-xs font-medium transition-all border',
        selected
          ? 'bg-primary text-white border-primary shadow-sm'
          : 'bg-surface-white text-on-surface-variant border-outline-variant hover:border-primary/50 hover:bg-surface-variant/50',
      )}
    >
      {children}
    </button>
  );
}
