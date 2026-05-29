// frontend/src/app/onboarding/3/page.tsx
'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { step2Schema, type Step2Schema } from '@/lib/schemas/onboarding.schemas';
import { useOnboarding } from '@/context/onboarding-context';
import { OnboardingShell } from '@/components/ui/onboarding-shell';
import { OnboardingNav } from '@/components/ui/onboarding-nav';
import { onboardingInputClass } from '@/lib/onboarding-styles';
import { FormField } from '@/components/ui/form-field';
import { cn } from '@/lib/utils';

type WeightUnit = 'kg' | 'lbs';
type HeightUnit = 'cm' | 'ft';

const KG_TO_LBS = 2.20462262;
const LBS_TO_KG = 0.45359237;
const FT_TO_CM = 30.48;
const CM_TO_FT = 1 / 30.48;

function UnitToggle({
  value,
  options,
  onChange,
}: {
  value: string;
  options: [string, string];
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex p-1 rounded-lg bg-surface-container border border-outline-variant text-sm font-manrope h-[44px] items-center">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={cn(
            'px-3 py-1.5 rounded-md transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
            value === opt
              ? 'bg-surface-white text-primary font-bold shadow-sm border border-outline-variant/20'
              : 'text-on-surface-variant hover:text-on-surface font-medium',
          )}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

