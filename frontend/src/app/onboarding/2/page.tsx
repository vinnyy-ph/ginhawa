// frontend/src/app/onboarding/2/page.tsx
'use client';

import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  locationInsuranceSchema,
  type LocationInsuranceSchema,
} from '@/lib/schemas/onboarding.schemas';
import { useOnboarding } from '@/context/onboarding-context';
import { OnboardingShell } from '@/components/ui/onboarding-shell';
import { OnboardingNav } from '@/components/ui/onboarding-nav';
import { onboardingInputClass } from '@/lib/onboarding-styles';
import { FormField } from '@/components/ui/form-field';
import { formatPhilHealth, formatHmoCard } from '@/lib/format';

export default function OnboardingStep2() {
  const router = useRouter();
  const { data, update } = useOnboarding();

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LocationInsuranceSchema>({
    resolver: zodResolver(locationInsuranceSchema),
    defaultValues: {
      address: data.address,
      city: data.city,
      region: data.region,
      philhealthId: data.philhealthId,
      hmoProvider: data.hmoProvider,
      hmoCardNo: data.hmoCardNo,
    },
    mode: 'onBlur',
  });

  const onSubmit = (values: LocationInsuranceSchema) => {
    update({
      address: values.address ?? '',
      city: values.city ?? '',
      region: values.region ?? '',
      philhealthId: values.philhealthId ?? '',
      hmoProvider: values.hmoProvider ?? '',
      hmoCardNo: values.hmoCardNo ?? '',
    });
    router.push('/onboarding/3');
  };

  return (
    <OnboardingShell step={2} totalSteps={6} title="Location & Insurance" subtitle="Optional — helps with billing and connecting you to nearby care. You can skip any field.">
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
        <FormField id="ob2-address" label="Address" error={errors.address?.message}>
          <input type="text" autoComplete="street-address" placeholder="123 Mabini St." className={onboardingInputClass} {...register('address')} />
        </FormField>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField id="ob2-city" label="City" error={errors.city?.message}>
            <input type="text" autoComplete="address-level2" placeholder="Quezon City" className={onboardingInputClass} {...register('city')} />
          </FormField>
          <FormField id="ob2-region" label="Region" error={errors.region?.message}>
            <input type="text" autoComplete="address-level1" placeholder="NCR" className={onboardingInputClass} {...register('region')} />
          </FormField>
        </div>

        <FormField id="ob2-philhealthId" label="PhilHealth ID" error={errors.philhealthId?.message}>
          <input
            type="text"
            inputMode="numeric"
            placeholder="12-345678901-2"
            className={onboardingInputClass}
            {...register('philhealthId', {
              onChange: (e) => {
                setValue('philhealthId', formatPhilHealth(e.target.value), { shouldValidate: true });
              },
            })}
          />
        </FormField>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField id="ob2-hmoProvider" label="HMO Provider" error={errors.hmoProvider?.message}>
            <input type="text" placeholder="Maxicare" className={onboardingInputClass} {...register('hmoProvider')} />
          </FormField>
          <FormField id="ob2-hmoCardNo" label="HMO Card No." error={errors.hmoCardNo?.message}>
            <input
              type="text"
              placeholder="XXXX-XXXX-XXXX"
              className={onboardingInputClass}
              {...register('hmoCardNo', {
                onChange: (e) => {
                  setValue('hmoCardNo', formatHmoCard(e.target.value), { shouldValidate: true });
                },
              })}
            />
          </FormField>
        </div>

        <OnboardingNav onBack={() => router.push('/onboarding/1')} submitLabel="Continue →" />
      </form>
    </OnboardingShell>
  );
}
