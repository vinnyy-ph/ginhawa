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
import { ProgressIndicator } from '@/components/ui/progress-indicator';
import { FormField } from '@/components/ui/form-field';
import { Button } from '@/components/ui/button';
import { formatPhilHealth, formatHmoCard } from '@/lib/format';

export default function OnboardingStep2() {
  const router = useRouter();
  const { data, update } = useOnboarding();

  const {
    register,
    handleSubmit,
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

  const inputClass =
    'w-full rounded-md border border-outline-variant bg-surface-white px-3 py-2.5 text-sm text-on-surface font-manrope placeholder:text-outline transition-colors focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 aria-[invalid=true]:border-error';

  return (
    <div className="flex flex-col gap-6">
      <ProgressIndicator currentStep={2} totalSteps={6} />
      <div>
        <h1 className="text-2xl font-semibold text-text-primary font-plus-jakarta">
          Location & Insurance
        </h1>
        <p className="mt-1 text-sm text-on-surface-variant font-manrope">
          Optional — helps with billing and connecting you to nearby care. You can skip any field.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
        <FormField id="ob2-address" label="Address" error={errors.address?.message}>
          <input type="text" autoComplete="street-address" placeholder="123 Mabini St." className={inputClass} {...register('address')} />
        </FormField>

        <div className="grid grid-cols-2 gap-4">
          <FormField id="ob2-city" label="City" error={errors.city?.message}>
            <input type="text" autoComplete="address-level2" placeholder="Quezon City" className={inputClass} {...register('city')} />
          </FormField>
          <FormField id="ob2-region" label="Region" error={errors.region?.message}>
            <input type="text" autoComplete="address-level1" placeholder="NCR" className={inputClass} {...register('region')} />
          </FormField>
        </div>

        <FormField id="ob2-philhealthId" label="PhilHealth ID" error={errors.philhealthId?.message}>
          <input
            type="text"
            inputMode="numeric"
            placeholder="12-345678901-2"
            className={inputClass}
            {...register('philhealthId', {
              onChange: (e) => {
                e.target.value = formatPhilHealth(e.target.value);
              },
            })}
          />
        </FormField>

        <div className="grid grid-cols-2 gap-4">
          <FormField id="ob2-hmoProvider" label="HMO Provider" error={errors.hmoProvider?.message}>
            <input type="text" placeholder="Maxicare" className={inputClass} {...register('hmoProvider')} />
          </FormField>
          <FormField id="ob2-hmoCardNo" label="HMO Card No." error={errors.hmoCardNo?.message}>
            <input
              type="text"
              placeholder="XXXX-XXXX-XXXX"
              className={inputClass}
              {...register('hmoCardNo', {
                onChange: (e) => {
                  e.target.value = formatHmoCard(e.target.value);
                },
              })}
            />
          </FormField>
        </div>

        <div className="flex justify-between pt-2">
          <Button id="ob2-back" type="button" variant="outline" size="lg" onClick={() => router.push('/onboarding/1')}>← Back</Button>
          <Button id="ob2-next" type="submit" size="lg" className="min-w-[140px]">Continue →</Button>
        </div>
      </form>
    </div>
  );
}
