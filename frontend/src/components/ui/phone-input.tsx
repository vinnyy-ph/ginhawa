// frontend/src/components/ui/phone-input.tsx
/**
 * PhoneInput — tel input with a fixed "+63" country-code prefix for Philippine
 * numbers. The prefix is purely presentational (pointer-events-none); the raw
 * number value is managed by the parent.
 */
'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export type PhoneInputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const PhoneInput = React.forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ className, ...props }, ref) => {
    return (
      <div className="relative flex items-center">
        <div className="absolute left-3 text-sm font-bold text-on-surface-variant pointer-events-none border-r border-outline-variant/50 pr-2">
          +63
        </div>
        <input
          ref={ref}
          type="tel"
          className={cn(
            'w-full rounded-md border border-outline-variant bg-surface-white px-3 py-2.5 pl-14',
            'text-sm text-on-surface font-manrope placeholder:text-outline',
            'transition-colors duration-150',
            'focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20',
            'aria-[invalid=true]:border-error aria-[invalid=true]:focus:ring-error/20',
            'disabled:cursor-not-allowed disabled:opacity-50',
            className,
          )}
          {...props}
        />
      </div>
    );
  }
);
PhoneInput.displayName = 'PhoneInput';
