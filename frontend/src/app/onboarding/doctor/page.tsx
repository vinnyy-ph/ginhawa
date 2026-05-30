'use client';

/**
 * Route: /onboarding/doctor — multi-step doctor profile onboarding flow.
 *
 * Mirrors the patient onboarding architecture: step navigation via `?step=<slug>`,
 * guard enforcement via `firstIncompleteDoctorSlug` (users cannot skip steps),
 * and automatic URL correction when the requested slug is invalid or blocked.
 * Collects professional information such as specialization, license, schedule,
 * and consultation fees before the doctor account becomes active.
 */

import * as React from 'react';
import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useDoctorOnboarding } from '@/providers/doctor-onboarding-context';
import { OnboardingShell } from '@/components/ui/onboarding-shell';
import { DOCTOR_STEPS, DOCTOR_BASE_PATH } from '@/components/onboarding/steps/doctor/registry';
import { firstIncompleteDoctorSlug } from '@/components/onboarding/steps/doctor/guard';
import { resolveStepSlug } from '@/components/onboarding/resolve-step';
import type { OnboardingNav } from '@/components/onboarding/steps/types';

const SLUGS = DOCTOR_STEPS.map((s) => s.slug);

function DoctorOnboardingInner() {
  const router = useRouter();
  const params = useSearchParams();
  const { data } = useDoctorOnboarding();

  const requested = params.get('step');
  const blockSlug = firstIncompleteDoctorSlug(data);
  const slug = resolveStepSlug(requested, SLUGS, blockSlug);

  React.useEffect(() => {
    if (requested !== slug) {
      router.replace(`${DOCTOR_BASE_PATH}?step=${slug}`);
    }
  }, [requested, slug, router]);

  const idx = SLUGS.indexOf(slug);
  const step = DOCTOR_STEPS[idx];

  const go = (s: string) => router.push(`${DOCTOR_BASE_PATH}?step=${s}`);
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
      totalSteps={DOCTOR_STEPS.length}
      title={step.title}
      subtitle={step.subtitle}
      card={step.card ?? true}
    >
      <Step nav={nav} />
    </OnboardingShell>
  );
}

/**
 * Doctor onboarding page. Suspense boundary is required because
 * `DoctorOnboardingInner` reads URL search params via `useSearchParams`.
 */
export default function DoctorOnboardingPage() {
  return (
    <Suspense fallback={null}>
      <DoctorOnboardingInner />
    </Suspense>
  );
}
