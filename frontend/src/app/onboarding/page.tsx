'use client';

/**
 * Route: /onboarding — multi-step patient profile onboarding flow.
 *
 * Step navigation is driven by the `?step=<slug>` URL search param so that
 * each step is deep-linkable and browser back/forward works naturally.
 * `firstIncompletePatientSlug` enforces step ordering — users cannot skip
 * ahead to a step whose prerequisite data is missing. The URL is automatically
 * corrected (via `router.replace`) when the requested step is invalid or blocked.
 */

import * as React from 'react';
import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useOnboarding } from '@/providers/onboarding-context';
import { OnboardingShell } from '@/components/ui/onboarding-shell';
import { PATIENT_STEPS, PATIENT_BASE_PATH } from '@/components/onboarding/steps/patient/registry';
import { firstIncompletePatientSlug } from '@/components/onboarding/steps/patient/guard';
import { resolveStepSlug } from '@/components/onboarding/resolve-step';
import type { OnboardingNav } from '@/components/onboarding/steps/types';

const SLUGS = PATIENT_STEPS.map((s) => s.slug);

function PatientOnboardingInner() {
  const router = useRouter();
  const params = useSearchParams();
  const { data } = useOnboarding();

  const requested = params.get('step');
  const blockSlug = firstIncompletePatientSlug(data);
  const slug = resolveStepSlug(requested, SLUGS, blockSlug);

  // Keep the URL in sync with the resolved step (rewrite unknown/blocked/missing).
  React.useEffect(() => {
    if (requested !== slug) {
      router.replace(`${PATIENT_BASE_PATH}?step=${slug}`);
    }
  }, [requested, slug, router]);

  const idx = SLUGS.indexOf(slug);
  const step = PATIENT_STEPS[idx];

  const go = (s: string) => router.push(`${PATIENT_BASE_PATH}?step=${s}`);
  const nav: OnboardingNav = {
    goNext: () => go(SLUGS[Math.min(idx + 1, SLUGS.length - 1)]),
    goBack: () => go(SLUGS[Math.max(idx - 1, 0)]),
    goTo: go,
    goToReview: () => go(SLUGS[SLUGS.length - 1]),
  };

  const Step = step.Component;
  return (
    <OnboardingShell
      step={idx + 1}
      totalSteps={PATIENT_STEPS.length}
      title={step.title}
      subtitle={step.subtitle}
      card={step.card ?? true}
    >
      <Step nav={nav} />
    </OnboardingShell>
  );
}

/**
 * Patient onboarding page. Suspense boundary is required because
 * `PatientOnboardingInner` reads URL search params via `useSearchParams`.
 */
export default function PatientOnboardingPage() {
  return (
    <Suspense fallback={null}>
      <PatientOnboardingInner />
    </Suspense>
  );
}
