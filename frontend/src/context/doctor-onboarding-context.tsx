'use client';

import * as React from 'react';
import { type DoctorOnboardingData, DOCTOR_ONBOARDING_DEFAULTS } from '@/types/doctor-onboarding';

interface DoctorOnboardingContextValue {
  data: DoctorOnboardingData;
  update: (patch: Partial<DoctorOnboardingData>) => void;
  reset: () => void;
}

const DoctorOnboardingContext = React.createContext<DoctorOnboardingContextValue | null>(null);

export function DoctorOnboardingProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = React.useState<DoctorOnboardingData>(DOCTOR_ONBOARDING_DEFAULTS);

  const update = React.useCallback((patch: Partial<DoctorOnboardingData>) => {
    setData((prev) => ({ ...prev, ...patch }));
  }, []);

  const reset = React.useCallback(() => {
    setData(DOCTOR_ONBOARDING_DEFAULTS);
  }, []);

  return (
    <DoctorOnboardingContext.Provider value={{ data, update, reset }}>
      {children}
    </DoctorOnboardingContext.Provider>
  );
}

export function useDoctorOnboarding(): DoctorOnboardingContextValue {
  const ctx = React.useContext(DoctorOnboardingContext);
  if (!ctx) {
    throw new Error('useDoctorOnboarding must be used within <DoctorOnboardingProvider>');
  }
  return ctx;
}
