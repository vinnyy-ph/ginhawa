'use client';

/**
 * Route: /signup/doctor — healthcare provider self-registration page.
 *
 * Creates a new DOCTOR account via POST /auth/signup (role: DOCTOR), then
 * immediately signs the user in and redirects to /onboarding/doctor to collect
 * professional details (specialization, schedule, credentials).
 */

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { signIn } from 'next-auth/react';
import { signupSchema, type SignupSchema } from '@/lib/schemas/auth.schemas';
import { apiRequest, ApiError } from '@/lib/api-client';
import { AuthCard } from '@/components/auth/auth-card';
import { FormField } from '@/components/ui/form-field';
import { PasswordInput } from '@/components/ui/password-input';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';

/**
 * Renders the doctor sign-up form. Mirrors the patient flow but sets role to
 * DOCTOR and routes to the doctor-specific onboarding on success.
 */
export default function DoctorSignupPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupSchema>({
    resolver: zodResolver(signupSchema),
    mode: 'onBlur',
  });

  const onSubmit = async (values: SignupSchema) => {
    setServerError(null);
    try {
      await apiRequest<{ access_token: string; user: { id: string; email: string; role: string } }>(
        '/auth/signup',
        {
          method: 'POST',
          body: { email: values.email, password: values.password, role: 'DOCTOR' },
        },
      );

      const result = await signIn('credentials', {
        email: values.email,
        password: values.password,
        redirect: false,
      });

      if (result?.ok) {
        router.push('/onboarding/doctor');
      } else {
        router.push('/login');
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setServerError('An account with this email already exists.');
      } else {
        setServerError('Something went wrong. Please try again.');
      }
    }
  };

  const inputClass =
    'w-full rounded-md border border-outline-variant bg-surface-white px-3 py-2.5 text-sm text-on-surface font-manrope placeholder:text-outline transition-colors focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 aria-[invalid=true]:border-error';

  return (
    <AuthCard
      title="Join Ginhawa as a Doctor"
      subtitle="Set your availability, consult with context, and document care — with less friction."
      type="signup-doctor"
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
        {serverError && (
          <div
            role="alert"
            className="flex items-center gap-2 rounded-md border border-error/30 bg-error/5 px-4 py-3 text-sm text-error font-manrope"
          >
            <svg aria-hidden="true" className="h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            {serverError}
          </div>
        )}

        <FormField id="doctor-signup-email" label="Work email" error={errors.email?.message} required>
          <input
            type="email"
            autoComplete="email"
            placeholder="you@clinic.com"
            className={inputClass}
            {...register('email')}
          />
        </FormField>

        <FormField
          id="doctor-signup-password"
          label="Password"
          error={errors.password?.message}
          hint="At least 8 characters including a number"
          required
        >
          <PasswordInput autoComplete="new-password" placeholder="••••••••" {...register('password')} />
        </FormField>

        <FormField
          id="doctor-signup-confirm-password"
          label="Confirm password"
          error={errors.confirmPassword?.message}
          required
        >
          <PasswordInput autoComplete="new-password" placeholder="••••••••" {...register('confirmPassword')} />
        </FormField>

        <Button type="submit" size="lg" className="w-full mt-1" disabled={isSubmitting}>
          {isSubmitting ? (
            <span className="flex items-center gap-2">
              <Spinner /> Creating doctor account…
            </span>
          ) : (
            'Create doctor account'
          )}
        </Button>
      </form>

      <div className="mt-6 flex flex-col gap-3 text-center text-sm font-manrope text-on-surface-variant">
        <p>
          Already have an account?{' '}
          <Link
            href="/login"
            className="font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
          >
            Log in →
          </Link>
        </p>
        <p>
          Looking for the patient app?{' '}
          <Link
            href="/signup"
            className="font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
          >
            Create a patient account →
          </Link>
        </p>
      </div>
    </AuthCard>
  );
}
