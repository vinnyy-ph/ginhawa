// frontend/src/components/ui/password-input.tsx
/**
 * PasswordInput — text input with a toggleable show/hide button.
 * Drops the `type` prop from the forwarded attributes; visibility is
 * managed internally and switches between "password" and "text".
 */
'use client';

import * as React from 'react';
import { EyeOpenIcon, EyeClosedIcon } from '@radix-ui/react-icons';
import { cn } from '@/lib/utils';

type PasswordInputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'>;

export const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, ...props }, ref) => {
    const [visible, setVisible] = React.useState(false);

    return (
      <div className="relative">
        <input
          ref={ref}
          type={visible ? 'text' : 'password'}
          className={cn(
            'w-full rounded-md border border-outline-variant bg-surface-white px-3 py-2.5 pr-10',
            'text-sm text-on-surface font-manrope placeholder:text-outline',
            'transition-colors duration-150',
            'focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20',
            'aria-[invalid=true]:border-error aria-[invalid=true]:focus:ring-error/20',
            'disabled:cursor-not-allowed disabled:opacity-50',
            className,
          )}
          {...props}
        />
        <button
          type="button"
          aria-label={visible ? 'Hide password' : 'Show password'}
          className="absolute right-1 top-1/2 -translate-y-1/2 h-9 w-9 flex items-center justify-center text-outline hover:text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-full transition-colors"
          onClick={() => setVisible((v) => !v)}
        >
          {visible ? (
            <EyeClosedIcon className="h-4 w-4" />
          ) : (
            <EyeOpenIcon className="h-4 w-4" />
          )}
        </button>
      </div>
    );
  },
);
PasswordInput.displayName = 'PasswordInput';
