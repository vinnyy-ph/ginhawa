// frontend/src/components/ui/progress-indicator.tsx
import * as React from 'react';
import { cn } from '@/lib/utils';

interface ProgressIndicatorProps {
  currentStep: number;
  totalSteps: number;
  className?: string;
}

export function ProgressIndicator({
  currentStep,
  totalSteps,
  className,
}: ProgressIndicatorProps) {
  return (
    <div
      className={cn('flex flex-col gap-2', className)}
      aria-label={`Step ${currentStep} of ${totalSteps}`}
      role="progressbar"
      aria-valuenow={currentStep}
      aria-valuemin={1}
      aria-valuemax={totalSteps}
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-on-surface-variant font-manrope uppercase tracking-wider">
          Step {currentStep} of {totalSteps}
        </p>
        <p className="text-xs text-outline font-manrope">
          {Math.round((currentStep / totalSteps) * 100)}% complete
        </p>
      </div>
      <div className="flex gap-1.5">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div
            key={i}
            className={cn(
              'h-1.5 flex-1 rounded-full transition-all duration-300',
              i < currentStep
                ? 'bg-gradient-to-r from-[#48cab6] to-[#31a795]'
                : 'bg-outline-variant',
            )}
          />
        ))}
      </div>
    </div>
  );
}
