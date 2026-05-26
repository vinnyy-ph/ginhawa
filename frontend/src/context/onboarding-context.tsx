// frontend/src/context/onboarding-context.tsx
'use client';

import * as React from 'react';
import { type OnboardingData, ONBOARDING_DEFAULTS } from '@/types/patient';

interface OnboardingContextValue {
  data: OnboardingData;
  update: (patch: Partial<OnboardingData>) => void;
  reset: () => void;
}

const OnboardingContext = React.createContext<OnboardingContextValue | null>(null);

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = React.useState<OnboardingData>(ONBOARDING_DEFAULTS);

  const update = React.useCallback((patch: Partial<OnboardingData>) => {
    setData((prev) => ({ ...prev, ...patch }));
  }, []);

  const reset = React.useCallback(() => {
    setData(ONBOARDING_DEFAULTS);
  }, []);

  return (
    <OnboardingContext.Provider value={{ data, update, reset }}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding(): OnboardingContextValue {
  const ctx = React.useContext(OnboardingContext);
  if (!ctx) {
    throw new Error('useOnboarding must be used within <OnboardingProvider>');
  }
  return ctx;
}
