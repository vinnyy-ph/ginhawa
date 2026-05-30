'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useDoctorOnboarding } from '@/context/doctor-onboarding-context';
import { apiRequest, apiUpload, ApiError } from '@/lib/api-client';
import { Toast } from '@/components/ui/toast';
import { EditableRow, editInputClass } from '@/components/ui/editable-row';
import { DatePicker } from '@/components/ui/date-picker';
import { useSpecializations } from '@/hooks/use-specializations';
import { formatPrc, formatPtr, isValidPrc, isValidPtr } from '@/lib/format';
import { OnboardingNav } from '@/components/ui/onboarding-nav';
import { ReviewIdCard, ReviewErrorAlert } from '@/components/ui/review-id-card';
import type { OnboardingNav as OnboardingNavType } from '@/components/onboarding/steps/types';

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export function ReviewStep({ nav }: { nav: OnboardingNavType }) {
  const router = useRouter();
  const { data: session } = useSession();
  const { data, update } = useDoctorOnboarding();
  const { specializations } = useSpecializations();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<{ message: string; variant: 'error' | 'success' } | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  const specOptions = data.specialization && !specializations.includes(data.specialization)
    ? [data.specialization, ...specializations]
    : specializations;

  const handlePhotoFile = async (file: File) => {
    setPhotoError(null);
    if (!ALLOWED_TYPES.includes(file.type)) {
      setPhotoError('Please upload a JPEG, PNG, or WebP image.');
      return;
    }
    if (file.size > MAX_BYTES) {
      setPhotoError('Image must be under 5MB.');
      return;
    }
    const token = session?.user?.accessToken;
    if (!token) {
      setPhotoError('Session expired. Please log in again.');
      return;
    }
    setUploadingPhoto(true);
    try {
      const { url } = await apiUpload<{ url: string }>('/uploads/profile-picture', 'file', file, token);
      update({ profilePictureUrl: url });
    } catch (err) {
      setPhotoError(err instanceof ApiError ? (err.message ?? 'Upload failed. Please try again.') : 'Something went wrong. Please try again.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSubmit = async () => {
    setServerError(null);

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
          prcLicenseExpiry: data.prcLicenseExpiry || undefined,
          languagesSpoken: data.languagesSpoken
            ? data.languagesSpoken.split(',').map((s: string) => s.trim()).filter(Boolean)
            : [],
        },
        token: session.user.accessToken as string,
      });

      if (response.profileComplete) {
        setToast({ message: 'Profile completed successfully!', variant: 'success' });
        setTimeout(() => {
          router.push('/doctor/dashboard');
        }, 1500);
      }
    } catch (error) {
      console.error('Failed to save profile', error);
      setServerError('Failed to save profile. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <>
        <ReviewIdCard
          idLabel="Verified Provider"
          name={data.fullName}
          subtitle={[data.professionalTitle, data.specialization].filter(Boolean).join(' · ')}
          photoUrl={data.profilePictureUrl}
          uploadingPhoto={uploadingPhoto}
          photoError={photoError}
          onPhotoFile={handlePhotoFile}
        >
          <EditableRow label="Full Name" display={data.fullName} initial={{ fullName: data.fullName }} onSave={update}
            render={(d, set) => <input className={editInputClass} value={d.fullName} onChange={(e) => set('fullName', e.target.value)} />} />
          <EditableRow label="Professional Title" display={data.professionalTitle} initial={{ professionalTitle: data.professionalTitle }} onSave={update}
            render={(d, set) => <input className={editInputClass} value={d.professionalTitle} onChange={(e) => set('professionalTitle', e.target.value)} />} />

          <EditableRow label="Specialization" display={data.specialization} initial={{ specialization: data.specialization }} onSave={update}
            render={(d, set) => (
              <select className={editInputClass} value={d.specialization} onChange={(e) => set('specialization', e.target.value)}>
                <option value="" disabled>Select…</option>
                {specOptions.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            )} />
          <EditableRow label="Years of Experience" display={data.yearsOfExperience ? `${data.yearsOfExperience} years` : ''} initial={{ yearsOfExperience: data.yearsOfExperience }} onSave={update}
            render={(d, set) => (
              <input type="number" min="0" className={editInputClass} value={d.yearsOfExperience ?? ''}
                onChange={(e) => set('yearsOfExperience', e.target.value === '' ? null : parseInt(e.target.value, 10))} />
            )} />

          <EditableRow label="PRC License" display={data.prcLicenseNo} initial={{ prcLicenseNo: data.prcLicenseNo }} onSave={update}
            validate={(d) => (isValidPrc(d.prcLicenseNo) ? null : "Can't save — PRC license number must be 7 digits")}
            render={(d, set) => <input className={editInputClass} inputMode="numeric" value={d.prcLicenseNo} onChange={(e) => set('prcLicenseNo', formatPrc(e.target.value))} />} />
          <EditableRow label="PRC Expiry" display={data.prcLicenseExpiry} initial={{ prcLicenseExpiry: data.prcLicenseExpiry }} onSave={update}
            render={(d, set) => <DatePicker value={d.prcLicenseExpiry} onChange={(v) => set('prcLicenseExpiry', v)} />} />

          <EditableRow label="PTR No." display={data.ptrNo} initial={{ ptrNo: data.ptrNo }} onSave={update}
            validate={(d) => (isValidPtr(d.ptrNo) ? null : "Can't save — PTR number must be 7–8 digits")}
            render={(d, set) => <input className={editInputClass} inputMode="numeric" value={d.ptrNo} onChange={(e) => set('ptrNo', formatPtr(e.target.value))} />} />
          <EditableRow label="Consultation Fee" display={data.consultationFee ? `₱${data.consultationFee.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : ''} initial={{ consultationFee: data.consultationFee }} onSave={update}
            render={(d, set) => (
              <input type="number" min="0" step="0.01" className={editInputClass} value={d.consultationFee ?? ''}
                onChange={(e) => set('consultationFee', e.target.value === '' ? null : parseFloat(e.target.value))} />
            )} />

          <EditableRow label="Region" display={data.region} initial={{ region: data.region }} onSave={update}
            render={(d, set) => <input className={editInputClass} value={d.region} onChange={(e) => set('region', e.target.value)} />} />
          <EditableRow label="City" display={data.city} initial={{ city: data.city }} onSave={update}
            render={(d, set) => <input className={editInputClass} value={d.city} onChange={(e) => set('city', e.target.value)} />} />

          <EditableRow fullWidth label="Languages" display={data.languagesSpoken} initial={{ languagesSpoken: data.languagesSpoken }} onSave={update}
            render={(d, set) => <input className={editInputClass} placeholder="Comma-separated" value={d.languagesSpoken} onChange={(e) => set('languagesSpoken', e.target.value)} />} />
          <EditableRow fullWidth label="Focus Areas" display={data.consultationFocusAreas} initial={{ consultationFocusAreas: data.consultationFocusAreas }} onSave={update}
            render={(d, set) => <input className={editInputClass} placeholder="Comma-separated" value={d.consultationFocusAreas} onChange={(e) => set('consultationFocusAreas', e.target.value)} />} />
          <EditableRow fullWidth label="Availability" display={data.availabilitySummary} initial={{ availabilitySummary: data.availabilitySummary }} onSave={update}
            render={(d, set) => <input className={editInputClass} value={d.availabilitySummary} onChange={(e) => set('availabilitySummary', e.target.value)} />} />
          <EditableRow fullWidth label="Professional Bio" display={data.bio} initial={{ bio: data.bio }} onSave={update}
            render={(d, set) => <textarea className={`${editInputClass} resize-y min-h-[80px]`} value={d.bio} onChange={(e) => set('bio', e.target.value)} />} />
        </ReviewIdCard>

        {serverError && <ReviewErrorAlert message={serverError} onRetry={handleSubmit} />}

        <OnboardingNav
          onBack={() => nav.goBack()}
          submitType="button"
          onSubmit={handleSubmit}
          loading={isSubmitting}
          loadingLabel="Completing…"
          submitLabel="Complete Registration"
        />
      {toast && <Toast message={toast.message} variant={toast.variant} onDismiss={() => setToast(null)} />}
    </>
  );
}
