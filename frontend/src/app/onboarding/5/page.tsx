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

function InfoPoint({ label, value, editHref }: { label: string; value: string; editHref?: string }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-wider font-bold text-outline font-plus-jakarta">{label}</span>
        {editHref && (
          <Link href={editHref} className="text-[10px] font-bold text-primary hover:underline">
            EDIT
          </Link>
        )}
      </div>
      <span className="text-sm font-medium text-on-surface font-manrope">{value || '—'}</span>
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
    <div className="flex flex-col gap-8">
      <ProgressIndicator currentStep={5} totalSteps={5} />
      
      <div className="text-center">
        <h1 className="text-3xl font-bold text-text-primary font-plus-jakarta tracking-tight">One last check</h1>
        <p className="mt-2 text-on-surface-variant font-manrope">This will be your official digital health record.</p>
      </div>

      <div className="bg-surface-white rounded-3xl border border-outline-variant/30 shadow-lifted overflow-hidden transition-all duration-300 hover:shadow-hover">
        <div className="bg-gradient-to-br from-primary to-primary-container p-8 text-white relative overflow-hidden">
          {/* Decorative background element */}
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="flex items-center gap-6 relative z-10">
            <div className="relative">
              <div className="h-24 w-24 rounded-2xl bg-white/20 backdrop-blur-md border-2 border-white/30 overflow-hidden flex items-center justify-center shadow-inner">
                {data.profilePictureUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={data.profilePictureUrl} alt={data.fullName} className="h-full w-full object-cover" />
                ) : (
                  <svg className="w-12 h-12 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 0116 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                )}
              </div>
              <Link href="/onboarding/4" className="absolute -bottom-2 -right-2 bg-white text-primary p-2 rounded-xl shadow-lg hover:scale-110 transition-transform">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                </svg>
              </Link>
            </div>
            
            <div className="flex flex-col">
              <span className="text-[10px] font-bold tracking-[0.2em] text-white/70 uppercase font-plus-jakarta mb-1">Digital Patient ID</span>
              <h2 className="text-2xl font-bold font-plus-jakarta tracking-tight leading-tight">{data.fullName}</h2>
              <div className="flex items-center gap-2 mt-2">
                <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
                <span className="text-xs font-medium text-white/80">Profile Complete</span>
              </div>
            </div>
          </div>
        </div>

        <div className="p-8 grid grid-cols-2 gap-x-8 gap-y-10">
          <InfoPoint label="Full Name" value={data.fullName} editHref="/onboarding/1" />
          <InfoPoint label="Date of Birth" value={data.birthdate} editHref="/onboarding/1" />
          <InfoPoint label="Contact Info" value={data.contactDetails} editHref="/onboarding/1" />
          <InfoPoint label="Metrics" value={`${data.weightKg ? data.weightKg + 'kg' : '—'} / ${data.heightCm ? data.heightCm + 'cm' : '—'}`} editHref="/onboarding/2" />
          
          <div className="col-span-2 h-px bg-outline-variant/30" />
          
          <div className="col-span-2">
            <InfoPoint label="Medical Conditions" value={data.conditions} editHref="/onboarding/3" />
          </div>
          <div className="col-span-2">
            <InfoPoint label="Allergies" value={data.allergies} editHref="/onboarding/3" />
          </div>
          <div className="col-span-2">
            <InfoPoint label="Current Medications" value={data.medications} editHref="/onboarding/3" />
          </div>
        </div>
      </div>

      {serverError && (
        <div role="alert" className="flex items-center gap-3 rounded-2xl border border-error/20 bg-error/5 p-4 text-sm text-error font-manrope animate-in fade-in slide-in-from-top-2">
          <svg className="h-5 w-5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <span className="flex-1 font-medium">{serverError}</span>
          <button onClick={handleSubmit} className="text-xs font-bold uppercase tracking-wider hover:underline focus:outline-none bg-error text-white px-3 py-1 rounded-lg">Retry</button>
        </div>
      )}

      <div className="flex gap-4 pt-4">
        <Button id="ob5-back" type="button" variant="outline" size="lg" className="flex-1 h-14 rounded-2xl font-bold" onClick={() => router.push('/onboarding/4')} disabled={submitting}>
          Back
        </Button>
        <Button id="ob5-complete" type="button" size="lg" className="flex-[2] h-14 rounded-2xl font-bold shadow-lifted hover:shadow-hover transition-all" disabled={submitting} onClick={handleSubmit}>
          {submitting ? (
            <span className="flex items-center gap-2"><Spinner className="w-5 h-5" /> Processing…</span>
          ) : (
            'Generate ID Card ✓'
          )}
        </Button>
      </div>

      {showToast && (
        <Toast message="Profile verified! Redirecting to dashboard..." variant="success" />
      )}
    </div>
  );
}
