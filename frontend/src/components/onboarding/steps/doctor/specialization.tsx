'use client';

import { useState } from 'react';
import { useDoctorOnboarding } from '@/context/doctor-onboarding-context';
import { FormField } from '@/components/ui/form-field';
import { OnboardingNav } from '@/components/ui/onboarding-nav';
import { onboardingInputClass } from '@/lib/onboarding-styles';
import { Chip } from '@/components/ui/chip';
import { useSpecializations } from '@/hooks/use-specializations';
import type { OnboardingNav as OnboardingNavType } from '@/components/onboarding/steps/types';

const COMMON_LANGUAGES = ['English', 'Tagalog', 'Cebuano', 'Ilocano'];

export function SpecializationStep({ nav }: { nav: OnboardingNavType }) {
  const { data, update } = useDoctorOnboarding();
  const { specializations, loading } = useSpecializations();

  const [specialization, setSpecialization] = useState(data.specialization);
  const [yearsOfExperience, setYearsOfExperience] = useState(data.yearsOfExperience?.toString() || '');
  const [languagesSpoken, setLanguagesSpoken] = useState(data.languagesSpoken);

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Keep a previously chosen value selectable even if the fetched list lacks it.
  const options = specialization && !specializations.includes(specialization)
    ? [specialization, ...specializations]
    : specializations;
  // If the fetch failed (or returned nothing), fall back to free text so the
  // doctor is never hard-stuck on a required field.
  const specFetchFailed = !loading && specializations.length === 0;

  const handleSpecChange = (value: string) => {
    setSpecialization(value);
    if (errors.specialization) setErrors((prev) => {
      const n = { ...prev };
      delete n.specialization;
      return n;
    });
  };

  const toItems = (s: string) => s.split(',').map((x) => x.trim()).filter(Boolean);
  const toggleLanguage = (value: string) => {
    const items = toItems(languagesSpoken);
    const next = items.includes(value) ? items.filter((i) => i !== value) : [...items, value];
    setLanguagesSpoken(next.join(', '));
  };
  const isLanguageSelected = (value: string) => toItems(languagesSpoken).includes(value);

  const handleNext = () => {
    if (!specialization.trim()) {
      setErrors({ specialization: 'Specialization is required' });
      return;
    }

    update({
      specialization,
      yearsOfExperience: (yearsOfExperience && !isNaN(parseInt(yearsOfExperience, 10))) ? parseInt(yearsOfExperience, 10) : null,
      languagesSpoken,
    });
    nav.goNext();
  };

  return (
    <>

      <div className="flex flex-col gap-4">
        <FormField id="specialization" label="Primary Specialization" error={errors.specialization} required>
          {specFetchFailed ? (
            <input
              id="specialization"
              value={specialization}
              onChange={(e) => handleSpecChange(e.target.value)}
              className={onboardingInputClass}
              placeholder="e.g. Cardiology"
            />
          ) : (
            <select
              id="specialization"
              value={specialization}
              onChange={(e) => handleSpecChange(e.target.value)}
              className={onboardingInputClass}
            >
              <option value="" disabled>{loading ? 'Loading…' : 'Select your specialization'}</option>
              {options.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          )}
        </FormField>

        <FormField id="yearsOfExperience" label="Years of Experience (Optional)">
          <input
            id="yearsOfExperience"
            type="number"
            min="0"
            value={yearsOfExperience}
            onChange={(e) => setYearsOfExperience(e.target.value)}
            className={onboardingInputClass}
            placeholder="10"
          />
        </FormField>

        <FormField id="languagesSpoken" label="Languages Spoken (Optional)" hint="Tap a suggestion or type your own, separated by commas">
          <div className="flex flex-col gap-2.5">
            <div className="flex flex-wrap gap-2">
              {COMMON_LANGUAGES.map((v) => (
                <Chip key={v} selected={isLanguageSelected(v)} onClick={() => toggleLanguage(v)}>{v}</Chip>
              ))}
            </div>
            <input
              id="languagesSpoken"
              value={languagesSpoken}
              onChange={(e) => setLanguagesSpoken(e.target.value)}
              className={onboardingInputClass}
              placeholder="English, Tagalog"
            />
          </div>
        </FormField>
      </div>

      <OnboardingNav onBack={() => nav.goBack()} submitType="button" onSubmit={handleNext} submitLabel="Continue →" />
    </>
  );
}
