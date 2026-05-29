// frontend/src/app/onboarding/6/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { apiRequest, apiUpload, ApiError } from '@/lib/api-client';
import { useOnboarding } from '@/context/onboarding-context';
import { Toast } from '@/components/ui/toast';
import { PhoneInput } from '@/components/ui/phone-input';
import { cn } from '@/lib/utils';
import { formatPhone, formatPhilHealth, formatHmoCard, isValidPhilHealth, isValidHmoCard } from '@/lib/format';
import { EditableRow, editInputClass } from '@/components/ui/editable-row';
import { DatePicker } from '@/components/ui/date-picker';
import { localTodayISO } from '@/lib/schemas/onboarding.schemas';
import { OnboardingShell } from '@/components/ui/onboarding-shell';
import { OnboardingNav } from '@/components/ui/onboarding-nav';
import { ReviewIdCard, ReviewErrorAlert } from '@/components/ui/review-id-card';
import type { CreatePatientProfileBody, UpdateMedicalHistoryBody } from '@/types/patient';

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown'];
const SMOKING_OPTIONS = [
  { value: '', label: 'Prefer not to say' },
  { value: 'Never', label: 'Never' },
  { value: 'Former', label: 'Former' },
  { value: 'Current', label: 'Current' },
];

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const toList = (s: string) => s.split(',').map((x) => x.trim()).filter(Boolean);
// Empty input means "not provided" — return undefined so a blank field never
// clobbers existing data on the 409-retry path.
const optList = (s: string) => {
  const list = toList(s);
  return list.length ? list : undefined;
};

