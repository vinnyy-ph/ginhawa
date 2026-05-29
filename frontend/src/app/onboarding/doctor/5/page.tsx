'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useDoctorOnboarding } from '@/context/doctor-onboarding-context';
import { apiRequest, apiUpload, ApiError } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { ProgressIndicator } from '@/components/ui/progress-indicator';
import { Spinner } from '@/components/ui/spinner';
import { Toast } from '@/components/ui/toast';
import { EditableRow, editInputClass } from '@/components/ui/editable-row';
import { useSpecializations } from '@/hooks/use-specializations';
import { formatPrc, formatPtr, isValidPrc, isValidPtr } from '@/lib/format';

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export default function DoctorOnboardingStep5() {
  const router = useRouter();
  const { data: session } = useSession();
  const { data, update } = useDoctorOnboarding();
  const { specializations } = useSpecializations();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<{ message: string; variant: 'error' | 'success' } | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);

  const specOptions = data.specialization && !specializations.includes(data.specialization)
    ? [data.specialization, ...specializations]
    : specializations;

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhotoError(null);
    const file = e.target.files?.[0];
    if (!file) return;
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
          Tap EDIT on any field to fix it right here.
        </p>
      </div>

      <div className="flex flex-col gap-6 overflow-y-auto max-h-[60vh] pr-2 custom-scrollbar">
        {/* Profile header with inline photo upload */}
        <div className="bg-surface-container rounded-2xl p-6 flex flex-col md:flex-row items-center gap-6 border border-outline-variant/50">
          <div className="relative flex-shrink-0">
            <div className="h-24 w-24 rounded-full bg-surface-container-high border-2 border-primary/20 overflow-hidden">
              {data.profilePictureUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={data.profilePictureUrl} alt="Profile" className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full flex items-center justify-center text-on-surface-variant font-medium">
                  No Photo
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => photoInputRef.current?.click()}
              disabled={uploadingPhoto}
              className="absolute -bottom-1 -right-1 bg-white text-primary p-2 rounded-xl shadow-lg hover:scale-110 transition-transform disabled:opacity-60 disabled:hover:scale-100"
              aria-label="Change photo"
            >
              {uploadingPhoto ? (
                <Spinner className="w-4 h-4" />
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                </svg>
              )}
            </button>
            <input
              ref={photoInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              aria-label="Upload profile picture"
              onChange={handlePhotoChange}
            />
          </div>
          <div className="flex-1 text-center md:text-left">
            <h2 className="text-xl font-bold text-on-surface font-plus-jakarta">{data.fullName || 'Not provided'}</h2>
            <p className="text-primary font-medium font-manrope">{data.professionalTitle || 'No title'}</p>
            <p className="text-sm text-on-surface-variant font-manrope mt-1">{data.specialization || '—'}</p>
            {photoError && <p role="alert" className="text-xs text-error font-manrope mt-1">{photoError}</p>}
          </div>
        </div>

        {/* Inline-editable fields */}
        <div className="bg-surface-white rounded-2xl p-6 border border-outline-variant/50 shadow-sm grid grid-cols-2 gap-x-8 gap-y-6">
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
            render={(d, set) => <input type="date" className={editInputClass} value={d.prcLicenseExpiry} onChange={(e) => set('prcLicenseExpiry', e.target.value)} />} />

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
        </div>
      </div>

      <div className="flex justify-between items-center pt-4">
        <Button variant="ghost" onClick={() => router.push('/onboarding/doctor/4')} disabled={isSubmitting} className="text-on-surface-variant hover:text-primary">
          ← Back
        </Button>
        <Button onClick={handleSubmit} disabled={isSubmitting} className="rounded-full px-8 py-6 text-base font-semibold shadow-lg hover:shadow-xl transition-all bg-primary text-white">
          {isSubmitting ? (
            <span className="flex items-center gap-2"><Spinner className="h-4 w-4" /> Completing...</span>
          ) : (
            'Complete Registration'
          )}
        </Button>
      </div>

      {toast && <Toast message={toast.message} variant={toast.variant} onDismiss={() => setToast(null)} />}
    </div>
  );
}