export default function OnboardingStep3() {
  const router = useRouter();
  const { data, update } = useOnboarding();
  const [weightUnit, setWeightUnit] = useState<WeightUnit>('kg');
  const [heightUnit, setHeightUnit] = useState<HeightUnit>('cm');

  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    control,
    formState: { errors },
  } = useForm<Step2Schema>({
    resolver: zodResolver(step2Schema),
    defaultValues: {
      weightKg: data.weightKg ?? undefined,
      heightCm: data.heightCm ?? undefined,
    },
    mode: 'onBlur',
  });

  const watchedWeight = useWatch({ control, name: 'weightKg' });
  const watchedHeight = useWatch({ control, name: 'heightCm' });

  // Local display states to avoid conversion drift while typing
  const [displayWeight, setDisplayWeight] = useState(() => data.weightKg?.toString() ?? '');
  const [displayHeight, setDisplayHeight] = useState(() => data.heightCm?.toString() ?? '');

  const bmi = useMemo(() => {
    if (watchedWeight && watchedHeight && watchedHeight > 0) {
      const hMeter = watchedHeight / 100;
      const result = watchedWeight / (hMeter * hMeter);
      return Math.round(result * 10) / 10;
    }
    return null;
  }, [watchedWeight, watchedHeight]);

  const handleWeightChange = (raw: string) => {
    setDisplayWeight(raw);
    const num = parseFloat(raw);
    if (isNaN(num)) {
      setValue('weightKg', undefined as never);
      return;
    }
    const kg = weightUnit === 'lbs' ? num * LBS_TO_KG : num;
    setValue('weightKg', kg, { shouldValidate: true });
  };

  const handleHeightChange = (raw: string) => {
    setDisplayHeight(raw);
    const num = parseFloat(raw);
    if (isNaN(num)) {
      setValue('heightCm', undefined as never);
      return;
    }
    const cm = heightUnit === 'ft' ? num * FT_TO_CM : num;
    setValue('heightCm', cm, { shouldValidate: true });
  };

  const toggleWeightUnit = (unit: WeightUnit) => {
    if (unit === weightUnit) return;
    setWeightUnit(unit);
    const currentKg = getValues('weightKg');
    if (currentKg) {
      const displayVal = unit === 'lbs' ? currentKg * KG_TO_LBS : currentKg;
      setDisplayWeight(Math.round(displayVal * 10) / 10 + '');
    }
  };

  const toggleHeightUnit = (unit: HeightUnit) => {
    if (unit === heightUnit) return;
    setHeightUnit(unit);
    const currentCm = getValues('heightCm');
    if (currentCm) {
      const displayVal = unit === 'ft' ? currentCm * CM_TO_FT : currentCm;
      setDisplayHeight(Math.round(displayVal * 10) / 10 + '');
    }
  };

  const onSubmit = (values: Step2Schema) => {
    update({ weightKg: values.weightKg, heightCm: values.heightCm });
    router.push('/onboarding/4');
  };

  const getBMICategory = (val: number) => {
    if (val < 18.5) return { label: 'Underweight', color: 'bg-blue-100 text-blue-700' };
    if (val < 25) return { label: 'Normal', color: 'bg-green-100 text-green-700' };
    if (val < 30) return { label: 'Overweight', color: 'bg-yellow-100 text-yellow-700' };
    return { label: 'Obese', color: 'bg-red-100 text-red-700' };
  };

  return (
    <OnboardingShell step={3} totalSteps={6} title="Body Metrics" subtitle="Your weight and height help doctors give accurate advice.">
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
        <FormField id="ob3-weight" label="Weight" error={errors.weightKg?.message} required>
          <div className="flex gap-3 items-start">
            <div className="flex-1 relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-outline pointer-events-none">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M7 20h10" />
                  <path d="M9 6l-2 2" />
                  <path d="M15 6l2 2" />
                  <path d="M12 3v15" />
                  <path d="M12 18a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z" />
                </svg>
              </div>
              <input
                id="ob3-weight"
                type="number"
                step="0.1"
                min="0"
                value={displayWeight}
                placeholder={weightUnit === 'kg' ? '65' : '143'}
                className={cn(onboardingInputClass, 'pl-10')}
                onChange={(e) => handleWeightChange(e.target.value)}
                aria-invalid={errors.weightKg ? true : undefined}
              />
            </div>
            <UnitToggle value={weightUnit} options={['kg', 'lbs']} onChange={(v) => toggleWeightUnit(v as WeightUnit)} />
          </div>
        </FormField>

        <FormField id="ob3-height" label="Height" error={errors.heightCm?.message} required>
          <div className="flex gap-3 items-start">
            <div className="flex-1 relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-outline pointer-events-none">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 3v18h14" />
                  <path d="M5 7h7" />
                  <path d="M5 11h10" />
                  <path d="M5 15h7" />
                  <path d="M5 19h10" />
                </svg>
              </div>
              <input
                id="ob3-height"
                type="number"
                step="0.1"
                min="0"
                value={displayHeight}
                placeholder={heightUnit === 'cm' ? '165' : '5.4'}
                className={cn(onboardingInputClass, 'pl-10')}
                onChange={(e) => handleHeightChange(e.target.value)}
                aria-invalid={errors.heightCm ? true : undefined}
              />
            </div>
            <UnitToggle value={heightUnit} options={['cm', 'ft']} onChange={(v) => toggleHeightUnit(v as HeightUnit)} />
          </div>
        </FormField>

        {bmi !== null && (
          <div 
            className="p-4 rounded-xl bg-surface-container border border-outline-variant flex items-center justify-between animate-in fade-in slide-in-from-top-2 duration-300"
            aria-live="polite"
          >
            <div className="flex flex-col">
              <span className="text-[10px] text-on-surface-variant font-manrope font-bold uppercase tracking-widest">Estimated BMI</span>
              <span className="text-2xl font-bold text-on-surface font-plus-jakarta tracking-tight">{bmi}</span>
            </div>
            {(() => {
              const cat = getBMICategory(bmi);
              return (
                <div className={cn(
                  "px-3 py-1.5 rounded-full text-[10px] font-bold font-manrope uppercase tracking-wider shadow-sm border border-black/5",
                  cat.color
                )}>
                  {cat.label}
                </div>
              );
            })()}
          </div>
        )}

        {/* Hidden fields so RHF registers them */}
        <input type="hidden" {...register('weightKg', { valueAsNumber: true })} />
        <input type="hidden" {...register('heightCm', { valueAsNumber: true })} />

        {(!watchedWeight || watchedWeight <= 0 || !watchedHeight || watchedHeight <= 0) && (
          <p className="mt-2 text-xs text-on-surface-variant">Enter your weight and height to continue.</p>
        )}
        <OnboardingNav onBack={() => router.push('/onboarding/2')} submitLabel="Continue →" />
      </form>
    </OnboardingShell>
  );
}
