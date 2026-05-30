// frontend/src/components/ui/toast.tsx
/**
 * Toast — fixed-position snackbar for success and error notifications.
 * Auto-dismisses after 4 seconds when `onDismiss` is provided.
 * Uses role="alert" + aria-live="assertive" for errors, and role="status" +
 * aria-live="polite" for success, following ARIA live-region best practices.
 */
'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { CheckCircledIcon, CrossCircledIcon } from '@radix-ui/react-icons';

type ToastVariant = 'success' | 'error';

interface ToastProps {
  message: string;
  variant?: ToastVariant;
  onDismiss?: () => void;
}

export function Toast({ message, variant = 'success', onDismiss }: ToastProps) {
  React.useEffect(() => {
    if (!onDismiss) return;
    const timer = setTimeout(onDismiss, 4000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div
      role={variant === 'error' ? 'alert' : 'status'}
      aria-live={variant === 'error' ? 'assertive' : 'polite'}
      className={cn(
        'fixed bottom-6 left-1/2 z-50 -translate-x-1/2',
        'flex items-center gap-2 rounded-lg px-5 py-3',
        'shadow-lifted text-sm font-manrope font-semibold',
        'animate-toast-in',
        variant === 'success'
          ? 'bg-gradient-to-r from-brand-light to-brand text-white'
          : 'bg-error text-white',
      )}
    >
      {variant === 'success' ? (
        <CheckCircledIcon className="h-4 w-4 shrink-0" />
      ) : (
        <CrossCircledIcon className="h-4 w-4 shrink-0" />
      )}
      {message}
      {onDismiss && (
        <button
          onClick={onDismiss}
          aria-label="Dismiss notification"
          className="ml-2 opacity-70 hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 rounded"
        >
          ✕
        </button>
      )}
    </div>
  );
}
