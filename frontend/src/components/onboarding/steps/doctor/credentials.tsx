'use client';

import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  doctorCredentialsSchema,
  localTodayISO,
  type DoctorCredentialsSchema,
} from '@/lib/schemas/onboarding.schemas';
import { useDoctorOnboarding } from '@/context/doctor-onboarding-context';
import { formatPrc, formatPtr } from '@/lib/format';
import { FormField } from '@/components/ui/form-field';
import { OnboardingNav } from '@/components/ui/onboarding-nav';
import { onboardingInputClass } from '@/lib/onboarding-styles';
import { DatePicker } from '@/components/ui/date-picker';
import type { OnboardingNav as OnboardingNavType } from '@/components/onboarding/steps/types';

export function CredentialsStep({ nav }: { nav: OnboardingNavType }) {
  const { data, update } = useDoctorOnboarding();
  const today = localTodayISO();

  const {
    register,
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<DoctorCredentialsSchema>({
    resolver: zodResolver(doctorCredentialsSchema),
    defaultValues: {
      prcLicenseNo: data.prcLicenseNo,
      prcLicenseExpiry: data.prcLicenseExpiry,
      ptrNo: data.ptrNo,
      region: data.region,
      city: data.city,
    },
    mode: 'onBlur',
  });

  const onSubmit = (values: DoctorCredentialsSchema) => {
    update({
      prcLicenseNo: values.prcLicenseNo,
      prcLicenseExpiry: values.prcLicenseExpiry,
      ptrNo: values.ptrNo ?? '',
      region: values.region ?? '',
      city: values.city ?? '',
    });
    nav.goNext();
  };

  return (
    <>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
        <FormField id="prcLicenseNo" label="PRC License Number" error={errors.prcLicenseNo?.message} required>
          <input
            id="prcLicenseNo"
            inputMode="numeric"
            className={onboardingInputClass}
            placeholder="0123456"
            {...register('prcLicenseNo', {
              onChange: (e) => {
                setValue('prcLicenseNo', formatPrc(e.target.value), { shouldValidate: true });
              },
            })}
          />
        </FormField>

        <FormField id="prcLicenseExpiry" label="PRC License Expiry" error={errors.prcLicenseExpiry?.message} required>
          <Controller
            control={control}
            name="prcLicenseExpiry"
            render={({ field }) => (
              <DatePicker
                id="prcLicenseExpiry"
                value={field.value}
                onChange={field.onChange}
                minDate={today}
              />
            )}
          />
        </FormField>

        <FormField id="ptrNo" label="PTR Number (Optional)" error={errors.ptrNo?.message}>
          <input
            id="ptrNo"
            inputMode="numeric"
            className={onboardingInputClass}
            placeholder="12345678"
            {...register('ptrNo', {
              onChange: (e) => {
                setValue('ptrNo', formatPtr(e.target.value), { shouldValidate: true });
              },
            })}
          />
        </FormField>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField id="region" label="Region (Optional)">
            <input id="region" className={onboardingInputClass} placeholder="NCR" {...register('region')} />
          </FormField>
          <FormField id="city" label="City (Optional)">
            <input id="city" className={onboardingInputClass} placeholder="Makati" {...register('city')} />
          </FormField>
        </div>

        <OnboardingNav onBack={() => nav.goBack()} submitLabel="Continue →" />
      </form>
    </>
  );
}
