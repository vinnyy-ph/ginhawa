# Camera Capture for Profile Picture Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add in-browser camera capture (front/rear) as a "Take photo" option alongside file upload at all three profile-picture spots in onboarding.

**Architecture:** One reusable `<CameraCapture>` `getUserMedia` modal returns a JPEG `File` via `onCapture`. Each existing upload site keeps its own logic and routes the camera `File` through the same handler as a picked file. The shared `ReviewIdCard` swaps its `onPhotoChange` event prop for an `onPhotoFile(file)` prop so both the file input and the camera feed one handler.

**Tech Stack:** Next.js App Router (client components), Tailwind v4, existing `Button`/`Spinner` components, MediaDevices `getUserMedia` + `<canvas>` `toBlob`. No new dependencies.

---

## Constraints & Verification

- No frontend test framework. **Verify every task with:** `cd frontend && npm run lint && npm run build`. Expected: passes with only the 2 known unrelated warnings (`DoctorCard.tsx`, `recommendations/page.tsx` `ActivityLogIcon`).
- `getUserMedia` needs a secure context (HTTPS; `localhost` works in dev). The component degrades gracefully when unavailable; file upload remains the fallback at every site.
- Camera output is always `image/jpeg` ≤1280px longest side, so it passes the existing `ALLOWED_TYPES`/`MAX_BYTES` checks at each site.
- This is Next.js with breaking changes, but these tasks add only client-component UI + browser APIs (no Next routing/data APIs), so no `node_modules/next/dist/docs` lookup is needed.
- Surgical: do not change unrelated upload/validation/submit logic.

## File Structure

**Create:**
- `frontend/src/components/ui/camera-capture.tsx` — the `CameraCapture` modal.

**Modify:**
- `frontend/src/app/onboarding/5/page.tsx` — patient photo step (add Take photo).
- `frontend/src/app/onboarding/doctor/1/page.tsx` — doctor identity step (add Take photo).
- `frontend/src/components/ui/review-id-card.tsx` — `onPhotoChange` → `onPhotoFile`; add Take photo.
- `frontend/src/app/onboarding/6/page.tsx` — patient review (rename handler, new prop).
- `frontend/src/app/onboarding/doctor/5/page.tsx` — doctor review (rename handler, new prop).

---

## Task 1: CameraCapture component

**Files:**
- Create: `frontend/src/components/ui/camera-capture.tsx`

- [ ] **Step 1: Create the component**

```tsx
// frontend/src/components/ui/camera-capture.tsx
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
              {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
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
```

- [ ] **Step 2: Verify build**

Run: `cd frontend && npm run lint && npm run build`
Expected: PASS (2 known warnings only). If ESLint flags the `<video>` element for a missing caption track and the inline disable comment above did not suppress it, the correct rule name in this repo may differ — read the error and apply the exact `// eslint-disable-next-line <rule>` it names on the line above the `<video>`.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/ui/camera-capture.tsx
git commit -m "feat(onboarding): add CameraCapture modal (getUserMedia → JPEG File)"
```

---

## Task 2: Patient step 5 — add Take photo

**Files:**
- Modify: `frontend/src/app/onboarding/5/page.tsx`

Current state: `handleFileChange(e)` validates the picked file (`ALLOWED_TYPES`, `MAX_BYTES`), then `setSelectedFile(file)` and sets a FileReader preview. A hidden `<input ref={inputRef}>` and a "Change photo" button trigger the picker. Upload is deferred to `handleUploadAndContinue`.

- [ ] **Step 1: Import CameraCapture and add state**

Add the import near the other UI imports:

```tsx
import { CameraCapture } from '@/components/ui/camera-capture';
```

Add a state declaration alongside the existing `useState` hooks:

```tsx
const [cameraOpen, setCameraOpen] = useState(false);
```

- [ ] **Step 2: Extract `acceptFile` and have `handleFileChange` delegate**

Replace the existing `handleFileChange` function with these two:

```tsx
const acceptFile = (file: File) => {
  setFileError(null);
  setServerError(null);

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

const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (file) acceptFile(file);
};
```

- [ ] **Step 3: Add the Take photo button and the modal**

In the centered upload column, replace the existing "Change photo" `Button` block with a row offering both actions (the camera is always available; "Change photo" stays gated on `preview`):

```tsx
<div className="flex items-center gap-2">
  {preview && (
    <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
      Change photo
    </Button>
  )}
  <Button type="button" variant="outline" size="sm" onClick={() => setCameraOpen(true)}>
    Take photo
  </Button>
