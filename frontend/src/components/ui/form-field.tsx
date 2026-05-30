// frontend/src/components/ui/form-field.tsx
/**
 * FormField — accessible label + input wrapper. Clones `aria-describedby`
 * and `aria-invalid` onto the single child element so inputs stay connected
 * to their hint/error text without requiring manual prop wiring.
 */
'use client';

import * as React from 'react';
import * as LabelPrimitive from '@radix-ui/react-label';
import { cn } from '@/lib/utils';

interface FormFieldProps {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function FormField({
  id,
  label,
  error,
  hint,
  required,
  children,
  className,
}: FormFieldProps) {
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <LabelPrimitive.Root
        htmlFor={id}
        className="text-sm font-semibold text-on-surface-variant font-manrope"
      >
        {label}
        {required && (
          <span className="ml-1 text-error" aria-hidden="true">
            *
          </span>
        )}
      </LabelPrimitive.Root>

      {React.Children.map(children, (child) =>
        React.isValidElement(child)
          ? React.cloneElement(child as React.ReactElement<Record<string, unknown>>, {
              id,
              'aria-describedby': [error ? errorId : '', hint ? hintId : '']
                .filter(Boolean)
                .join(' ') || undefined,
              'aria-invalid': error ? true : undefined,
            })
          : child,
      )}

      {hint && !error && (
        <p id={hintId} className="text-xs text-on-surface-variant font-manrope">
          {hint}
        </p>
      )}
      {error && (
        <p
          id={errorId}
          role="alert"
          className="flex items-center gap-1 text-xs text-error font-manrope"
        >
          <svg
            aria-hidden="true"
            className="h-3.5 w-3.5 shrink-0"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
}
