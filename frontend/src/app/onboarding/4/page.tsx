// frontend/src/app/onboarding/4/page.tsx
'use client';

import { useRouter } from 'next/navigation';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  medicalHistorySchema,
  type MedicalHistorySchema,
} from '@/lib/schemas/onboarding.schemas';
import { useOnboarding } from '@/context/onboarding-context';
import { OnboardingShell } from '@/components/ui/onboarding-shell';
import { OnboardingNav } from '@/components/ui/onboarding-nav';
import { onboardingInputClass, onboardingTextareaClass } from '@/lib/onboarding-styles';
import { FormField } from '@/components/ui/form-field';
import { Chip } from '@/components/ui/chip';

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown'];
const SMOKING_OPTIONS = [
  { value: '', label: 'Prefer not to say' },
  { value: 'Never', label: 'Never' },
  { value: 'Former', label: 'Former' },
  { value: 'Current', label: 'Current' },
];

// Up to 4 common quick-pick suggestions per list field.
const COMMON_ALLERGIES = ['Penicillin', 'Seafood', 'Peanuts', 'Aspirin'];
const COMMON_CONDITIONS = ['Hypertension', 'Diabetes', 'Asthma', 'High Cholesterol'];
const COMMON_MEDICATIONS = ['Metformin', 'Amlodipine', 'Losartan', 'Salbutamol'];

export default function OnboardingStep4() {
  const router = useRouter();
  const { data, update } = useOnboarding();

  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    control,
    formState: { errors },
  } = useForm<MedicalHistorySchema>({
    resolver: zodResolver(medicalHistorySchema),
    defaultValues: {
      bloodType: data.bloodType,
      allergies: data.allergies,
      chronicConditions: data.chronicConditions,
      currentMedications: data.currentMedications,
      pastSurgeries: data.pastSurgeries,
      familyHistory: data.familyHistory,
      smokingStatus: data.smokingStatus,
    },
    mode: 'onBlur',
  });

  type ListField = 'allergies' | 'chronicConditions' | 'currentMedications';
  const toItems = (s: string) => s.split(',').map((x) => x.trim()).filter(Boolean);
  // useWatch (not watch()) so the chips re-render on change without bailing out
  // of the React Compiler.
  const watched: Record<ListField, string> = {
    allergies: useWatch({ control, name: 'allergies' }) || '',
    chronicConditions: useWatch({ control, name: 'chronicConditions' }) || '',
    currentMedications: useWatch({ control, name: 'currentMedications' }) || '',
  };
  const toggleChip = (field: ListField, value: string) => {
    const items = toItems(getValues(field) || '');
    const next = items.includes(value) ? items.filter((i) => i !== value) : [...items, value];
    setValue(field, next.join(', '), { shouldValidate: true, shouldDirty: true });
  };
  const isChipSelected = (field: ListField, value: string) => toItems(watched[field]).includes(value);

  const onSubmit = (values: MedicalHistorySchema) => {
    update({
      bloodType: values.bloodType ?? '',
      allergies: values.allergies ?? '',
      chronicConditions: values.chronicConditions ?? '',
      currentMedications: values.currentMedications ?? '',
      pastSurgeries: values.pastSurgeries ?? '',
      familyHistory: values.familyHistory ?? '',
      smokingStatus: values.smokingStatus ?? '',
    });
    router.push('/onboarding/5');
  };

  return (
    <OnboardingShell step={4} totalSteps={6} title="Medical History" subtitle="Helps your doctor understand your health context. All optional and kept private — separate items with commas.">
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField id="ob4-bloodType" label="Blood type" error={errors.bloodType?.message}>
            <select className={onboardingInputClass} {...register('bloodType')}>
              <option value="">Select…</option>
              {BLOOD_TYPES.map((bt) => (
                <option key={bt} value={bt}>{bt}</option>
              ))}
            </select>
          </FormField>
          <FormField id="ob4-smokingStatus" label="Smoking status" error={errors.smokingStatus?.message}>
            <select className={onboardingInputClass} {...register('smokingStatus')}>
              {SMOKING_OPTIONS.map((o) => (
                <option key={o.label} value={o.value}>{o.label}</option>
              ))}
            </select>
          </FormField>
        </div>

        <FormField id="ob4-allergies" label="Allergies" error={errors.allergies?.message} hint='Tap a suggestion or type your own, separated by commas'>
          <div className="flex flex-col gap-2.5">
            <div className="flex flex-wrap gap-2">
              {COMMON_ALLERGIES.map((v) => (
                <Chip key={v} selected={isChipSelected('allergies', v)} onClick={() => toggleChip('allergies', v)}>{v}</Chip>
              ))}
            </div>
            <input type="text" placeholder="Penicillin, Peanuts" className={onboardingInputClass} {...register('allergies')} />
          </div>
        </FormField>

        <FormField id="ob4-chronicConditions" label="Chronic conditions" error={errors.chronicConditions?.message} hint='Tap a suggestion or type your own, separated by commas'>
          <div className="flex flex-col gap-2.5">
            <div className="flex flex-wrap gap-2">
              {COMMON_CONDITIONS.map((v) => (
                <Chip key={v} selected={isChipSelected('chronicConditions', v)} onClick={() => toggleChip('chronicConditions', v)}>{v}</Chip>
              ))}
            </div>
            <input type="text" placeholder="Hypertension, Asthma" className={onboardingInputClass} {...register('chronicConditions')} />
          </div>
        </FormField>

        <FormField id="ob4-currentMedications" label="Current medications" error={errors.currentMedications?.message} hint='Tap a suggestion or type your own, separated by commas'>
          <div className="flex flex-col gap-2.5">
            <div className="flex flex-wrap gap-2">
              {COMMON_MEDICATIONS.map((v) => (
                <Chip key={v} selected={isChipSelected('currentMedications', v)} onClick={() => toggleChip('currentMedications', v)}>{v}</Chip>
              ))}
            </div>
            <input type="text" placeholder="Amlodipine 5mg, Metformin" className={onboardingInputClass} {...register('currentMedications')} />
          </div>
        </FormField>

        <FormField id="ob4-pastSurgeries" label="Past surgeries" error={errors.pastSurgeries?.message}>
          <textarea placeholder="e.g. Appendectomy (2018)" className={onboardingTextareaClass} {...register('pastSurgeries')} />
        </FormField>

        <FormField id="ob4-familyHistory" label="Family history" error={errors.familyHistory?.message}>
          <textarea placeholder="e.g. Diabetes (mother), Heart disease (father)" className={onboardingTextareaClass} {...register('familyHistory')} />
        </FormField>

        <OnboardingNav onBack={() => router.push('/onboarding/3')} submitLabel="Continue →" />
      </form>
    </OnboardingShell>
  );
}