</div>
```

Then render the modal once, just before the closing `</OnboardingShell>` (anywhere inside the shell is fine):

```tsx
<CameraCapture open={cameraOpen} onClose={() => setCameraOpen(false)} onCapture={acceptFile} />
```

- [ ] **Step 4: Verify build**

Run: `cd frontend && npm run lint && npm run build`
Expected: PASS. Manually: "Take photo" opens the modal; capturing sets the preview and enables "Upload & Continue →"; picking a file still works.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/onboarding/5/page.tsx
git commit -m "feat(onboarding): patient photo step supports camera capture"
```

---

## Task 3: Doctor step 1 — add Take photo

**Files:**
- Modify: `frontend/src/app/onboarding/doctor/1/page.tsx`

Current state: an async identity step with a circular dropzone, a hidden file `<input ref={inputRef}>`, a `handleFileChange(e)` that validates + `setSelectedFile` + sets `preview` via FileReader, and `serverError` state. Upload is deferred to the existing next handler.

- [ ] **Step 1: Read the file** to confirm the exact handler name, the file-validation block, and the preview/state setters (`selectedFile`, `preview`, `serverError`, `inputRef`).

- [ ] **Step 2: Import CameraCapture and add state**

```tsx
import { CameraCapture } from '@/components/ui/camera-capture';
```

```tsx
const [cameraOpen, setCameraOpen] = useState(false);
```

- [ ] **Step 3: Extract `acceptFile`**

Refactor the existing file-change handler so the validation + `setSelectedFile` + FileReader preview live in `acceptFile(file: File)`, and the change handler delegates. Use the SAME messages/limits already in the file (do not invent new ones):

```tsx
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
```

If the existing handler uses different state setter names (e.g. a separate `setPreview`/`setSelectedFile`), keep those exact names — only restructure into `acceptFile`. Do not change the upload-on-next logic.

- [ ] **Step 4: Add Take photo button + modal**

Below the dropzone (near where any existing photo affordance/error sits), add:

```tsx
<Button type="button" variant="outline" size="sm" onClick={() => setCameraOpen(true)}>
  Take photo
</Button>
```

`Button` is already imported in this file. Render the modal once inside the shell:

```tsx
<CameraCapture open={cameraOpen} onClose={() => setCameraOpen(false)} onCapture={acceptFile} />
```

- [ ] **Step 5: Verify build**

Run: `cd frontend && npm run lint && npm run build`
Expected: PASS. Manually: Take photo → capture sets the dropzone preview; Continue uploads it; file pick still works.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/app/onboarding/doctor/1/page.tsx
git commit -m "feat(onboarding): doctor identity step supports camera capture"
```

---

## Task 4: ReviewIdCard `onPhotoFile` + Take photo (both reviews)

**Files:**
- Modify: `frontend/src/components/ui/review-id-card.tsx`
- Modify: `frontend/src/app/onboarding/6/page.tsx`
- Modify: `frontend/src/app/onboarding/doctor/5/page.tsx`

These change together: the prop rename in `ReviewIdCard` must be matched by both consumers in the same commit so the build stays green.

- [ ] **Step 1: Update `ReviewIdCard`**

In `frontend/src/components/ui/review-id-card.tsx`:

a) Add imports at the top (it already imports `Spinner`):

```tsx
import { useRef, useState } from 'react';
import { Button } from './button';
import { CameraCapture } from './camera-capture';
```

(Keep the existing `import * as React from 'react';` and `import { Spinner } from './spinner';`. If `useRef` was previously imported via `import { useRef } from 'react';`, merge `useState` into that line instead of duplicating.)

b) Change the prop type from `onPhotoChange` to `onPhotoFile`:

```tsx
  onPhotoFile,
```
in the destructure, and in the props type:
```tsx
  onPhotoFile: (file: File) => void;
