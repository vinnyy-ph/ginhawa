// frontend/src/app/onboarding/5/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { apiRequest, ApiError } from '@/lib/api-client';
import { useOnboarding } from '@/context/onboarding-context';
import { ProgressIndicator } from '@/components/ui/progress-indicator';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Toast } from '@/components/ui/toast';
import type { CreatePatientProfileBody } from '@/types/patient';

function ReviewSection({
  title,
  editHref,
  children,
}: {
  title: string;
  editHref: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-outline-variant bg-surface-white p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-on-surface font-plus-jakarta">{title}</h2>
        <Link
          href={editHref}
          className="text-xs font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded font-manrope"
        >
          Edit
        </Link>
      </div>
      <div className="flex flex-col gap-1.5 text-sm text-on-surface-variant font-manrope">{children}</div>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <span className="min-w-[120px] text-outline text-xs uppercase tracking-wide font-semibold">{label}</span>
      <span className="text-on-surface">{value || '—'}</span>
    </div>
  );
}

export default function OnboardingStep5() {
  const router = useRouter();
  const { data: session } = useSession();
  const { data, reset } = useOnboarding();
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);

  const medicalHistory = [
    data.conditions && `Conditions: ${data.conditions}`,
    data.allergies && `Allergies: ${data.allergies}`,
    data.medications && `Medications: ${data.medications}`,
  ]
    .filter(Boolean)
    .join('\n');

  const handleSubmit = async () => {
    setServerError(null);
    setSubmitting(true);

    const token = session?.user?.accessToken;
    if (!token) {
      setServerError('Session expired. Please log in again.');
      setSubmitting(false);
      return;
    }

    const body: CreatePatientProfileBody = {
      fullName: data.fullName,
      birthdate: data.birthdate,
      contactDetails: data.contactDetails,
      weight: data.weightKg ?? undefined,
      height: data.heightCm ?? undefined,
      profilePictureUrl: data.profilePictureUrl ?? undefined,
      medicalHistory: medicalHistory || undefined,
    };

    const doSubmit = async (method: 'POST' | 'PATCH') => {
      await apiRequest('/patients/profile', { method, body, token });
      reset();
      setShowToast(true);
      setTimeout(() => router.push('/dashboard'), 1800);
    };

    try {
      await doSubmit('POST');
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        try {
          await doSubmit('PATCH');
        } catch {
          setServerError('Something went wrong. Please try again.');
        }
      } else {
        setServerError('Something went wrong. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <ProgressIndicator currentStep={5} totalSteps={5} />
      <div>
        <h1 className="text-2xl font-semibold text-text-primary font-plus-jakarta">Review &amp; Confirm</h1>
        <p className="mt-1 text-sm text-on-surface-variant font-manrope">Check your information before saving your profile.</p>
      </div>

      <div className="flex flex-col gap-3">
        <ReviewSection title="Personal Information" editHref="/onboarding/1">
          <ReviewRow label="Name" value={data.fullName} />
          <ReviewRow label="Birthday" value={data.birthdate} />
          <ReviewRow label="Contact" value={data.contactDetails} />
        </ReviewSection>

        <ReviewSection title="Body Metrics" editHref="/onboarding/2">
          <ReviewRow label="Weight" value={data.weightKg ? `${data.weightKg} kg` : ''} />
          <ReviewRow label="Height" value={data.heightCm ? `${data.heightCm} cm` : ''} />
        </ReviewSection>

        <ReviewSection title="Medical History" editHref="/onboarding/3">
          <ReviewRow label="Conditions" value={data.conditions} />
          <ReviewRow label="Allergies" value={data.allergies} />
          {data.medications && <ReviewRow label="Medications" value={data.medications} />}
        </ReviewSection>

        <ReviewSection title="Profile Picture" editHref="/onboarding/4">
          {data.profilePictureUrl ? (
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={data.profilePictureUrl} alt="Profile preview" className="h-12 w-12 rounded-full object-cover border border-outline-variant" />
              <span className="text-success text-sm font-semibold">Photo uploaded</span>
            </div>
          ) : (
            <span className="text-outline italic">No photo — skipped</span>
          )}
        </ReviewSection>
      </div>

      {serverError && (
        <div role="alert" className="flex items-center gap-2 rounded-md border border-error/30 bg-error/5 px-4 py-3 text-sm text-error font-manrope">
          <svg aria-hidden="true" className="h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {serverError}
          <button onClick={handleSubmit} className="ml-auto text-xs font-semibold underline hover:no-underline focus-visible:outline-none">Retry</button>
        </div>
      )}

      <div className="flex justify-between pt-2">
        <Button id="ob5-back" type="button" variant="outline" size="lg" onClick={() => router.push('/onboarding/4')} disabled={submitting}>← Back</Button>
        <Button id="ob5-complete" type="button" size="lg" className="min-w-[160px]" disabled={submitting} onClick={handleSubmit}>
          {submitting ? (
            <span className="flex items-center gap-2"><Spinner /> Saving…</span>
          ) : (
            'Complete Profile ✓'
          )}
        </Button>
      </div>

      {showToast && (
        <Toast message="Your profile is ready. Welcome to Ginhawa!" variant="success" />
      )}
    </div>
  );
}
