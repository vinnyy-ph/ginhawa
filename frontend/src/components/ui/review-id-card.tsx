// frontend/src/components/ui/review-id-card.tsx
'use client';

import * as React from 'react';
import { useRef, useState } from 'react';
import { Spinner } from './spinner';
import { Button } from './button';
import { CameraCapture } from './camera-capture';

/**
 * Shared premium "ID card" header for review steps (patient + doctor).
 * Teal gradient hero with avatar + inline photo upload, name, subtitle, and
 * a status pulse; followed by a responsive grid of EditableRow children.
 */
export function ReviewIdCard({
  idLabel,
  name,
  subtitle,
  photoUrl,
  uploadingPhoto,
  photoError,
  onPhotoFile,
  statusLabel = 'Profile Complete',
  children,
}: {
  idLabel: string;
  name: string;
  subtitle?: string;
  photoUrl?: string | null;
  uploadingPhoto: boolean;
  photoError?: string | null;
  onPhotoFile: (file: File) => void;
  statusLabel?: string;
  children: React.ReactNode;
}) {
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [cameraOpen, setCameraOpen] = useState(false);

  return (
    <div className="bg-surface-white rounded-lg shadow-lifted overflow-hidden">
      <div className="bg-gradient-to-br from-primary to-primary-container p-6 sm:p-8 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex items-center gap-6 relative z-10">
          <div className="relative shrink-0">
            <div className="h-24 w-24 rounded-2xl bg-white/20 backdrop-blur-md border-2 border-white/30 overflow-hidden flex items-center justify-center shadow-inner">
              {photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photoUrl} alt={name} className="h-full w-full object-cover" />
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
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onPhotoFile(file);
              }}
            />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[10px] font-bold tracking-[0.2em] text-white/70 uppercase font-plus-jakarta mb-1">
              {idLabel}
            </span>
            <h2 className="text-2xl font-bold font-plus-jakarta tracking-tight leading-tight truncate">
              {name || '—'}
            </h2>
            {subtitle && (
              <p className="text-sm text-white/80 font-manrope mt-0.5 truncate">{subtitle}</p>
            )}
            <div className="flex items-center gap-2 mt-2">
              <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
              <span className="text-xs font-medium text-white/80">{statusLabel}</span>
            </div>
            {photoError && (
              <span role="alert" className="text-xs font-medium text-white/90 mt-1">{photoError}</span>
            )}
            <div className="mt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="bg-white/90 text-primary border-white/0 hover:bg-white"
                onClick={() => setCameraOpen(true)}
              >
                Take photo
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 sm:p-8 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6">
        {children}
      </div>
      <CameraCapture open={cameraOpen} onClose={() => setCameraOpen(false)} onCapture={onPhotoFile} />
    </div>
  );
}

/** Inline error alert with a Retry action, shared by both review steps. */
export function ReviewErrorAlert({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div
      role="alert"
      className="flex items-center gap-3 rounded-lg border border-error/20 bg-error/5 p-4 text-sm text-error font-manrope"
    >
      <svg className="h-5 w-5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
      </svg>
      <span className="flex-1 font-medium">{message}</span>
      <button
        type="button"
        onClick={onRetry}
        className="text-xs font-bold uppercase tracking-wider hover:underline focus:outline-none bg-error text-white px-3 py-1 rounded-lg"
      >
        Retry
      </button>
    </div>
  );
}
