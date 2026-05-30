'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useDoctorOnboarding } from '@/context/doctor-onboarding-context';
import { FormField } from '@/components/ui/form-field';
import { OnboardingShell } from '@/components/ui/onboarding-shell';
import { OnboardingNav } from '@/components/ui/onboarding-nav';
import { onboardingInputClass, onboardingTextareaClass } from '@/lib/onboarding-styles';
import { cn } from '@/lib/utils';
import { Chip } from '@/components/ui/chip';

const COMMON_FOCUS = ['Preventive Care', 'Chronic Disease Management', 'Lifestyle & Nutrition', 'Mental Health'];

export default function DoctorOnboardingStep4() {
  const router = useRouter();
  const { data, update } = useDoctorOnboarding();

  const [bio, setBio] = useState(data.bio);
  const [consultationFocusAreas, setConsultationFocusAreas] = useState(data.consultationFocusAreas);
  const [consultationFee, setConsultationFee] = useState(data.consultationFee?.toString() || '');
  const [availabilitySummary, setAvailabilitySummary] = useState(data.availabilitySummary);
  
  const [errors, setErrors] = useState<Record<string, string>>({});

  const toItems = (s: string) => s.split(',').map((x) => x.trim()).filter(Boolean);
  const toggleFocus = (value: string) => {
    const items = toItems(consultationFocusAreas);
    const next = items.includes(value) ? items.filter((i) => i !== value) : [...items, value];
    setConsultationFocusAreas(next.join(', '));
  };
  const isFocusSelected = (value: string) => toItems(consultationFocusAreas).includes(value);

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
    <OnboardingShell step={4} totalSteps={5} title="Practice Details" subtitle="Share more about your practice and availability.">

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
            className={cn(onboardingTextareaClass, 'min-h-[120px]')}
            placeholder="Tell patients about your background, approach to care, and achievements..." 
          />
        </FormField>
        
        <FormField id="consultationFocusAreas" label="Focus Areas (Optional)" hint="Tap a suggestion or type your own, separated by commas">
          <div className="flex flex-col gap-2.5">
            <div className="flex flex-wrap gap-2">
              {COMMON_FOCUS.map((v) => (
                <Chip key={v} selected={isFocusSelected(v)} onClick={() => toggleFocus(v)}>{v}</Chip>
              ))}
            </div>
            <textarea
              id="consultationFocusAreas"
              value={consultationFocusAreas}
              onChange={(e) => setConsultationFocusAreas(e.target.value)}
              className={onboardingTextareaClass}
              placeholder="e.g. Hypertension management, Preventive cardiology, Heart failure..."
            />
          </div>
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
                className={cn(onboardingInputClass, 'pl-8')}
                placeholder="500.00" 
              />
            </div>
          </FormField>

          <FormField id="availabilitySummary" label="Availability Summary (Optional)">
            <input 
              id="availabilitySummary" 
              value={availabilitySummary} 
              onChange={e => setAvailabilitySummary(e.target.value)} 
              className={onboardingInputClass}
              placeholder="e.g. Weekdays 9 AM - 5 PM" 
            />
          </FormField>
        </div>
      </div>

      <OnboardingNav onBack={() => router.push('/onboarding/doctor/3')} submitType="button" onSubmit={handleNext} submitLabel="Continue →" />
    </OnboardingShell>
  );
}
