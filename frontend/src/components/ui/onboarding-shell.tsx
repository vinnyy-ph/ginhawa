// frontend/src/components/ui/onboarding-shell.tsx
'use client';

import * as React from 'react';
import { Logo } from './logo';
import { FadeIn } from './fade-in';
import { ProgressIndicator } from './progress-indicator';

/**
 * Shared chrome for every onboarding step (patient + doctor).
 * Full-bleed brand header, surface background, and a single borderless
 * white card (rounded-lg, shadow-lifted) holding progress + title + content.
 */
export function OnboardingShell({
  step,
  totalSteps,
  title,
  subtitle,
  children,
}: {
  step: number;
  totalSteps: number;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-surface flex flex-col">
      <header className="flex items-center gap-2 px-4 sm:px-6 py-4 border-b border-outline-variant bg-surface-white">
        <Logo size={28} />
        <span className="text-sm font-semibold text-primary font-plus-jakarta tracking-wide">
          Ginhawa
        </span>
      </header>
      <main className="flex flex-1 flex-col items-center px-4 py-8 sm:py-10">
        <FadeIn className="w-full max-w-xl">
          <div className="bg-surface-white rounded-lg shadow-lifted p-6 sm:p-8 flex flex-col gap-6">
            <ProgressIndicator currentStep={step} totalSteps={totalSteps} />
            <div>
              <h1 className="text-2xl font-semibold text-text-primary font-plus-jakarta">
                {title}
              </h1>
              {subtitle && (
                <p className="mt-1 text-sm text-on-surface-variant font-manrope">
                  {subtitle}
                </p>
              )}
            </div>
            {children}
          </div>
        </FadeIn>
      </main>
    </div>
  );
}
