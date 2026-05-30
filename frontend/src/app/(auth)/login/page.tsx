'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { signIn, getSession } from 'next-auth/react';
import { loginSchema, type LoginSchema } from '@/lib/schemas/auth.schemas';
import { AuthCard } from '@/components/auth/auth-card';
import { FormField } from '@/components/ui/form-field';
import { PasswordInput } from '@/components/ui/password-input';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl');
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginSchema>({
    resolver: zodResolver(loginSchema),
    mode: 'onBlur',
  });

  const onSubmit = async (values: LoginSchema) => {
    setServerError(null);

    const result = await signIn('credentials', {
      email: values.email,
      password: values.password,
      redirect: false,
    });

    if (result?.ok) {
      const session = await getSession();
      const role = session?.user?.role;
      const defaultRedirect = role === 'DOCTOR' ? '/doctor/dashboard' : '/';
      router.push(callbackUrl ? decodeURIComponent(callbackUrl) : defaultRedirect);
    } else {
      setServerError('Incorrect email or password.');
    }
  };

  const inputClass =
    'w-full rounded-md border border-outline-variant bg-surface-white px-3 py-2.5 text-sm text-on-surface font-manrope placeholder:text-outline transition-colors focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 aria-[invalid=true]:border-error';

  return (
    <AuthCard title="Welcome back" subtitle="Sign in to your Ginhawa account." type="login">
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

        <FormField id="login-email" label="Email address" error={errors.email?.message} required>
          <input
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            className={inputClass}
            {...register('email')}
          />
        </FormField>

        <FormField id="login-password" label="Password" error={errors.password?.message} required>
          <PasswordInput autoComplete="current-password" placeholder="••••••••" {...register('password')} />
        </FormField>

        <Button id="login-submit" type="submit" size="lg" className="w-full mt-2" disabled={isSubmitting}>
          {isSubmitting ? (
            <span className="flex items-center gap-2">
              <Spinner /> Signing in…
            </span>
          ) : (
            'Sign in'
          )}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm font-manrope text-on-surface-variant">
        Don&apos;t have an account?{' '}
        <Link href="/signup" className="font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded">
          Sign up →
        </Link>
      </p>
    </AuthCard>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