export default function OnboardingStep6() {
  const router = useRouter();
  const { data: session } = useSession();
  const { data, update, reset } = useOnboarding();
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);

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

  const hasLocationInsurance =
    !!(data.address || data.city || data.region || data.philhealthId || data.hmoProvider || data.hmoCardNo);
  const hasMedical =
    !!(data.bloodType || data.allergies || data.chronicConditions || data.currentMedications ||
       data.pastSurgeries || data.familyHistory || data.smokingStatus);

  const handleSubmit = async () => {
    setServerError(null);
    setSubmitting(true);

    const token = session?.user?.accessToken;
    if (!token) {
      setServerError('Session expired. Please log in again.');
      setSubmitting(false);
      return;
    }

    const profileBody: CreatePatientProfileBody = {
      fullName: data.fullName,
      birthdate: data.birthdate,
      contactDetails: data.contactDetails,
      weight: data.weightKg ?? undefined,
      height: data.heightCm ?? undefined,
      profilePictureUrl: data.profilePictureUrl ?? undefined,
      address: data.address || undefined,
      city: data.city || undefined,
      region: data.region || undefined,
      philhealthId: data.philhealthId || undefined,
      hmoProvider: data.hmoProvider || undefined,
      hmoCardNo: data.hmoCardNo || undefined,
    };

    const medicalBody: UpdateMedicalHistoryBody = {
      bloodType: data.bloodType || undefined,
      allergies: optList(data.allergies),
      chronicConditions: optList(data.chronicConditions),
      currentMedications: optList(data.currentMedications),
      pastSurgeries: data.pastSurgeries || undefined,
      familyHistory: data.familyHistory || undefined,
      smokingStatus: data.smokingStatus || undefined,
    };

    try {
      // 1) Create (or update) the profile. Must succeed before medical history,
      //    since PATCH /patients/medical-history requires an existing profile.
      try {
        await apiRequest('/patients/profile', { method: 'POST', body: profileBody, token });
      } catch (err) {
        if (err instanceof ApiError && err.status === 409) {
          await apiRequest('/patients/profile', { method: 'PATCH', body: profileBody, token });
        } else {
          throw err;
        }
      }

      // 2) Then upsert structured medical history (idempotent). Skip entirely
      //    when no medical fields were provided — avoids a wasteful no-op call.
      if (hasMedical) {
        await apiRequest('/patients/medical-history', { method: 'PATCH', body: medicalBody, token });
      }

      setShowToast(true);
      // Clear context only as we navigate away — resetting now would blank the
      // ID-card fields during the 1.8s toast window.
      setTimeout(() => {
        reset();
        router.push('/dashboard');
      }, 1800);
    } catch {
      setServerError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <OnboardingShell
        step={6}
        totalSteps={6}
        title="One last check"
        subtitle="Tap EDIT on any field to fix it right here."
        card={false}
      >
        <ReviewIdCard
          idLabel="Digital Patient ID"
          name={data.fullName}
          photoUrl={data.profilePictureUrl}
          uploadingPhoto={uploadingPhoto}
          photoError={photoError}
          onPhotoFile={handlePhotoFile}
        >
          <EditableRow
            label="Full Name"
            display={data.fullName}
            initial={{ fullName: data.fullName }}
            onSave={update}
            render={(d, set) => (
              <input className={editInputClass} value={d.fullName} onChange={(e) => set('fullName', e.target.value)} />
            )}
          />
          <EditableRow
            label="Date of Birth"
            display={data.birthdate}
            initial={{ birthdate: data.birthdate }}
            onSave={update}
            render={(d, set) => (
              <DatePicker value={d.birthdate} onChange={(v) => set('birthdate', v)} maxDate={localTodayISO()} />
            )}
          />
          <EditableRow
            label="Contact Info"
            display={formatPhone(data.contactDetails)}
            initial={{ contactDetails: data.contactDetails }}
            onSave={update}
            render={(d, set) => (
              <PhoneInput
                value={formatPhone(d.contactDetails)}
                onChange={(e) => set('contactDetails', e.target.value.replace(/\D/g, '').replace(/^0/, '').slice(0, 10))}
              />
            )}
          />
          <EditableRow
            label="Metrics"
            display={`${data.weightKg ? data.weightKg + 'kg' : '—'} / ${data.heightCm ? data.heightCm + 'cm' : '—'}`}
            initial={{ weightKg: data.weightKg, heightCm: data.heightCm }}
            onSave={update}
            render={(d, set) => (
              <div className="flex gap-2">
                <input type="number" min="0" step="0.1" placeholder="kg" className={editInputClass}
                  value={d.weightKg ?? ''} onChange={(e) => set('weightKg', e.target.value === '' ? null : parseFloat(e.target.value))} />
                <input type="number" min="0" step="0.1" placeholder="cm" className={editInputClass}
                  value={d.heightCm ?? ''} onChange={(e) => set('heightCm', e.target.value === '' ? null : parseFloat(e.target.value))} />
              </div>
            )}
          />

          {hasLocationInsurance && (
            <>
              <div className="col-span-full h-px bg-outline-variant/30" />
              <EditableRow
                fullWidth
                label="Location"
                display={[data.address, data.city, data.region].filter(Boolean).join(', ')}
                initial={{ address: data.address, city: data.city, region: data.region }}
                onSave={update}
                render={(d, set) => (
                  <div className="flex flex-col gap-2">
                    <input className={editInputClass} placeholder="Address" value={d.address} onChange={(e) => set('address', e.target.value)} />
                    <div className="flex gap-2">
                      <input className={editInputClass} placeholder="City" value={d.city} onChange={(e) => set('city', e.target.value)} />
                      <input className={editInputClass} placeholder="Region" value={d.region} onChange={(e) => set('region', e.target.value)} />
                    </div>
                  </div>
                )}
              />
              <EditableRow
                label="PhilHealth ID"
                display={data.philhealthId}
                initial={{ philhealthId: data.philhealthId }}
                onSave={update}
                validate={(d) => (isValidPhilHealth(d.philhealthId ?? '') ? null : "Can't save — enter the full 12-digit PhilHealth ID")}
                render={(d, set) => (
                  <input className={editInputClass} inputMode="numeric" value={d.philhealthId}
                    onChange={(e) => set('philhealthId', formatPhilHealth(e.target.value))} />
                )}
              />
              <EditableRow
                label="HMO"
                display={[data.hmoProvider, data.hmoCardNo].filter(Boolean).join(' · ')}
                initial={{ hmoProvider: data.hmoProvider, hmoCardNo: data.hmoCardNo }}
                onSave={update}
                validate={(d) => (isValidHmoCard(d.hmoCardNo ?? '') ? null : "Can't save — enter the full 12-character HMO card number")}
                render={(d, set) => (
                  <div className="flex gap-2">
                    <input className={editInputClass} placeholder="Provider" value={d.hmoProvider} onChange={(e) => set('hmoProvider', e.target.value)} />
                    <input className={editInputClass} placeholder="Card no." value={d.hmoCardNo} onChange={(e) => set('hmoCardNo', formatHmoCard(e.target.value))} />
                  </div>
                )}
              />
            </>
          )}

          {hasMedical && (
            <>
              <div className="col-span-full h-px bg-outline-variant/30" />
              <EditableRow
                label="Blood Type"
                display={data.bloodType}
                initial={{ bloodType: data.bloodType }}
                onSave={update}
                render={(d, set) => (
                  <select className={editInputClass} value={d.bloodType} onChange={(e) => set('bloodType', e.target.value)}>
                    <option value="">Select…</option>
                    {BLOOD_TYPES.map((bt) => <option key={bt} value={bt}>{bt}</option>)}
                  </select>
                )}
              />
              <EditableRow
                label="Smoking"
                display={data.smokingStatus}
                initial={{ smokingStatus: data.smokingStatus }}
                onSave={update}
                render={(d, set) => (
                  <select className={editInputClass} value={d.smokingStatus} onChange={(e) => set('smokingStatus', e.target.value)}>
                    {SMOKING_OPTIONS.map((o) => <option key={o.label} value={o.value}>{o.label}</option>)}
                  </select>
                )}
              />
              <EditableRow
                fullWidth
                label="Allergies"
                display={data.allergies}
                initial={{ allergies: data.allergies }}
                onSave={update}
                render={(d, set) => (
                  <input className={editInputClass} placeholder="Comma-separated" value={d.allergies} onChange={(e) => set('allergies', e.target.value)} />
                )}
              />
              <EditableRow
                fullWidth
                label="Chronic Conditions"
                display={data.chronicConditions}
                initial={{ chronicConditions: data.chronicConditions }}
                onSave={update}
                render={(d, set) => (
                  <input className={editInputClass} placeholder="Comma-separated" value={d.chronicConditions} onChange={(e) => set('chronicConditions', e.target.value)} />
                )}
              />
              <EditableRow
                fullWidth
                label="Current Medications"
                display={data.currentMedications}
                initial={{ currentMedications: data.currentMedications }}
                onSave={update}
                render={(d, set) => (
                  <input className={editInputClass} placeholder="Comma-separated" value={d.currentMedications} onChange={(e) => set('currentMedications', e.target.value)} />
                )}
              />
              {data.pastSurgeries && (
                <EditableRow
                  fullWidth
                  label="Past Surgeries"
                  display={data.pastSurgeries}
                  initial={{ pastSurgeries: data.pastSurgeries }}
                  onSave={update}
                  render={(d, set) => (
                    <textarea className={cn(editInputClass, 'resize-y min-h-[60px]')} value={d.pastSurgeries} onChange={(e) => set('pastSurgeries', e.target.value)} />
                  )}
                />
              )}
              {data.familyHistory && (
                <EditableRow
                  fullWidth
                  label="Family History"
                  display={data.familyHistory}
                  initial={{ familyHistory: data.familyHistory }}
                  onSave={update}
                  render={(d, set) => (
                    <textarea className={cn(editInputClass, 'resize-y min-h-[60px]')} value={d.familyHistory} onChange={(e) => set('familyHistory', e.target.value)} />
                  )}
                />
              )}
            </>
          )}
        </ReviewIdCard>

        {serverError && <ReviewErrorAlert message={serverError} onRetry={handleSubmit} />}

        <OnboardingNav
          onBack={() => router.push('/onboarding/5')}
          submitType="button"
          onSubmit={handleSubmit}
          loading={submitting}
          submitLabel="Generate ID Card ✓"
        />
      </OnboardingShell>
      {showToast && <Toast message="Profile verified! Redirecting to dashboard..." variant="success" />}
    </>
  );
}
