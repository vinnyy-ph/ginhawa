// frontend/src/app/onboarding/2/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { step2Schema, type Step2Schema } from '@/lib/schemas/onboarding.schemas';
import { useOnboarding } from '@/context/onboarding-context';
import { ProgressIndicator } from '@/components/ui/progress-indicator';
import { FormField } from '@/components/ui/form-field';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type WeightUnit = 'kg' | 'lbs';
type HeightUnit = 'cm' | 'ft';

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

export default function OnboardingStep2() {
  const router = useRouter();
  const { data, update } = useOnboarding();
  const [weightUnit, setWeightUnit] = useState<WeightUnit>('kg');
  const [heightUnit, setHeightUnit] = useState<HeightUnit>('cm');
  const [bmi, setBmi] = useState<number | null>(() => {
    if (data.weightKg && data.heightCm && data.heightCm > 0) {
      const hMeter = data.heightCm / 100;
      const result = data.weightKg / (hMeter * hMeter);
      return Math.round(result * 10) / 10;
    }
    return null;
  });

  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<Step2Schema>({
    resolver: zodResolver(step2Schema),
    defaultValues: {
      weightKg: data.weightKg ?? undefined,
      heightCm: data.heightCm ?? undefined,
    },
    mode: 'onBlur',
  });

  const calculateBMI = (w: number | undefined, h: number | undefined) => {
    if (w && h && h > 0) {
      const hMeter = h / 100;
      const result = w / (hMeter * hMeter);
      setBmi(Math.round(result * 10) / 10);
    } else {
      setBmi(null);
    }
  };

  const inputClass =
    'w-full rounded-md border border-outline-variant bg-surface-white px-3 py-2.5 text-sm text-on-surface font-manrope placeholder:text-outline transition-colors focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 aria-[invalid=true]:border-error';

  const handleWeightChange = (raw: string) => {
    const num = parseFloat(raw);
    if (isNaN(num)) {
      setValue('weightKg', undefined as never);
      calculateBMI(undefined, getValues('heightCm'));
      return;
    }
    const kg = weightUnit === 'lbs' ? Math.round(num * 0.453592 * 10) / 10 : num;
    setValue('weightKg', kg, { shouldValidate: true });
    calculateBMI(kg, getValues('heightCm'));
  };

  const handleHeightChange = (raw: string) => {
    const num = parseFloat(raw);
    if (isNaN(num)) {
      setValue('heightCm', undefined as never);
      calculateBMI(getValues('weightKg'), undefined);
      return;
    }
    const cm = heightUnit === 'ft' ? Math.round(num * 30.48 * 10) / 10 : num;
    setValue('heightCm', cm, { shouldValidate: true });
    calculateBMI(getValues('weightKg'), cm);
  };

  const onSubmit = (values: Step2Schema) => {
    update({ weightKg: values.weightKg, heightCm: values.heightCm });
    router.push('/onboarding/3');
  };

  const getBMICategory = (val: number) => {
    if (val < 18.5) return { label: 'Underweight', color: 'bg-blue-100 text-blue-700' };
    if (val < 25) return { label: 'Normal', color: 'bg-green-100 text-green-700' };
    if (val < 30) return { label: 'Overweight', color: 'bg-yellow-100 text-yellow-700' };
    return { label: 'Obese', color: 'bg-red-100 text-red-700' };
  };

  return (
    <div className="flex flex-col gap-6">
      <ProgressIndicator currentStep={2} totalSteps={5} />
      <div>
        <h1 className="text-2xl font-semibold text-text-primary font-plus-jakarta">Body Metrics</h1>
        <p className="mt-1 text-sm text-on-surface-variant font-manrope">
          Your weight and height help doctors give accurate advice.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
        <FormField id="ob2-weight" label="Weight" error={errors.weightKg?.message} required>
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
                id="ob2-weight"
                type="number"
                step="0.1"
                min="0"
                placeholder={weightUnit === 'kg' ? '65' : '143'}
                className={cn(inputClass, 'pl-10')}
                onChange={(e) => handleWeightChange(e.target.value)}
                aria-invalid={errors.weightKg ? true : undefined}
              />
            </div>
            <UnitToggle value={weightUnit} options={['kg', 'lbs']} onChange={(v) => setWeightUnit(v as WeightUnit)} />
          </div>
        </FormField>

        <FormField id="ob2-height" label="Height" error={errors.heightCm?.message} required>
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
                id="ob2-height"
                type="number"
                step="0.1"
                min="0"
                placeholder={heightUnit === 'cm' ? '165' : '5.4'}
                className={cn(inputClass, 'pl-10')}
                onChange={(e) => handleHeightChange(e.target.value)}
                aria-invalid={errors.heightCm ? true : undefined}
              />
            </div>
            <UnitToggle value={heightUnit} options={['cm', 'ft']} onChange={(v) => setHeightUnit(v as HeightUnit)} />
          </div>
        </FormField>

        {bmi !== null && (
          <div className="p-4 rounded-xl bg-surface-container border border-outline-variant flex items-center justify-between animate-in fade-in slide-in-from-top-2 duration-300">
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

        <div className="flex justify-between pt-2">
          <Button id="ob2-back" type="button" variant="outline" size="lg" onClick={() => router.push('/onboarding/1')}>← Back</Button>
          <Button id="ob2-next" type="submit" size="lg" className="min-w-[140px]">Continue →</Button>
        </div>
      </form>
    </div>
  );
}
