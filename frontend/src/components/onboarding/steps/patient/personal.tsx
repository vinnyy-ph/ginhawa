'use client';

/**
 * PersonalStep — patient onboarding, step 1 of 6 ("Personal Information").
 *
 * The only required step in the patient flow. Collects full name, date of
 * birth (capped at today via `localTodayISO`), and a 10-digit Philippine
 * mobile number (stored digits-only, displayed spaced). Zod schema validation
 * via react-hook-form gates `nav.goNext()`. The onboarding guard also uses the
 * same `step1Schema` to determine whether a patient may skip ahead.
 */
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { step1Schema, type Step1Schema } from '@/lib/schemas/onboarding.schemas';
import { useOnboarding } from '@/providers/onboarding-context';
import { OnboardingNav } from '@/components/ui/onboarding-nav';
import { onboardingInputClass } from '@/components/ui/onboarding-styles';
import { FormField } from '@/components/ui/form-field';
import { DatePicker } from '@/components/ui/date-picker';
import { localTodayISO } from '@/lib/schemas/onboarding.schemas';
import { PhoneInput } from '@/components/ui/phone-input';
import { formatPhone } from '@/lib/format';
import type { OnboardingNav as OnboardingNavType } from '@/components/onboarding/steps/types';

/**
 * Renders the personal information form (name, date of birth, contact number).
 * The phone field stores raw digits (no leading zero, max 10) in context while
 * `formatPhone` drives the human-readable display — separating storage format
 * from display format without a second state variable.
 */
export function PersonalStep({ nav }: { nav: OnboardingNavType }) {
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
    nav.goNext();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
      <FormField id="ob1-fullName" label="Full name" error={errors.fullName?.message} required>
        <input type="text" autoComplete="name" placeholder="Maria Santos" className={onboardingInputClass} {...register('fullName')} />
      </FormField>

      <FormField id="ob1-birthdate" label="Date of birth" error={errors.birthdate?.message} required>
        <Controller
          control={control}
          name="birthdate"
          render={({ field }) => (
            <DatePicker
              id="ob1-birthdate"
              value={field.value}
              onChange={field.onChange}
              maxDate={localTodayISO()}
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
  );
}
