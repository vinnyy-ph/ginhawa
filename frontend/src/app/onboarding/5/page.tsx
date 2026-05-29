// frontend/src/app/onboarding/5/page.tsx
'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { apiUpload, ApiError } from '@/lib/api-client';
import { useOnboarding } from '@/context/onboarding-context';
import { OnboardingShell } from '@/components/ui/onboarding-shell';
import { OnboardingNav } from '@/components/ui/onboarding-nav';
import { Button } from '@/components/ui/button';

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export default function OnboardingStep5() {
  const router = useRouter();
  const { data: session } = useSession();
  const { data, update } = useOnboarding();
  const inputRef = useRef<HTMLInputElement>(null);

  const [preview, setPreview] = useState<string | null>(data.profilePictureUrl ?? null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileError(null);
    setServerError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      setFileError('Please upload a JPEG, PNG, or WebP image.');
      return;
    }
    if (file.size > MAX_BYTES) {
      setFileError('Image must be under 5MB.');
      return;
    }

    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleUploadAndContinue = async () => {
    setServerError(null);

    if (!selectedFile) {
      if (data.profilePictureUrl) {
        router.push('/onboarding/6');
        return;
      }

      setServerError('Please upload a profile picture to continue.');
      return;
    }

    setUploading(true);

    const token = session?.user?.accessToken;
    if (!token) {
      setServerError('Session expired. Please log in again.');
      setUploading(false);
      return;
    }

    try {
      const { url } = await apiUpload<{ url: string }>('/uploads/profile-picture', 'file', selectedFile, token);
      update({ profilePictureUrl: url });
      router.push('/onboarding/6');
    } catch (err) {
      if (err instanceof ApiError) {
        setServerError(err.message ?? 'Upload failed. Please try again.');
      } else {
        setServerError('Something went wrong. Please try again.');
      }
    } finally {
      setUploading(false);
    }
  };

  return (
    <OnboardingShell step={5} totalSteps={6} title="Profile Picture" subtitle="Add a photo so doctors can recognise you.">
      <div className="flex flex-col items-center gap-5">
        <div
          className="h-32 w-32 rounded-full bg-surface-container border-2 border-dashed border-outline-variant overflow-hidden flex items-center justify-center cursor-pointer hover:border-primary transition-colors"
          onClick={() => inputRef.current?.click()}
          role="button"
          tabIndex={0}
          aria-label="Choose profile picture"
          onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
        >
          {preview ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={preview} alt="Preview" className="h-full w-full object-cover" />
          ) : (
            <div className="flex flex-col items-center gap-1 text-outline">
              <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0 3 3m-3-3-3 3M6.75 19.5a4.5 4.5 0 0 1-1.41-8.775 5.25 5.25 0 0 1 10.233-2.33 3 3 0 0 1 3.758 3.848A3.752 3.752 0 0 1 18 19.5H6.75Z" />
              </svg>
              <span className="text-xs font-manrope">Click to upload</span>
            </div>
          )}
        </div>

        <input
          ref={inputRef}
          id="ob5-file-input"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          aria-label="Upload profile picture"
          onChange={handleFileChange}
        />

        {preview && (
          <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
            Change photo
          </Button>
        )}

        {fileError && (
          <p role="alert" className="flex items-center gap-1 text-xs text-error font-manrope">
            <svg aria-hidden="true" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {fileError}
          </p>
        )}

        {serverError && (
          <p role="alert" className="text-xs text-error font-manrope">{serverError}</p>
        )}
      </div>

      <OnboardingNav
        onBack={() => router.push('/onboarding/4')}
        submitType="button"
        onSubmit={handleUploadAndContinue}
        loading={uploading}
        loadingLabel="Uploading…"
        submitLabel={selectedFile ? 'Upload & Continue →' : 'Continue →'}
        disabled={!selectedFile && !data.profilePictureUrl}
      />
    </OnboardingShell>
  );
}
