// frontend/src/components/ui/camera-capture.tsx
/**
 * CameraCapture — modal dialog for capturing a photo from the device camera.
 * Manages getUserMedia lifecycle, front/rear camera toggling, and canvas-based
 * JPEG export. Falls back gracefully when camera is unavailable or denied.
 */
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from './button';
import { Spinner } from './spinner';

const MAX_DIM = 1280;

/**
 * Camera capture modal. Opens the device camera via getUserMedia, lets the user
 * flip front/rear and snap a frame, then hands back a JPEG File via onCapture.
 * Degrades gracefully (inline message) when the camera is unavailable or denied.
 */
export function CameraCapture({
  open,
  onClose,
  onCapture,
}: {
  open: boolean;
  onClose: () => void;
  onCapture: (file: File) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const handleClose = useCallback(() => {
    stop();
    onClose();
  }, [stop, onClose]);

  // Acquire the stream when open / facingMode changes.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setError(null);
    setLoading(true);

    const md = typeof navigator !== 'undefined' ? navigator.mediaDevices : undefined;
    if (!md?.getUserMedia) {
      setError('Camera is not available on this device or browser.');
      setLoading(false);
      return;
    }

    md.getUserMedia({ video: { facingMode } })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const name = err instanceof DOMException ? err.name : '';
        setError(
          name === 'NotAllowedError'
            ? 'Camera permission denied. Allow access or upload a file instead.'
            : 'Could not start the camera. Upload a file instead.',
        );
        setLoading(false);
      });

    return () => {
      cancelled = true;
      stop();
    };
  }, [open, facingMode, stop]);

  // Escape closes.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, handleClose]);

  const capture = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const scale = Math.min(1, MAX_DIM / Math.max(video.videoWidth, video.videoHeight));
    const w = Math.round(video.videoWidth * scale);
    const h = Math.round(video.videoHeight * scale);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      setError('Capture failed. Please try again.');
      return;
    }
    ctx.drawImage(video, 0, 0, w, h);
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setError('Capture failed. Please try again.');
          return;
        }
        onCapture(new File([blob], 'camera-photo.jpg', { type: 'image/jpeg' }));
        handleClose();
      },
      'image/jpeg',
      0.9,
    );
  };

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Take a photo"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={handleClose}
    >
      <div
        className="bg-surface-white rounded-lg shadow-lifted p-4 w-full max-w-md flex flex-col gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-md bg-black">
          {error ? (
            <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-white font-manrope">
              {error}
            </div>
          ) : (
            <>
              <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
              {loading && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Spinner className="w-8 h-8 text-white" />
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex items-center justify-between gap-2">
          <Button type="button" variant="ghost" onClick={handleClose}>
            Cancel
          </Button>
          {!error && (
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setFacingMode((m) => (m === 'user' ? 'environment' : 'user'))}
              >
                Flip
              </Button>
              <Button type="button" onClick={capture} disabled={loading}>
                Capture
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
