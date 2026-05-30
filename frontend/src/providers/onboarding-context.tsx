// frontend/src/context/onboarding-context.tsx
'use client';

import * as React from 'react';
import { type OnboardingData, ONBOARDING_DEFAULTS } from '@/types/patient-profile';

interface OnboardingContextValue {
  data: OnboardingData;
  update: (patch: Partial<OnboardingData>) => void;
  reset: () => void;
}

const OnboardingContext = React.createContext<OnboardingContextValue | null>(null);

const STORAGE_KEY = 'ginhawa.onboarding.patient';

function loadInitial(): OnboardingData {
  if (typeof window === 'undefined') return ONBOARDING_DEFAULTS;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return ONBOARDING_DEFAULTS;
    return { ...ONBOARDING_DEFAULTS, ...(JSON.parse(raw) as Partial<OnboardingData>) };
  } catch {
    return ONBOARDING_DEFAULTS;
  }
}

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = React.useState<OnboardingData>(loadInitial);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      /* storage unavailable — non-fatal */
    }
  }, [data]);

  const update = React.useCallback((patch: Partial<OnboardingData>) => {
    setData((prev) => ({ ...prev, ...patch }));
  }, []);

  const reset = React.useCallback(() => {
    setData(ONBOARDING_DEFAULTS);
    try {
      window.sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      /* non-fatal */
    }
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
