'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { apiRequest, apiUpload, ApiError } from '@/lib/api-client';
import { useOnboarding } from '@/context/onboarding-context';
import { Toast } from '@/components/ui/toast';
import { OnboardingNav } from '@/components/ui/onboarding-nav';
import { ReviewIdCard, ReviewErrorAlert } from '@/components/ui/review-id-card';
import { ReviewIdentityRows } from '@/components/onboarding/review-identity-rows';
import { ReviewLocationInsuranceRows } from '@/components/onboarding/review-location-insurance-rows';
import { ReviewMedicalRows } from '@/components/onboarding/review-medical-rows';
import type { CreatePatientProfileBody, UpdateMedicalHistoryBody } from '@/types/patient';
import type { OnboardingNav as OnboardingNavType } from '@/components/onboarding/steps/types';

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const toList = (s: string) => s.split(',').map((x) => x.trim()).filter(Boolean);
// Empty input means "not provided" — return undefined so a blank field never
// clobbers existing data on the 409-retry path.
const optList = (s: string) => {
  const list = toList(s);
  return list.length ? list : undefined;
};

export function ReviewStep({ nav }: { nav: OnboardingNavType }) {
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
        router.push('/');
      }, 1800);
    } catch {
      setServerError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <ReviewIdCard
        idLabel="Digital Patient ID"
        name={data.fullName}
        photoUrl={data.profilePictureUrl}
        uploadingPhoto={uploadingPhoto}
        photoError={photoError}
        onPhotoFile={handlePhotoFile}
      >
        <ReviewIdentityRows data={data} update={update} />
        <ReviewLocationInsuranceRows data={data} update={update} />
        <ReviewMedicalRows data={data} update={update} />
      </ReviewIdCard>

      {serverError && <ReviewErrorAlert message={serverError} onRetry={handleSubmit} />}

      <OnboardingNav
        onBack={() => nav.goBack()}
        submitType="button"
        onSubmit={handleSubmit}
        loading={submitting}
        submitLabel="Generate ID Card ✓"
      />
      {showToast && <Toast message="Profile verified! Redirecting to dashboard..." variant="success" />}
    </>
  );
}
