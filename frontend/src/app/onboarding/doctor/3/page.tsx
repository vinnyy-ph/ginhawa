'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useDoctorOnboarding } from '@/context/doctor-onboarding-context';
import { FormField } from '@/components/ui/form-field';
import { Button } from '@/components/ui/button';
import { ProgressIndicator } from '@/components/ui/progress-indicator';

export default function DoctorOnboardingStep3() {
  const router = useRouter();
  const { data, update } = useDoctorOnboarding();

  const [specialization, setSpecialization] = useState(data.specialization);
  const [yearsOfExperience, setYearsOfExperience] = useState(data.yearsOfExperience?.toString() || '');
  const [languagesSpoken, setLanguagesSpoken] = useState(data.languagesSpoken);
  
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleNext = () => {
    if (!specialization.trim()) {
      setErrors({ specialization: 'Specialization is required' });
      return;
    }

    update({ 
      specialization, 
      yearsOfExperience: (yearsOfExperience && !isNaN(parseInt(yearsOfExperience, 10))) ? parseInt(yearsOfExperience, 10) : null,
      languagesSpoken 
    });
    router.push('/onboarding/doctor/4');
  };

  return (
    <div className="flex flex-col gap-6">
      <ProgressIndicator currentStep={3} totalSteps={5} />
      <div>
        <h1 className="text-2xl font-semibold text-text-primary font-plus-jakarta">Specialization & Experience</h1>
        <p className="mt-1 text-sm text-on-surface-variant font-manrope">
          Help patients understand your expertise.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        <FormField id="specialization" label="Primary Specialization" error={errors.specialization} required>
          <input 
            id="specialization" 
            value={specialization} 
            onChange={e => {
              setSpecialization(e.target.value);
              if (errors.specialization) setErrors(prev => {
                const n = { ...prev };
                delete n.specialization;
                return n;
              });
            }} 
            className="w-full rounded-xl border border-outline-variant bg-surface-white px-4 py-3 text-sm text-on-surface font-manrope focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all" 
            placeholder="Cardiology" 
          />
        </FormField>
        <FormField id="yearsOfExperience" label="Years of Experience (Optional)">
          <input 
            id="yearsOfExperience" 
            type="number" 
            min="0" 
            value={yearsOfExperience} 
            onChange={e => setYearsOfExperience(e.target.value)} 
            className="w-full rounded-xl border border-outline-variant bg-surface-white px-4 py-3 text-sm text-on-surface font-manrope focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all" 
            placeholder="10" 
          />
        </FormField>
        <FormField id="languagesSpoken" label="Languages Spoken (Optional)">
          <input 
            id="languagesSpoken" 
            value={languagesSpoken} 
            onChange={e => setLanguagesSpoken(e.target.value)} 
            className="w-full rounded-xl border border-outline-variant bg-surface-white px-4 py-3 text-sm text-on-surface font-manrope focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all" 
            placeholder="English, Tagalog" 
          />
        </FormField>
      </div>

      <div className="flex justify-between items-center pt-4">
        <Button 
          variant="ghost" 
          onClick={() => router.push('/onboarding/doctor/2')}
          className="text-on-surface-variant hover:text-primary"
        >
          ← Back
        </Button>
        <Button onClick={handleNext} className="rounded-full px-8 py-6 text-base font-semibold shadow-lg hover:shadow-xl transition-all">
          Continue →
        </Button>
      </div>
    </div>
  );
}
