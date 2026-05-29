// frontend/src/app/onboarding/3/page.tsx
'use client';

import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { step3Schema, type Step3Schema } from '@/lib/schemas/onboarding.schemas';
import { useOnboarding } from '@/context/onboarding-context';
import { ProgressIndicator } from '@/components/ui/progress-indicator';
import { FormField } from '@/components/ui/form-field';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const textareaClass =
  'w-full rounded-md border border-outline-variant bg-surface-white px-3 py-2.5 text-sm text-on-surface font-manrope placeholder:text-outline transition-colors resize-y min-h-[80px] focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 aria-[invalid=true]:border-error';

const COMMON_CONDITIONS = ['Hypertension', 'Diabetes', 'Asthma', 'None'];
const COMMON_ALLERGIES = ['Penicillin', 'Sulfa Drugs', 'Peanuts', 'None'];

function Chip({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'px-3 py-1.5 rounded-full text-xs font-medium transition-all border',
        selected
          ? 'bg-primary text-white border-primary shadow-sm'
          : 'bg-surface-white text-on-surface-variant border-outline-variant hover:border-primary/50 hover:bg-surface-variant/50',
      )}
    >
      {children}
    </button>
  );
}

export default function OnboardingStep3() {
  const router = useRouter();
  const { data, update } = useOnboarding();

  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    watch,
    formState: { errors },
  } = useForm<Step3Schema>({
    resolver: zodResolver(step3Schema),
    defaultValues: {
      conditions: data.conditions,
      allergies: data.allergies,
      medications: data.medications,
    },
    mode: 'onBlur',
  });

  const conditionsValue = watch('conditions') || '';
  const allergiesValue = watch('allergies') || '';

  const toggleChip = (field: 'conditions' | 'allergies', value: string) => {
    const current = getValues(field) || '';
    if (value === 'None') {
      setValue(field, 'None', { shouldValidate: true });
      return;
    }
    const items = current === 'None' ? [] : current.split(', ').filter(Boolean);
    if (items.includes(value)) {
      setValue(
        field,
        items.filter((i) => i !== value).join(', '),
        { shouldValidate: true },
      );
    } else {
      setValue(field, [...items, value].join(', '), { shouldValidate: true });
    }
  };

  const isSelected = (field: 'conditions' | 'allergies', value: string) => {
    const current = field === 'conditions' ? conditionsValue : allergiesValue;
    if (value === 'None') return current === 'None';
    const items = current.split(', ').filter(Boolean);
    return items.includes(value);
  };

  const onSubmit = (values: Step3Schema) => {
    update(values);
    router.push('/onboarding/4');
  };

  return (
    <div className="flex flex-col gap-6">
      <ProgressIndicator currentStep={3} totalSteps={5} />
      <div>
        <h1 className="text-2xl font-semibold text-text-primary font-plus-jakarta">
          Medical History
        </h1>
        <p className="mt-1 text-sm text-on-surface-variant font-manrope">
          This information helps your doctor understand your health context. It is kept private and
          secure.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
        <FormField
          id="ob3-conditions"
          label="Medical conditions"
          error={errors.conditions?.message}
          hint='e.g. "Hypertension, Asthma" — or type "None"'
          required
        >
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-2">
              {COMMON_CONDITIONS.map((condition) => (
                <Chip
                  key={condition}
                  selected={isSelected('conditions', condition)}
                  onClick={() => toggleChip('conditions', condition)}
                >
                  {condition}
                </Chip>
              ))}
            </div>
            <textarea
              className={textareaClass}
              placeholder="Hypertension, Asthma"
              {...register('conditions')}
            />
          </div>
        </FormField>

        <FormField
          id="ob3-allergies"
          label="Allergies"
          error={errors.allergies?.message}
          hint='e.g. "Penicillin" — or type "None"'
          required
        >
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-2">
              {COMMON_ALLERGIES.map((allergy) => (
                <Chip
                  key={allergy}
                  selected={isSelected('allergies', allergy)}
                  onClick={() => toggleChip('allergies', allergy)}
                >
                  {allergy}
                </Chip>
              ))}
            </div>
            <textarea
              className={textareaClass}
              placeholder="Penicillin"
              {...register('allergies')}
            />
          </div>
        </FormField>

        <FormField
          id="ob3-medications"
          label="Current medications"
          hint="Optional — list any medications you currently take"
        >
          <textarea
            className={textareaClass}
            placeholder="Amlodipine 5mg daily"
            {...register('medications')}
          />
        </FormField>

        <div className="flex justify-between pt-2">
          <Button
            id="ob3-back"
            type="button"
            variant="outline"
            size="lg"
            onClick={() => router.push('/onboarding/2')}
          >
            ← Back
          </Button>
          <Button id="ob3-next" type="submit" size="lg" className="min-w-[140px]">
            Continue →
          </Button>
        </div>
      </form>
    </div>
  );
}
