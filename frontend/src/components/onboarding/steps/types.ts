/**
 * Shared type contracts for the onboarding step system (patient and doctor flows).
 *
 * These interfaces form the public API between the step-runner shell (the page
 * component / URL router) and individual step components.
 */
import type * as React from 'react';

/**
 * Navigation primitives injected into every step component via the `nav` prop.
 * Steps must call these — never push router URLs directly — so the step-runner
 * retains control over forward/back gating and review shortcuts.
 */
export interface OnboardingNav {
  goNext: () => void;
  goBack: () => void;
  goTo: (slug: string) => void;
  /** Skip ahead directly to the review/summary step. */
  goToReview: () => void;
}

/**
 * Registry entry for a single onboarding step.
 * The `slug` doubles as the URL query-param value (`?step=<slug>`).
 * Set `card: false` on the review step to suppress the default card wrapper.
 */
export interface StepDef {
  slug: string;
  title: string;
  subtitle?: string;
  card?: boolean;
  Component: React.ComponentType<{ nav: OnboardingNav }>;
}
