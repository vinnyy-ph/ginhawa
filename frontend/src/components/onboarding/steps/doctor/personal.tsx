'use client';

import { useState, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useDoctorOnboarding } from '@/context/doctor-onboarding-context';
import { FormField } from '@/components/ui/form-field';
import { OnboardingNav } from '@/components/ui/onboarding-nav';
import { Button } from '@/components/ui/button';
import { CameraCapture } from '@/components/ui/camera-capture';
import { onboardingInputClass } from '@/lib/onboarding-styles';
import { apiUpload, ApiError } from '@/lib/api-client';
import type { OnboardingNav as OnboardingNavType } from '@/components/onboarding/steps/types';

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export function PersonalStep({ nav }: { nav: OnboardingNavType }) {
  const { data: session } = useSession();
  const { data, update } = useDoctorOnboarding();
  const inputRef = useRef<HTMLInputElement>(null);

  const [fullName, setFullName] = useState(data.fullName);
  const [professionalTitle, setProfessionalTitle] = useState(data.professionalTitle);
  const [preview, setPreview] = useState<string | null>(data.profilePictureUrl);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);

  const acceptFile = (file: File) => {
    setServerError(null);
    if (!ALLOWED_TYPES.includes(file.type)) {
      setServerError('Please upload a JPEG, PNG, or WebP image.');
      return;
    }
    if (file.size > MAX_BYTES) {
      setServerError('Image must be under 5MB.');
      return;
    }
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) acceptFile(file);
  };

  const handleNext = async () => {
    const newErrors: Record<string, string> = {};
    if (!fullName.trim()) newErrors.fullName = 'Full Name is required';
    if (!professionalTitle.trim()) newErrors.professionalTitle = 'Professional Title is required';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    if (selectedFile) {
      setUploading(true);
      const token = session?.user?.accessToken;
      if (!token) {
        setServerError('Session expired. Please log in again.');
        setUploading(false);
        return;
      }
      try {
        const { url } = await apiUpload<{ url: string }>('/uploads/profile-picture', 'file', selectedFile, token);
        update({ fullName, professionalTitle, profilePictureUrl: url });
        nav.goNext();
      } catch (err) {
         if (err instanceof ApiError) {
          setServerError(err.message ?? 'Upload failed. Please try again.');
        } else {
          setServerError('Something went wrong. Please try again.');
        }
        setUploading(false);
      }
    } else {
      update({ fullName, professionalTitle });
      nav.goNext();
    }
  };

  return (
    <>

      <div className="flex flex-col items-center gap-5 my-4">
        <div
          className="h-32 w-32 rounded-full bg-surface-container border-2 border-dashed border-outline-variant overflow-hidden flex items-center justify-center cursor-pointer hover:border-primary transition-colors focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2 outline-none"
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              inputRef.current?.click();
            }
          }}
          role="button"
          tabIndex={0}
          aria-label="Upload profile picture"
        >
          {preview ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={preview} alt="Preview" className="h-full w-full object-cover" />
          ) : (
            <div className="flex flex-col items-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-outline">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" x2="12" y1="3" y2="15" />
              </svg>
              <span className="text-[10px] uppercase tracking-wider text-outline font-bold">Upload Photo</span>
            </div>
          )}
        </div>
        <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={handleFileChange} />
        <Button type="button" variant="outline" size="sm" onClick={() => setCameraOpen(true)}>
          Take photo
        </Button>
        {serverError && <p className="text-xs text-error font-manrope">{serverError}</p>}
      </div>

      <div className="flex flex-col gap-4">
        <FormField id="fullName" label="Full Name" error={errors.fullName} required>
          <input
            id="fullName"
            value={fullName}
            onChange={e => {
              setFullName(e.target.value);
              if (errors.fullName) setErrors(prev => {
                const n = { ...prev };
                delete n.fullName;
                return n;
              });
            }}
            className={onboardingInputClass}
            placeholder="Dr. Jane Doe"
          />
        </FormField>
        <FormField id="professionalTitle" label="Professional Title" error={errors.professionalTitle} required>
          <input
            id="professionalTitle"
            value={professionalTitle}
            onChange={e => {
              setProfessionalTitle(e.target.value);
              if (errors.professionalTitle) setErrors(prev => {
                const n = { ...prev };
                delete n.professionalTitle;
                return n;
              });
            }}
            className={onboardingInputClass}
            placeholder="MD, FPCP"
          />
        </FormField>
      </div>

      <OnboardingNav submitType="button" onSubmit={handleNext} loading={uploading} loadingLabel="Uploading…" submitLabel="Continue →" />
      <CameraCapture open={cameraOpen} onClose={() => setCameraOpen(false)} onCapture={acceptFile} />
    </>
  );
}
