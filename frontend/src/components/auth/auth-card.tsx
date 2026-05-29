// frontend/src/components/auth/auth-card.tsx
import * as React from 'react';
import { cn } from '@/lib/utils';
import { Logo } from '@/components/ui/logo';
import { FadeIn } from '@/components/ui/fade-in';
import { CheckCircledIcon, MagicWandIcon, HeartIcon } from '@radix-ui/react-icons';
import Link from 'next/link';

interface AuthCardProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
  type?: 'login' | 'signup-patient' | 'signup-doctor';
}

export function AuthCard({ title, subtitle, children, className, type = 'login' }: AuthCardProps) {
  const isDoctor = type === 'signup-doctor';
  const isPatient = type === 'signup-patient';

  const leftHeader = isDoctor 
    ? "The workflow that feels like breathing room." 
    : isPatient 
    ? "Take charge of your health." 
    : "Welcome back to Ginhawa.";

  const leftSubtitle = isDoctor
    ? "Join as a provider to simplify your clinical care, manage your schedule, and focus on your patients."
    : isPatient
    ? "Join Ginhawa today and experience healthcare that breathes with you."
    : "Sign in to access your appointments, medical records, and connect with your healthcare providers.";

  const features = isDoctor ? [
    { text: "Predictable schedule management", icon: <CheckCircledIcon className="h-5 w-5 text-primary" aria-hidden="true" /> },
    { text: "Patient context at a glance", icon: <CheckCircledIcon className="h-5 w-5 text-primary" aria-hidden="true" /> },
    { text: "Frictionless notes & prescriptions", icon: <CheckCircledIcon className="h-5 w-5 text-primary" aria-hidden="true" /> },
  ] : isPatient ? [
    { text: "Book with top specialists", icon: <CheckCircledIcon className="h-5 w-5 text-primary" aria-hidden="true" /> },
    { text: "Access your records anytime", icon: <CheckCircledIcon className="h-5 w-5 text-primary" aria-hidden="true" /> },
    { text: "Secure & private consultations", icon: <CheckCircledIcon className="h-5 w-5 text-primary" aria-hidden="true" /> },
  ] : [
    { text: "Manage your appointments", icon: <CheckCircledIcon className="h-5 w-5 text-primary" aria-hidden="true" /> },
    { text: "Secure clinical messaging", icon: <CheckCircledIcon className="h-5 w-5 text-primary" aria-hidden="true" /> },
    { text: "Privacy-first by default", icon: <CheckCircledIcon className="h-5 w-5 text-primary" aria-hidden="true" /> },
  ];

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Left Panel (Hidden on mobile/tablet, shown on desktop) */}
      <aside className="relative hidden lg:flex w-1/2 flex-col justify-between overflow-hidden bg-surface-white border-r border-outline-variant/30 p-12 lg:p-16 xl:p-20" aria-label="Branding">
        {/* Soft Tactile Background */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-24 right-[-20%] h-[520px] w-[520px] rounded-full bg-primary-container/15 blur-3xl" />
          <div className="absolute -bottom-24 left-[-18%] h-[520px] w-[520px] rounded-full bg-secondary-container/12 blur-3xl" />
          <div className="absolute inset-0 bg-[radial-gradient(1000px_circle_at_20%_10%,rgba(72,202,182,0.10),transparent_55%),radial-gradient(900px_circle_at_80%_30%,rgba(49,167,149,0.12),transparent_55%)]" />
        </div>

        <div className="relative z-10">
          <Link href="/" className="inline-flex items-center gap-2 hover:opacity-80 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded">
            <Logo size={40} />
            <span className="text-xl font-bold font-serif tracking-wide text-text-primary">
              Ginhawa
            </span>
          </Link>
        </div>

        <div className="relative z-10 max-w-lg mb-10">
          <FadeIn direction="up">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-secondary-container/60 bg-secondary-container/20 px-3 py-1">
              {isDoctor ? (
                <MagicWandIcon className="h-3.5 w-3.5 text-on-surface-variant" aria-hidden="true" />
              ) : isPatient ? (
                <HeartIcon className="h-3.5 w-3.5 text-on-surface-variant" aria-hidden="true" />
              ) : (
                <span className="h-2 w-2 rounded-full bg-primary animate-pulse" aria-hidden="true" />
              )}
              <span className="text-xs font-semibold tracking-wide text-on-surface-variant">
                {isDoctor ? "For Healthcare Providers" : isPatient ? "For Patients" : "Welcome Back"}
              </span>
            </div>
            
            <h1 className="text-4xl lg:text-5xl font-bold font-plus-jakarta leading-tight tracking-tight text-text-primary mb-6">
              {leftHeader}
            </h1>
            <p className="text-lg text-on-surface-variant font-manrope leading-relaxed mb-10">
              {leftSubtitle}
            </p>
            <div className="flex flex-col gap-5">
              {features.map((feature, i) => (
                <FadeIn key={i} delay={0.1 + i * 0.1} direction="up">
                  <div className="flex items-center gap-4">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                      {feature.icon}
                    </div>
                    <span className="text-text-primary font-medium font-manrope text-base">{feature.text}</span>
                  </div>
                </FadeIn>
              ))}
            </div>
          </FadeIn>
        </div>
        
        <div className="relative z-10 text-sm text-on-surface-variant font-manrope">
          © {new Date().getFullYear()} Ginhawa Health. All rights reserved.
        </div>
      </aside>

      {/* Right Panel (Form) */}
      <main className="flex w-full lg:w-1/2 flex-col items-center justify-center p-6 sm:p-12 relative">
        {/* Mobile Header (Hidden on Desktop) */}
        <header className="lg:hidden absolute top-8 left-0 w-full flex justify-center">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <Logo size={36} />
            <span className="text-xl font-bold font-serif tracking-wide text-text-primary">
              Ginhawa
            </span>
          </Link>
        </header>

        <FadeIn direction="up" className="w-full max-w-md mt-16 lg:mt-0">
          <div
            className={cn(
              'w-full rounded-2xl bg-surface-white shadow-lifted border border-outline-variant/40 px-6 py-10 sm:px-10 sm:py-12',
              className,
            )}
          >
            <h2 className="mb-2 text-2xl sm:text-3xl font-bold text-text-primary font-plus-jakarta leading-tight">
              {title}
            </h2>
            {subtitle && (
              <p className="mb-8 text-sm sm:text-base text-on-surface-variant font-manrope">
                {subtitle}
              </p>
            )}
            <div>{children}</div>
          </div>
        </FadeIn>
      </main>
    </div>
  );
}