```
(remove the old `onPhotoChange: (e: React.ChangeEvent<HTMLInputElement>) => void;`).

c) Add camera state inside the component body (next to the existing `photoInputRef`):

```tsx
const [cameraOpen, setCameraOpen] = useState(false);
```

d) Change the hidden file input's handler to call `onPhotoFile`:

```tsx
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
```

e) Add a "Take photo" button next to the existing photo-change `<button>` (the small floating camera button stays as the file-picker trigger). Place a small Take-photo button beneath the name/subtitle block inside the hero, and render the modal. Add this just before the closing `</div>` of the hero's text column (after the `{photoError && ...}` line):

```tsx
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
```

And render the modal once before the component's final closing `</div>`:

```tsx
<CameraCapture open={cameraOpen} onClose={() => setCameraOpen(false)} onCapture={onPhotoFile} />
```

- [ ] **Step 2: Update patient review consumer**

In `frontend/src/app/onboarding/6/page.tsx`:

a) Rename `handlePhotoChange` to `handlePhotoFile` and change its signature to take a `File` directly. The original reads `const file = e.target.files?.[0]; if (!file) return;` — remove those two lines and accept `file` as the parameter; keep everything else (validation, `apiUpload`, `update`, error handling) identical:

```tsx
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
```

(Match the exact body already present in the file — only the parameter/first two lines change.)

b) Change the `ReviewIdCard` prop from `onPhotoChange={handlePhotoChange}` to `onPhotoFile={handlePhotoFile}`.

- [ ] **Step 3: Update doctor review consumer**

In `frontend/src/app/onboarding/doctor/5/page.tsx`, apply the same rename: `handlePhotoChange(e)` → `handlePhotoFile(file: File)` (drop the `e.target.files?.[0]` unwrap, keep the rest of the upload/update/error logic identical), and change the `ReviewIdCard` prop to `onPhotoFile={handlePhotoFile}`.

- [ ] **Step 4: Verify build**

Run: `cd frontend && npm run lint && npm run build`
Expected: PASS (a green build confirms all three files agree on the new prop). Manually: in both reviews, the floating camera button still opens the file picker and uploads; the new "Take photo" button opens the camera and the captured photo uploads and shows in the ID-card avatar.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/ui/review-id-card.tsx frontend/src/app/onboarding/6/page.tsx frontend/src/app/onboarding/doctor/5/page.tsx
git commit -m "feat(onboarding): review ID card supports camera capture"
```

---

## Task 5: Final verification + cleanup

- [ ] **Step 1: Final lint + build**

Run: `cd frontend && npm run lint && npm run build`
Expected: PASS with only the 2 known unrelated warnings.

- [ ] **Step 2: Manual smoke (dev server, localhost = secure context)**

Run `npm run dev` and verify:
- Patient step 5 and doctor step 1: "Take photo" opens the modal, live preview shows, Flip switches camera (on a device with two), Capture fills the preview, Continue uploads.
- Patient step 6 and doctor step 5: "Take photo" captures and immediately uploads into the ID-card avatar; the existing floating button still picks a file.
- Deny camera permission → modal shows the denied message + Cancel; file upload still works.
- After capture and after Cancel, the camera indicator turns off (tracks stopped).

- [ ] **Step 3: Delete spec + plan per standing rule**

After everything builds clean:

```bash
git rm docs/superpowers/specs/2026-05-29-camera-capture-profile-picture-design.md \
       docs/superpowers/plans/2026-05-29-camera-capture-profile-picture.md
git commit -m "chore: remove completed camera capture spec and plan"
```

---

## Self-Review

**Spec coverage:**
- `CameraCapture` component (getUserMedia, facingMode flip, canvas→JPEG≤1280, error/cleanup, a11y) → Task 1. ✓
- Patient step 5 "Take photo" → Task 2. ✓
- Doctor step 1 "Take photo" → Task 3. ✓
- `ReviewIdCard` `onPhotoChange`→`onPhotoFile` + Take photo + both consumers → Task 4. ✓
- Error-handling table (unsupported/denied/no-device/toBlob-null/validation reuse) → Task 1 component logic + each site's existing validation in Tasks 2–4. ✓
- Manual testing + cleanup → Task 5. ✓

**Placeholder scan:** No TBD/TODO. Tasks 2/4 give complete code; Task 3 says "read the file first / keep exact names" because the doctor step 1 setter names must be confirmed in-file rather than guessed — the structure and messages are fully specified.

**Type consistency:** `onCapture: (file: File) => void` (CameraCapture) and `onPhotoFile: (file: File) => void` (ReviewIdCard) are used consistently; both consumers pass a `(file: File) => void`. `acceptFile(file: File)` and `handlePhotoFile(file: File)` signatures match their call sites and the `onCapture`/`onPhotoFile` props.
