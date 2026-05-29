'use client';

import { useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { apiUpload, ApiError } from '@/lib/api-client';
import { Button } from '@/components/ui/button';

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/** Avatar preview + "Change photo" button; uploads immediately on select. */
export function ProfilePhotoField({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (url: string) => void;
}) {
  const { data: session } = useSession();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(value);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = e.target.files?.[0];
    if (!file) return;
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('Please upload a JPEG, PNG, or WebP image.');
      return;
    }
    if (file.size > MAX_BYTES) {
      setError('Image must be under 5MB.');
      return;
    }
    const token = session?.user?.accessToken;
    if (!token) {
      setError('Session expired. Please log in again.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
    setUploading(true);
    try {
      const { url } = await apiUpload<{ url: string }>(
        '/uploads/profile-picture',
        'file',
        file,
        token,
      );
      onChange(url);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? (err.message ?? 'Upload failed. Please try again.')
          : 'Something went wrong. Please try again.',
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex items-center gap-4">
      <div className="h-20 w-20 rounded-full bg-surface-container border border-outline-variant overflow-hidden flex items-center justify-center shrink-0">
        {preview ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={preview} alt="Profile" className="h-full w-full object-cover" />
        ) : (
          <svg
            className="h-8 w-8 text-outline"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.5 19.5a7.5 7.5 0 0 1 15 0v.75H4.5v-.75Z"
            />
          </svg>
        )}
      </div>
      <div className="flex flex-col gap-1.5">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? 'Uploading…' : 'Change photo'}
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          aria-label="Upload profile picture"
          onChange={handleChange}
        />
        {error && (
          <p role="alert" className="text-xs text-error font-manrope">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
