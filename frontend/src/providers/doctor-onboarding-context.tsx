'use client';

/**
 * Context and provider for multi-step doctor onboarding state. Persists the
 * in-progress form data to `sessionStorage` under the key
 * `ginhawa.onboarding.doctor` so the wizard survives page navigations within
 * the same tab. Storage failures (private mode, quota exceeded) are silently
 * swallowed — data remains available in-memory for the current render tree.
 * Initial values are merged on top of `DOCTOR_ONBOARDING_DEFAULTS` so that
 * newly added fields always have a safe fallback even when an older session
 * value is present.
 */
import * as React from 'react';
import { type DoctorOnboardingData, DOCTOR_ONBOARDING_DEFAULTS } from '@/types/doctor-onboarding';

interface DoctorOnboardingContextValue {
  data: DoctorOnboardingData;
  update: (patch: Partial<DoctorOnboardingData>) => void;
  reset: () => void;
}

const DoctorOnboardingContext = React.createContext<DoctorOnboardingContextValue | null>(null);

const STORAGE_KEY = 'ginhawa.onboarding.doctor';

function loadInitial(): DoctorOnboardingData {
  if (typeof window === 'undefined') return DOCTOR_ONBOARDING_DEFAULTS;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return DOCTOR_ONBOARDING_DEFAULTS;
    return { ...DOCTOR_ONBOARDING_DEFAULTS, ...(JSON.parse(raw) as Partial<DoctorOnboardingData>) };
  } catch {
    return DOCTOR_ONBOARDING_DEFAULTS;
  }
}

/**
 * Provides `DoctorOnboardingContext` to its subtree and syncs state to
 * sessionStorage on every change. Renders children directly — no loading
 * state is needed because the initial read from storage is synchronous.
 */
export function DoctorOnboardingProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = React.useState<DoctorOnboardingData>(loadInitial);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      /* storage unavailable — non-fatal */
    }
  }, [data]);

  const update = React.useCallback((patch: Partial<DoctorOnboardingData>) => {
    setData((prev) => ({ ...prev, ...patch }));
  }, []);

  const reset = React.useCallback(() => {
    setData(DOCTOR_ONBOARDING_DEFAULTS);
    try {
      window.sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      /* non-fatal */
    }
  }, []);

  return (
    <DoctorOnboardingContext.Provider value={{ data, update, reset }}>
      {children}
    </DoctorOnboardingContext.Provider>
  );
}

/**
 * Consumes the doctor onboarding context. Must be called within a
 * `DoctorOnboardingProvider`; throws if used outside one.
 *
 * @returns `data`, `update(patch)` (shallow-merges a partial update), and
 *   `reset()` (restores defaults and clears sessionStorage).
 */
export function useDoctorOnboarding(): DoctorOnboardingContextValue {
  const ctx = React.useContext(DoctorOnboardingContext);
  if (!ctx) {
    throw new Error('useDoctorOnboarding must be used within <DoctorOnboardingProvider>');
  }
  return ctx;
}
