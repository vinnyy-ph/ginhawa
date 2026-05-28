// frontend/src/app/onboarding/1/page.tsx
'use client';

import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { step1Schema, type Step1Schema } from '@/lib/schemas/onboarding.schemas';
import { useOnboarding } from '@/context/onboarding-context';
import { ProgressIndicator } from '@/components/ui/progress-indicator';
import { FormField } from '@/components/ui/form-field';
import { Button } from '@/components/ui/button';
import { BirthdateInput } from '@/components/ui/birthdate-input';
import { PhoneInput } from '@/components/ui/phone-input';

export default function OnboardingStep1() {
  const router = useRouter();
  const { data, update } = useOnboarding();

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<Step1Schema>({
    resolver: zodResolver(step1Schema),
    defaultValues: {
      fullName: data.fullName,
      birthdate: data.birthdate,
      contactDetails: data.contactDetails,
    },
    mode: 'onBlur',
  });

  const onSubmit = (values: Step1Schema) => {
    update(values);
    router.push('/onboarding/2');
  };

  const inputClass =
    'w-full rounded-md border border-outline-variant bg-surface-white px-3 py-2.5 text-sm text-on-surface font-manrope placeholder:text-outline transition-colors focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 aria-[invalid=true]:border-error';

  return (
    <div className="flex flex-col gap-6">
      <ProgressIndicator currentStep={1} totalSteps={5} />
      <div>
        <h1 className="text-2xl font-semibold text-text-primary font-plus-jakarta">
          Personal Information
        </h1>
        <p className="mt-1 text-sm text-on-surface-variant font-manrope">
          Tell us a little about yourself so your doctors have context.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
        <FormField id="ob1-fullName" label="Full name" error={errors.fullName?.message} required>
          <input type="text" autoComplete="name" placeholder="Maria Santos" className={inputClass} {...register('fullName')} />
        </FormField>

        <FormField id="ob1-birthdate" label="Date of birth" error={errors.birthdate?.message} required>
          <Controller
            control={control}
            name="birthdate"
            render={({ field }) => (
              <BirthdateInput
                value={field.value}
                onChange={field.onChange}
              />
            )}
          />
        </FormField>

        <FormField id="ob1-contactDetails" label="Contact number" error={errors.contactDetails?.message} required>
          <PhoneInput
            autoComplete="tel"
            placeholder="917 123 4567"
            {...register('contactDetails', {
              onChange: (e) => {
                let val = e.target.value.replace(/\D/g, '');
                if (val.startsWith('0')) val = val.slice(1);
                e.target.value = val.slice(0, 10);
              },
            })}
          />
        </FormField>

        <div className="flex justify-end pt-2">
          <Button id="ob1-next" type="submit" size="lg" className="min-w-[140px]">
            Continue →
          </Button>
        </div>
      </form>
    </div>
  );
}
