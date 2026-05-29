// frontend/src/app/onboarding/1/page.tsx
'use client';

import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { step1Schema, type Step1Schema } from '@/lib/schemas/onboarding.schemas';
import { useOnboarding } from '@/context/onboarding-context';
import { OnboardingShell } from '@/components/ui/onboarding-shell';
import { OnboardingNav } from '@/components/ui/onboarding-nav';
import { onboardingInputClass } from '@/lib/onboarding-styles';
import { FormField } from '@/components/ui/form-field';
import { BirthdateInput } from '@/components/ui/birthdate-input';
import { PhoneInput } from '@/components/ui/phone-input';
import { formatPhone } from '@/lib/format';

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

  return (
    <OnboardingShell step={1} totalSteps={6} title="Personal Information" subtitle="Tell us a little about yourself so your doctors have context.">
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
        <FormField id="ob1-fullName" label="Full name" error={errors.fullName?.message} required>
          <input type="text" autoComplete="name" placeholder="Maria Santos" className={onboardingInputClass} {...register('fullName')} />
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
          <Controller
            control={control}
            name="contactDetails"
            render={({ field }) => (
              <PhoneInput
                autoComplete="tel"
                placeholder="917 123 4567"
                value={formatPhone(field.value)}
                onChange={(e) => {
                  // Store digits only (drop a leading 0, cap at 10); display is auto-spaced.
                  const digits = e.target.value.replace(/\D/g, '').replace(/^0/, '').slice(0, 10);
                  field.onChange(digits);
                }}
              />
            )}
          />
        </FormField>

        <OnboardingNav submitLabel="Continue →" />
      </form>
    </OnboardingShell>
  );
}
