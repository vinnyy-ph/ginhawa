# Camera Capture for Profile Picture — Design Spec

**Date:** 2026-05-29
**Branch:** frontend/onboarding-new-schema
**Type:** Feature — add in-browser camera capture as an alternative to file upload for profile pictures (patient + doctor onboarding).

## Goal

Let users take a profile photo with their device camera (front or rear) directly
in the browser, in addition to uploading a file. Applies to all three existing
profile-picture spots: patient step 5, doctor step 1, and the shared review
`ReviewIdCard` (used by patient step 6 and doctor step 5).

## Approach

A single reusable `<CameraCapture>` modal component built on `getUserMedia`. It
hands the caller a ready-to-use `File` (JPEG); each existing upload site keeps its
own current logic (deferred upload for the step pages, immediate upload for the
review card) and simply feeds the camera `File` through the same path as a picked
file. Each site gains a "Take photo" button next to its existing file-upload
affordance — the file path is untouched and remains the fallback when the camera
is unavailable or denied.

## Constraints

- Client component (`'use client'`). No new dependencies.
- `getUserMedia` requires a secure context (HTTPS; `localhost` works in dev). When
  unavailable, the modal shows a message and the user falls back to file upload.
- Camera output must satisfy the existing validation already enforced at each
  site: `ALLOWED_TYPES = ['image/jpeg','image/png','image/webp']` and
  `MAX_BYTES = 5 * 1024 * 1024`. The component always emits `image/jpeg`
  downscaled to ≤1280px longest side, so it passes both.
- Verify with `npm run lint` && `npm run build` from `frontend/` (2 pre-existing
  unrelated warnings in DoctorCard.tsx/ActivityLogIcon are acceptable). No
  frontend test framework — remaining verification is manual.
- Surgical: do not alter unrelated upload, validation, or submit logic beyond what
  the integration requires.

## Component: `CameraCapture`

**File:** `frontend/src/components/ui/camera-capture.tsx`

**Props:**
```ts
{
  open: boolean;
  onClose: () => void;
  onCapture: (file: File) => void;
}
```

**Behavior:**
- When `open` becomes true, request `navigator.mediaDevices.getUserMedia({ video: { facingMode } })`
  and attach the `MediaStream` to a `<video autoPlay playsInline muted>`.
- State: `facingMode: 'user' | 'environment'` (default `'user'`), the active
  `MediaStream`, and an `error: string | null`.
- **Capture:** draw the current video frame onto an offscreen `<canvas>`, scaling
  so the longest side is ≤1280px (preserve aspect ratio); call
  `canvas.toBlob(cb, 'image/jpeg', 0.9)`; wrap the blob as
  `new File([blob], 'camera-photo.jpg', { type: 'image/jpeg' })`; invoke
  `onCapture(file)`; then stop the stream and call `onClose()`. If `toBlob`
  yields null, set an error and keep the modal open.
- **Flip:** toggle `facingMode` between `'user'` and `'environment'`, stop the
  current stream, and re-acquire with the new constraint.
- **Cancel / Escape / overlay close:** stop all tracks and call `onClose()`.
- **Cleanup:** on unmount and whenever the stream is replaced, stop all tracks
  (`stream.getTracks().forEach(t => t.stop())`).
- **Errors:** if `navigator.mediaDevices?.getUserMedia` is unavailable (unsupported
  or insecure context), or the promise rejects (permission denied / no camera),
  show an inline message with a Close button. Do not crash; the file-upload path
  at the call site remains usable.

**Accessibility:** `role="dialog"`, `aria-modal="true"`, an accessible label;
Escape closes; Capture / Flip / Cancel buttons have text or `aria-label`.

**Styling:** follow the existing UI system (teal primary, `rounded-lg` surfaces,
`Button` component, `Spinner` while the stream initialises).

## Integration

All three sites add a "Take photo" button (camera icon) beside the existing
upload control and render `<CameraCapture>` wired to their file handler.

### 1. Patient step 5 — `frontend/src/app/onboarding/5/page.tsx`
- Extract the body of `handleFileChange` into `acceptFile(file: File)`: run the
  `ALLOWED_TYPES`/`MAX_BYTES` validation, `setSelectedFile(file)`, and the
  FileReader preview. `handleFileChange(e)` becomes a thin wrapper calling
  `acceptFile(e.target.files[0])` (guarding null).
- Add `cameraOpen` state; add a "Take photo" `Button` (alongside the dropzone /
  "Change photo"); render `<CameraCapture open={cameraOpen} onClose={() => setCameraOpen(false)} onCapture={acceptFile} />`.
- Deferred-upload flow (`handleUploadAndContinue`) unchanged.

### 2. Doctor step 1 — `frontend/src/app/onboarding/doctor/1/page.tsx`
- Same pattern: extract `acceptFile(file)` from the existing file-change handler
  (validation + `setSelectedFile` + preview), add `cameraOpen` state, a
  "Take photo" button, and the `<CameraCapture onCapture={acceptFile} />` modal.
- Existing upload-on-next logic unchanged.

### 3. Shared review card — `frontend/src/components/ui/review-id-card.tsx`
- Change the prop `onPhotoChange: (e: React.ChangeEvent<HTMLInputElement>) => void`
  to `onPhotoFile: (file: File) => void`.
- The internal hidden file `<input>`'s `onChange` calls
  `onPhotoFile(e.target.files[0])` (guarding null).
- Add a "Take photo" button near the existing photo-change button and an internal
  `cameraOpen` state rendering `<CameraCapture open={cameraOpen} onClose onCapture={onPhotoFile} />`.
- Update both consumers:
  - `frontend/src/app/onboarding/6/page.tsx` and
    `frontend/src/app/onboarding/doctor/5/page.tsx`: rename `handlePhotoChange(e)`
    to `handlePhotoFile(file: File)` (drop the `e.target.files?.[0]` unwrap; keep
    the validation + immediate `apiUpload` + `update(...)` logic), and pass
    `onPhotoFile={handlePhotoFile}` to `ReviewIdCard`.

## Error Handling Summary

| Situation | Behavior |
|-----------|----------|
| `getUserMedia` unsupported / insecure context | Modal shows "Camera not available" message + Close; file upload still works |
| Permission denied | Modal shows "Camera permission denied" message + Close |
| No camera device | Modal shows generic camera-unavailable message + Close |
| `toBlob` returns null | Inline error in modal; stay open |
| Captured `File` | Routed through each site's existing `ALLOWED_TYPES`/`MAX_BYTES` validation (always passes for JPEG ≤1280) |

## Testing (manual — no frontend test framework)

- `npm run lint` && `npm run build` pass (only the 2 known unrelated warnings).
- Allow permission → live preview shows; Capture → image appears in the avatar;
  Continue/Save uploads it; the stored picture displays on the dashboard.
- Flip toggles front/rear on a device with both cameras.
- Deny permission → graceful message, modal closes, file upload still works.
- Existing file upload (pick a JPEG/PNG/WebP) still works unchanged at all 3 spots.
- Stream stops (camera light off) after capture and after cancel.

## Out of Scope (YAGNI)

- Square cropping / framing guide (avatars already use `object-cover`).
- Image filters, zoom, multi-shot, or re-take carousel beyond a single capture.
- Backend changes — the existing `/uploads/profile-picture` endpoint and 5MB/type
  rules are reused as-is.
- Device/camera selection beyond the front/rear `facingMode` flip.
