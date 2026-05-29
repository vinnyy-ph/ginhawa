'use client';

import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  doctorCredentialsSchema,
  localTodayISO,
  type DoctorCredentialsSchema,
} from '@/lib/schemas/onboarding.schemas';
import { useDoctorOnboarding } from '@/context/doctor-onboarding-context';
import { formatPrc, formatPtr } from '@/lib/format';
import { FormField } from '@/components/ui/form-field';
import { Button } from '@/components/ui/button';
import { ProgressIndicator } from '@/components/ui/progress-indicator';

export default function DoctorOnboardingStep2() {
  const router = useRouter();
  const { data, update } = useDoctorOnboarding();
  const today = localTodayISO();

  const {
    register,
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
    router.push('/onboarding/doctor/3');
  };

  const inputClass =
    'w-full rounded-xl border border-outline-variant bg-surface-white px-4 py-3 text-sm text-on-surface font-manrope focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all';

  return (
    <div className="flex flex-col gap-6">
      <ProgressIndicator currentStep={2} totalSteps={5} />
      <div>
        <h1 className="text-2xl font-semibold text-text-primary font-plus-jakarta">Credentials & Licensure</h1>
        <p className="mt-1 text-sm text-on-surface-variant font-manrope">
          Required for verification. Your PRC license confirms you are licensed to practice.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
        <FormField id="prcLicenseNo" label="PRC License Number" error={errors.prcLicenseNo?.message} required>
          <input
            id="prcLicenseNo"
            inputMode="numeric"
            className={inputClass}
            placeholder="0123456"
            {...register('prcLicenseNo', {
              onChange: (e) => {
                setValue('prcLicenseNo', formatPrc(e.target.value), { shouldValidate: true });
              },
            })}
          />
        </FormField>

        <FormField id="prcLicenseExpiry" label="PRC License Expiry" error={errors.prcLicenseExpiry?.message} required>
          <input id="prcLicenseExpiry" type="date" min={today} className={inputClass} {...register('prcLicenseExpiry')} />
        </FormField>

        <FormField id="ptrNo" label="PTR Number (Optional)" error={errors.ptrNo?.message}>
          <input
            id="ptrNo"
            inputMode="numeric"
            className={inputClass}
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
            <input id="region" className={inputClass} placeholder="NCR" {...register('region')} />
          </FormField>
          <FormField id="city" label="City (Optional)">
            <input id="city" className={inputClass} placeholder="Makati" {...register('city')} />
          </FormField>
        </div>

        <div className="flex justify-between items-center pt-4">
          <Button type="button" variant="ghost" onClick={() => router.push('/onboarding/doctor/1')} className="text-on-surface-variant hover:text-primary">
            ← Back
          </Button>
          <Button type="submit" className="rounded-full px-8 py-6 text-base font-semibold shadow-lg hover:shadow-xl transition-all">
            Continue →
          </Button>
        </div>
      </form>
    </div>
  );
}
