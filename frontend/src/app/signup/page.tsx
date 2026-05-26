// frontend/src/app/signup/page.tsx
'use client';

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

export default function SignupPage() {
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
        '/api/auth/register',
        {
          method: 'POST',
          body: { email: values.email, password: values.password, role: 'PATIENT' },
        },
      );

      const result = await signIn('credentials', {
        email: values.email,
        password: values.password,
        redirect: false,
      });

      if (result?.ok) {
        router.push('/onboarding/1');
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
      title="Create your account"
      subtitle="Join Ginhawa and take charge of your health."
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
        {serverError && (
          <div
            role="alert"
            className="flex items-center gap-2 rounded-md border border-error/30 bg-error/5 px-4 py-3 text-sm text-error font-manrope"
          >
            <svg aria-hidden="true" className="h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {serverError}
          </div>
        )}

        <FormField id="signup-email" label="Email address" error={errors.email?.message} required>
          <input
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            className={inputClass}
            {...register('email')}
          />
        </FormField>

        <FormField
          id="signup-password"
          label="Password"
          error={errors.password?.message}
          hint="At least 8 characters including a number"
          required
        >
          <PasswordInput autoComplete="new-password" placeholder="••••••••" {...register('password')} />
        </FormField>

        <FormField
          id="signup-confirm-password"
          label="Confirm password"
          error={errors.confirmPassword?.message}
          required
        >
          <PasswordInput autoComplete="new-password" placeholder="••••••••" {...register('confirmPassword')} />
        </FormField>

        <Button id="signup-submit" type="submit" size="lg" className="w-full mt-1" disabled={isSubmitting}>
          {isSubmitting ? (
            <span className="flex items-center gap-2">
              <Spinner /> Creating account…
            </span>
          ) : (
            'Create account'
          )}
        </Button>
      </form>

      <div className="mt-6 flex flex-col gap-3 text-center text-sm font-manrope text-on-surface-variant">
        <p>
          Already have an account?{' '}
          <Link href="/login" className="font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded">
            Log in →
          </Link>
        </p>
        <p>
          Are you a healthcare provider?{' '}
          <Link href="/signup/doctor" className="font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded">
            Join as a Doctor →
          </Link>
        </p>
      </div>
    </AuthCard>
  );
}
