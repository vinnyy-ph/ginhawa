import type * as React from 'react';

export interface OnboardingNav {
  goNext: () => void;
  goBack: () => void;
  goTo: (slug: string) => void;
  goToReview: () => void;
}

export interface StepDef {
  slug: string;
  title: string;
  subtitle?: string;
  card?: boolean;
  Component: React.ComponentType<{ nav: OnboardingNav }>;
}
