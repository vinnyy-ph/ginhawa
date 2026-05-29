'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useDoctorOnboarding } from '@/context/doctor-onboarding-context';
import { FormField } from '@/components/ui/form-field';
import { Button } from '@/components/ui/button';
import { ProgressIndicator } from '@/components/ui/progress-indicator';

export default function DoctorOnboardingStep4() {
  const router = useRouter();
  const { data, update } = useDoctorOnboarding();

  const [bio, setBio] = useState(data.bio);
  const [consultationFocusAreas, setConsultationFocusAreas] = useState(data.consultationFocusAreas);
  const [consultationFee, setConsultationFee] = useState(data.consultationFee?.toString() || '');
  const [availabilitySummary, setAvailabilitySummary] = useState(data.availabilitySummary);
  
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleNext = () => {
    if (!bio.trim()) {
      setErrors({ bio: 'Professional bio is required' });
      return;
    }

    const fee = consultationFee.trim();
    const parsedFee = (fee && !isNaN(parseFloat(fee))) ? parseFloat(fee) : null;

    update({ 
      bio, 
      consultationFocusAreas,
      consultationFee: parsedFee,
      availabilitySummary
    });
    router.push('/onboarding/doctor/5');
  };

  return (
    <div className="flex flex-col gap-6">
      <ProgressIndicator currentStep={4} totalSteps={5} />
      <div>
        <h1 className="text-2xl font-semibold text-text-primary font-plus-jakarta">Practice Details</h1>
        <p className="mt-1 text-sm text-on-surface-variant font-manrope">
          Share more about your practice and availability.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        <FormField id="bio" label="Professional Bio" error={errors.bio} required>
          <textarea 
            id="bio" 
            value={bio} 
            onChange={e => {
              setBio(e.target.value);
              if (errors.bio) setErrors(prev => {
                const n = { ...prev };
                delete n.bio;
                return n;
              });
            }} 
            className="w-full min-h-[120px] rounded-xl border border-outline-variant bg-surface-white px-4 py-3 text-sm text-on-surface font-manrope focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all resize-none" 
            placeholder="Tell patients about your background, approach to care, and achievements..." 
          />
        </FormField>
        
        <FormField id="consultationFocusAreas" label="Focus Areas (Optional)">
          <textarea 
            id="consultationFocusAreas" 
            value={consultationFocusAreas} 
            onChange={e => setConsultationFocusAreas(e.target.value)} 
            className="w-full min-h-[80px] rounded-xl border border-outline-variant bg-surface-white px-4 py-3 text-sm text-on-surface font-manrope focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all resize-none" 
            placeholder="e.g. Hypertension management, Preventive cardiology, Heart failure..." 
          />
        </FormField>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField id="consultationFee" label="Consultation Fee (Optional)">
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant text-sm font-manrope">₱</span>
              <input 
                id="consultationFee" 
                type="number" 
                min="0" 
                step="0.01"
                value={consultationFee} 
                onChange={e => setConsultationFee(e.target.value)} 
                className="w-full rounded-xl border border-outline-variant bg-surface-white pl-8 pr-4 py-3 text-sm text-on-surface font-manrope focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all" 
                placeholder="500.00" 
              />
            </div>
          </FormField>

          <FormField id="availabilitySummary" label="Availability Summary (Optional)">
            <input 
              id="availabilitySummary" 
              value={availabilitySummary} 
              onChange={e => setAvailabilitySummary(e.target.value)} 
              className="w-full rounded-xl border border-outline-variant bg-surface-white px-4 py-3 text-sm text-on-surface font-manrope focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all" 
              placeholder="e.g. Weekdays 9 AM - 5 PM" 
            />
          </FormField>
        </div>
      </div>

      <div className="flex justify-between items-center pt-4">
        <Button 
          variant="ghost" 
          onClick={() => router.push('/onboarding/doctor/3')}
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
