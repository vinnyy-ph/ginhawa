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
    <div className="flex rounded-md border border-outline-variant overflow-hidden text-sm font-manrope">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={cn(
            'px-3 py-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
            value === opt
              ? 'bg-primary text-on-primary font-semibold'
              : 'bg-surface-white text-on-surface-variant hover:bg-surface-container',
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

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<Step2Schema>({
    resolver: zodResolver(step2Schema),
    defaultValues: {
      weightKg: data.weightKg ?? undefined,
      heightCm: data.heightCm ?? undefined,
    },
    mode: 'onBlur',
  });

  const inputClass =
    'w-full rounded-md border border-outline-variant bg-surface-white px-3 py-2.5 text-sm text-on-surface font-manrope placeholder:text-outline transition-colors focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 aria-[invalid=true]:border-error';

  const handleWeightChange = (raw: string) => {
    const num = parseFloat(raw);
    if (isNaN(num)) { setValue('weightKg', undefined as never); return; }
    const kg = weightUnit === 'lbs' ? Math.round(num * 0.453592 * 100) / 100 : num;
    setValue('weightKg', kg, { shouldValidate: true });
  };

  const handleHeightChange = (raw: string) => {
    const num = parseFloat(raw);
    if (isNaN(num)) { setValue('heightCm', undefined as never); return; }
    const cm = heightUnit === 'ft' ? Math.round(num * 30.48 * 100) / 100 : num;
    setValue('heightCm', cm, { shouldValidate: true });
  };

  const onSubmit = (values: Step2Schema) => {
    update({ weightKg: values.weightKg, heightCm: values.heightCm });
    router.push('/onboarding/3');
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
          <div className="flex gap-2">
            <input
              id="ob2-weight"
              type="number"
              step="0.1"
              min="0"
              placeholder={weightUnit === 'kg' ? '65' : '143'}
              className={cn(inputClass, 'flex-1')}
              onChange={(e) => handleWeightChange(e.target.value)}
              aria-invalid={errors.weightKg ? true : undefined}
            />
            <UnitToggle value={weightUnit} options={['kg', 'lbs']} onChange={(v) => setWeightUnit(v as WeightUnit)} />
          </div>
        </FormField>

        <FormField id="ob2-height" label="Height" error={errors.heightCm?.message} required>
          <div className="flex gap-2">
            <input
              id="ob2-height"
              type="number"
              step="0.1"
              min="0"
              placeholder={heightUnit === 'cm' ? '165' : '5.4'}
              className={cn(inputClass, 'flex-1')}
              onChange={(e) => handleHeightChange(e.target.value)}
              aria-invalid={errors.heightCm ? true : undefined}
            />
            <UnitToggle value={heightUnit} options={['cm', 'ft']} onChange={(v) => setHeightUnit(v as HeightUnit)} />
          </div>
        </FormField>

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
