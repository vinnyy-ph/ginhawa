// frontend/src/app/onboarding/6/page.tsx
'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { apiRequest, apiUpload, ApiError } from '@/lib/api-client';
import { useOnboarding } from '@/context/onboarding-context';
import { ProgressIndicator } from '@/components/ui/progress-indicator';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Toast } from '@/components/ui/toast';
import { PhoneInput } from '@/components/ui/phone-input';
import { cn } from '@/lib/utils';
import { formatPhone, formatPhilHealth, formatHmoCard, isValidPhilHealth, isValidHmoCard } from '@/lib/format';
import { EditableRow, editInputClass } from '@/components/ui/editable-row';
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
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);

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

      reset();
      setShowToast(true);
      setTimeout(() => router.push('/dashboard'), 1800);
    } catch {
      setServerError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <ProgressIndicator currentStep={6} totalSteps={6} />

      <div className="text-center">
        <h1 className="text-3xl font-bold text-text-primary font-plus-jakarta tracking-tight">One last check</h1>
        <p className="mt-2 text-on-surface-variant font-manrope">Tap EDIT on any field to fix it right here.</p>
      </div>

      <div className="bg-surface-white rounded-3xl border border-outline-variant/30 shadow-lifted overflow-hidden transition-all duration-300 hover:shadow-hover">
        <div className="bg-gradient-to-br from-primary to-primary-container p-8 text-white relative overflow-hidden">
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
              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                disabled={uploadingPhoto}
                className="absolute -bottom-2 -right-2 bg-white text-primary p-2 rounded-xl shadow-lg hover:scale-110 transition-transform disabled:opacity-60 disabled:hover:scale-100"
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
            <div className="flex flex-col">
              <span className="text-[10px] font-bold tracking-[0.2em] text-white/70 uppercase font-plus-jakarta mb-1">Digital Patient ID</span>
              <h2 className="text-2xl font-bold font-plus-jakarta tracking-tight leading-tight">{data.fullName || '—'}</h2>
              <div className="flex items-center gap-2 mt-2">
                <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
                <span className="text-xs font-medium text-white/80">Profile Complete</span>
              </div>
              {photoError && <span role="alert" className="text-xs font-medium text-white/90 mt-1">{photoError}</span>}
            </div>
          </div>
        </div>

        <div className="p-8 grid grid-cols-2 gap-x-8 gap-y-8">
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
              <input type="date" className={editInputClass} value={d.birthdate} onChange={(e) => set('birthdate', e.target.value)} />
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
              <div className="col-span-2 h-px bg-outline-variant/30" />
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
              <div className="col-span-2 h-px bg-outline-variant/30" />
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
        <Button id="ob6-back" type="button" variant="outline" size="lg" className="flex-1 h-14 rounded-2xl font-bold" onClick={() => router.push('/onboarding/5')} disabled={submitting}>
          Back
        </Button>
        <Button id="ob6-complete" type="button" size="lg" className="flex-[2] h-14 rounded-2xl font-bold shadow-lifted hover:shadow-hover transition-all" disabled={submitting} onClick={handleSubmit}>
          {submitting ? (
            <span className="flex items-center gap-2"><Spinner className="w-5 h-5" /> Processing…</span>
          ) : (
            'Generate ID Card ✓'
          )}
        </Button>
      </div>

      {showToast && <Toast message="Profile verified! Redirecting to dashboard..." variant="success" />}
    </div>
  );
}
