'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useDoctorOnboarding } from '@/context/doctor-onboarding-context';
import { apiRequest } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { ProgressIndicator } from '@/components/ui/progress-indicator';
import { Spinner } from '@/components/ui/spinner';
import { Toast } from '@/components/ui/toast';

export default function DoctorOnboardingStep5() {
  const router = useRouter();
  const { data: session } = useSession();
  const { data } = useDoctorOnboarding();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<{ message: string; variant: 'error' | 'success' } | null>(null);

  const handleSubmit = async () => {
    if (!session?.user?.accessToken) {
      setToast({ message: 'Session expired. Please log in again.', variant: 'error' });
      return;
    }

    setIsSubmitting(true);
    setToast(null);

    try {
      const response = await apiRequest<{ profileComplete: boolean }>('/doctors/profile', {
        method: 'POST',
        body: {
          ...data,
          // Empty "" fails backend @IsDateString (which only skips null/undefined);
          // send undefined so an unfilled expiry is omitted rather than 400-ing.
          prcLicenseExpiry: data.prcLicenseExpiry || undefined,
          languagesSpoken: data.languagesSpoken
            ? data.languagesSpoken.split(',').map((s: string) => s.trim()).filter(Boolean)
            : [],
        },
        token: session.user.accessToken as string,
      });

      if (response.profileComplete) {
        setToast({ message: 'Profile completed successfully!', variant: 'success' });
        // Small delay to let user see success message before redirect
        setTimeout(() => {
          router.push('/doctor/dashboard');
        }, 1500);
      }
    } catch (error) {
      console.error('Failed to save profile', error);
      setToast({ message: 'Failed to save profile. Please try again.', variant: 'error' });
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <ProgressIndicator currentStep={5} totalSteps={5} />
      
      <div>
        <h1 className="text-2xl font-semibold text-text-primary font-plus-jakarta">Review Your Profile</h1>
        <p className="mt-1 text-sm text-on-surface-variant font-manrope">
          Make sure everything looks correct before completing your registration.
        </p>
      </div>

      <div className="flex flex-col gap-6 overflow-y-auto max-h-[60vh] pr-2 custom-scrollbar">
        {/* Profile Header Review */}
        <div className="bg-surface-container rounded-2xl p-6 flex flex-col md:flex-row items-center gap-6 border border-outline-variant/50">
          <div className="h-24 w-24 rounded-full bg-surface-container-high border-2 border-primary/20 overflow-hidden flex-shrink-0">
            {data.profilePictureUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={data.profilePictureUrl} alt="Profile" className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full flex items-center justify-center text-on-surface-variant font-medium">
                No Photo
              </div>
            )}
          </div>
          <div className="flex-1 text-center md:text-left">
            <h2 className="text-xl font-bold text-on-surface font-plus-jakarta">{data.fullName || 'Not provided'}</h2>
            <p className="text-primary font-medium font-manrope">{data.professionalTitle || 'No title'}</p>
            <p className="text-sm text-on-surface-variant font-manrope mt-1">{data.specialization}</p>
          </div>
        </div>

        {/* Credentials Review */}
        <div className="bg-surface-white rounded-xl p-4 border border-outline-variant/50 shadow-sm">
          <h3 className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2 font-plus-jakarta">Credentials</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm font-manrope text-on-surface">
            <p><span className="text-on-surface-variant">PRC License:</span> {data.prcLicenseNo || 'Not provided'}</p>
            <p><span className="text-on-surface-variant">Expiry:</span> {data.prcLicenseExpiry || 'Not provided'}</p>
            {data.ptrNo && <p><span className="text-on-surface-variant">PTR No:</span> {data.ptrNo}</p>}
            {(data.region || data.city) && (
              <p><span className="text-on-surface-variant">Location:</span> {[data.city, data.region].filter(Boolean).join(', ')}</p>
            )}
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-surface-white rounded-xl p-4 border border-outline-variant/50 shadow-sm">
            <h3 className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2 font-plus-jakarta">Experience</h3>
            <p className="text-on-surface font-manrope">{data.yearsOfExperience ? `${data.yearsOfExperience} Years` : 'Not specified'}</p>
          </div>
          <div className="bg-surface-white rounded-xl p-4 border border-outline-variant/50 shadow-sm">
            <h3 className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2 font-plus-jakarta">Consultation Fee</h3>
            <p className="text-on-surface font-manrope font-medium">
              {data.consultationFee ? `₱${data.consultationFee.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : 'Not specified'}
            </p>
          </div>
        </div>

        <div className="bg-surface-white rounded-xl p-4 border border-outline-variant/50 shadow-sm">
          <h3 className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2 font-plus-jakarta">Professional Bio</h3>
          <p className="text-on-surface text-sm font-manrope leading-relaxed whitespace-pre-wrap italic">
            &ldquo;{data.bio || 'No bio provided'}&rdquo;
          </p>
        </div>

        <div className="bg-surface-white rounded-xl p-4 border border-outline-variant/50 shadow-sm">
          <h3 className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2 font-plus-jakarta">Focus Areas</h3>
          <p className="text-on-surface text-sm font-manrope">
            {data.consultationFocusAreas || 'No focus areas specified'}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-surface-white rounded-xl p-4 border border-outline-variant/50 shadow-sm">
            <h3 className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2 font-plus-jakarta">Languages</h3>
            <p className="text-on-surface text-sm font-manrope">{data.languagesSpoken || 'Not specified'}</p>
          </div>
          <div className="bg-surface-white rounded-xl p-4 border border-outline-variant/50 shadow-sm">
            <h3 className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2 font-plus-jakarta">Availability</h3>
            <p className="text-on-surface text-sm font-manrope">{data.availabilitySummary || 'Not specified'}</p>
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center pt-4">
        <Button 
          variant="ghost" 
          onClick={() => router.push('/onboarding/doctor/4')}
          disabled={isSubmitting}
          className="text-on-surface-variant hover:text-primary"
        >
          ← Edit Details
        </Button>
        <Button 
          onClick={handleSubmit} 
          disabled={isSubmitting}
          className="rounded-full px-8 py-6 text-base font-semibold shadow-lg hover:shadow-xl transition-all bg-primary text-white"
        >
          {isSubmitting ? (
            <span className="flex items-center gap-2">
              <Spinner className="h-4 w-4" /> Completing...
            </span>
          ) : (
            'Complete Registration'
          )}
        </Button>
      </div>

      {toast && (
        <Toast 
          message={toast.message} 
          variant={toast.variant} 
          onDismiss={() => setToast(null)} 
        />
      )}
    </div>
  );
}
