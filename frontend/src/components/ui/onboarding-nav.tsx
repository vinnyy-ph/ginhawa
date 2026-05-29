// frontend/src/components/ui/onboarding-nav.tsx
'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Button } from './button';
import { Spinner } from './spinner';

/**
 * Standard Back/Continue footer for onboarding steps.
 * Back (outline) left, primary action right; stacks full-width below sm.
 * If onBack is omitted, the primary action right-aligns alone.
 */
export function OnboardingNav({
  onBack,
  submitLabel,
  loadingLabel = 'Processing…',
  loading = false,
  disabled = false,
  submitType = 'submit',
  onSubmit,
}: {
  onBack?: () => void;
  submitLabel: string;
  loadingLabel?: string;
  loading?: boolean;
  disabled?: boolean;
  submitType?: 'submit' | 'button';
  onSubmit?: () => void;
}) {
  return (
    <div
      className={cn(
        'flex flex-col-reverse sm:flex-row gap-3 pt-2',
        onBack ? 'sm:justify-between' : 'sm:justify-end',
      )}
    >
      {onBack && (
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="w-full sm:w-auto sm:min-w-[140px]"
          onClick={onBack}
          disabled={loading}
        >
          ← Back
        </Button>
      )}
      <Button
        type={submitType}
        size="lg"
        className="w-full sm:w-auto sm:min-w-[140px]"
        onClick={onSubmit}
        disabled={loading || disabled}
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <Spinner className="w-5 h-5" /> {loadingLabel}
          </span>
        ) : (
          submitLabel
        )}
      </Button>
    </div>
  );
}
