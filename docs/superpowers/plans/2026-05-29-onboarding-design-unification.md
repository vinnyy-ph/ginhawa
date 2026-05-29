# Onboarding Design Unification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unify the patient (6-step) and doctor (5-step) onboarding flows under one DESIGN.md-grounded visual system by extracting shared shell/input/nav/review primitives.

**Architecture:** Add four shared UI primitives (`OnboardingShell`, `OnboardingNav`, `ReviewIdCard` + `ReviewErrorAlert`, and a shared `onboardingInputClass`). Refactor both `layout.tsx` files to provider-only wrappers and rewire all 11 step pages to consume the primitives. Purely presentational — no react-hook-form/zod, manual `setErrors`, pill, formatter, photo-upload, or submit/API logic changes.

**Tech Stack:** Next.js App Router (client components), Tailwind CSS v4 (`@theme` tokens in `src/app/globals.css`), framer-motion (`FadeIn`), existing `Button`/`ProgressIndicator`/`FormField`/`EditableRow`/`Chip`/`Logo`/`Spinner` components.

---

## Constraints & Verification

- **DESIGN ONLY.** Do not modify validation wiring, pill toggles, formatters (`lib/format.ts`), or submit/API calls. Only swap visual classes and wrap content in the new primitives. (One allowed presentational addition: a `serverError` state on the doctor review page to render the shared inline error alert — see Task 10.)
- No frontend test framework exists. **Verify every task with:** `cd frontend && npm run lint && npm run build`. Expected: passes with only the 2 known unrelated warnings (`DoctorCard.tsx`, `ActivityLogIcon`).
- This is Next.js with breaking changes — these tasks add only client components and Tailwind classes (no routing/data-fetching APIs), so no `node_modules/next/dist/docs` lookup is required. If a task ever needs a Next API, consult those docs first.
- Do NOT touch backend, recommendations/GeminiService, or `docs/superpowers/{gemini-provider*, patient-onboarding-ux.md}`.

## Canonical Token Decisions (from `globals.css`)

- Card radius: `rounded-lg` (1rem).
- Input radius: `rounded-md` (0.75rem) — no 0.5rem token exists; matches existing patient inputs and `editInputClass`.
- Card shadow: `shadow-lifted` (the only soft tinted elevation token besides `shadow-soft`). Never `shadow-hover` (undefined).
- Buttons: use the `<Button>` component variants unchanged; stop overriding with `rounded-full`/`rounded-2xl`.

## File Structure

**Create:**
- `frontend/src/lib/onboarding-styles.ts` — exports `onboardingInputClass`.
- `frontend/src/components/ui/onboarding-shell.tsx` — `OnboardingShell`.
- `frontend/src/components/ui/onboarding-nav.tsx` — `OnboardingNav`.
- `frontend/src/components/ui/review-id-card.tsx` — `ReviewIdCard` + `ReviewErrorAlert`.

**Modify:**
- `frontend/src/app/onboarding/layout.tsx`, `frontend/src/app/onboarding/doctor/layout.tsx` (provider-only).
- Patient steps `1`–`5`, doctor steps `1`–`4` (consume shell/input/nav).
- Patient step `6`, doctor step `5` (consume `ReviewIdCard` + `ReviewErrorAlert`).
- `frontend/src/components/ui/editable-row.tsx` (grid is owned by `ReviewIdCard`; `editInputClass` unchanged — already `rounded-md`).

---

## Task 1: Shared input style

**Files:**
- Create: `frontend/src/lib/onboarding-styles.ts`

- [ ] **Step 1: Create the shared input class module**

```ts
// frontend/src/lib/onboarding-styles.ts
// Single source of truth for onboarding text-input styling.
// Mirrors DESIGN.md: rounded-md (0.75rem) idle border, primary focus ring,
// Manrope body, error border via aria-invalid.
export const onboardingInputClass =
  'w-full rounded-md border border-outline-variant bg-surface-white px-3 py-2.5 text-sm text-on-surface font-manrope placeholder:text-outline transition-colors focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 aria-[invalid=true]:border-error';

export const onboardingTextareaClass =
  'w-full rounded-md border border-outline-variant bg-surface-white px-3 py-2.5 text-sm text-on-surface font-manrope placeholder:text-outline transition-colors resize-y min-h-[80px] focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 aria-[invalid=true]:border-error';
```

- [ ] **Step 2: Verify build**

Run: `cd frontend && npm run lint && npm run build`
Expected: PASS (2 known warnings only).

- [ ] **Step 3: Commit**

```bash
git add frontend/src/lib/onboarding-styles.ts
git commit -m "feat(onboarding): add shared input/textarea style constants"
```

---

## Task 2: OnboardingShell

**Files:**
- Create: `frontend/src/components/ui/onboarding-shell.tsx`

- [ ] **Step 1: Create the shell component**

```tsx
// frontend/src/components/ui/onboarding-shell.tsx
'use client';

import * as React from 'react';
import { Logo } from './logo';
import { FadeIn } from './fade-in';
import { ProgressIndicator } from './progress-indicator';

/**
 * Shared chrome for every onboarding step (patient + doctor).
 * Full-bleed brand header, surface background, and a single borderless
 * white card (rounded-lg, shadow-lifted) holding progress + title + content.
 */
export function OnboardingShell({
  step,
  totalSteps,
  title,
  subtitle,
  children,
}: {
  step: number;
  totalSteps: number;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-surface flex flex-col">
      <header className="flex items-center gap-2 px-4 sm:px-6 py-4 border-b border-outline-variant bg-surface-white">
        <Logo size={28} />
        <span className="text-sm font-semibold text-primary font-plus-jakarta tracking-wide">
          Ginhawa
        </span>
      </header>
      <main className="flex flex-1 flex-col items-center px-4 py-8 sm:py-10">
        <FadeIn className="w-full max-w-xl">
          <div className="bg-surface-white rounded-lg shadow-lifted p-6 sm:p-8 flex flex-col gap-6">
            <ProgressIndicator currentStep={step} totalSteps={totalSteps} />
            <div>
              <h1 className="text-2xl font-semibold text-text-primary font-plus-jakarta">
                {title}
              </h1>
              {subtitle && (
                <p className="mt-1 text-sm text-on-surface-variant font-manrope">
                  {subtitle}
                </p>
              )}
            </div>
            {children}
          </div>
        </FadeIn>
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `cd frontend && npm run lint && npm run build`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/ui/onboarding-shell.tsx
git commit -m "feat(onboarding): add shared OnboardingShell"
```

---

## Task 3: OnboardingNav

**Files:**
- Create: `frontend/src/components/ui/onboarding-nav.tsx`

- [ ] **Step 1: Create the nav component**

```tsx
// frontend/src/components/ui/onboarding-nav.tsx
'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Button } from './button';
import { Spinner } from './spinner';

/**
 * Standard Back/Continue footer for onboarding steps.
 * Back (outline) left, primary action right; stacks full-width below sm.
 * If onBack is omitted, the primary action right-aligns alone.
 */
export function OnboardingNav({
  onBack,
  submitLabel,
  loadingLabel = 'Processing…',
  loading = false,
  disabled = false,
  submitType = 'submit',
  onSubmit,
}: {
  onBack?: () => void;
  submitLabel: string;
  loadingLabel?: string;
  loading?: boolean;
  disabled?: boolean;
  submitType?: 'submit' | 'button';
  onSubmit?: () => void;
}) {
  return (
    <div
      className={cn(
        'flex flex-col-reverse sm:flex-row gap-3 pt-2',
        onBack ? 'sm:justify-between' : 'sm:justify-end',
      )}
    >
      {onBack && (
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="w-full sm:w-auto sm:min-w-[140px]"
          onClick={onBack}
          disabled={loading}
        >
          ← Back
        </Button>
      )}
      <Button
        type={submitType}
        size="lg"
        className="w-full sm:w-auto sm:min-w-[140px]"
        onClick={onSubmit}
        disabled={loading || disabled}
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <Spinner className="w-5 h-5" /> {loadingLabel}
          </span>
        ) : (
          submitLabel
        )}
      </Button>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `cd frontend && npm run lint && npm run build`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/ui/onboarding-nav.tsx
git commit -m "feat(onboarding): add shared OnboardingNav"
```

---

## Task 4: ReviewIdCard + ReviewErrorAlert

**Files:**
- Create: `frontend/src/components/ui/review-id-card.tsx`

- [ ] **Step 1: Create the review primitives**

```tsx
// frontend/src/components/ui/review-id-card.tsx
'use client';

import * as React from 'react';
import { useRef } from 'react';
import { Spinner } from './spinner';

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
  onPhotoChange,
  statusLabel = 'Profile Complete',
  children,
}: {
  idLabel: string;
  name: string;
  subtitle?: string;
  photoUrl?: string | null;
  uploadingPhoto: boolean;
  photoError?: string | null;
  onPhotoChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  statusLabel?: string;
  children: React.ReactNode;
}) {
  const photoInputRef = useRef<HTMLInputElement>(null);

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
              onChange={onPhotoChange}
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
          </div>
        </div>
      </div>

      <div className="p-6 sm:p-8 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6">
        {children}
      </div>
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
```

- [ ] **Step 2: Verify build**

Run: `cd frontend && npm run lint && npm run build`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/ui/review-id-card.tsx
git commit -m "feat(onboarding): add shared ReviewIdCard + ReviewErrorAlert"
```

---

## Task 5: Reduce both layouts to provider-only

**Files:**
- Modify: `frontend/src/app/onboarding/layout.tsx`
- Modify: `frontend/src/app/onboarding/doctor/layout.tsx`

The shell chrome now lives in `OnboardingShell` (rendered per-page). Layouts keep only the context provider.

- [ ] **Step 1: Patient layout → provider only**

Replace the entire contents of `frontend/src/app/onboarding/layout.tsx` with:

```tsx
// frontend/src/app/onboarding/layout.tsx
import { OnboardingProvider } from '@/context/onboarding-context';

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return <OnboardingProvider>{children}</OnboardingProvider>;
}
```

- [ ] **Step 2: Doctor layout → provider only**

Replace the entire contents of `frontend/src/app/onboarding/doctor/layout.tsx` with:

```tsx
import { DoctorOnboardingProvider } from '@/context/doctor-onboarding-context';

export default function DoctorOnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DoctorOnboardingProvider>{children}</DoctorOnboardingProvider>;
}
```

- [ ] **Step 3: Verify build**

Run: `cd frontend && npm run lint && npm run build`
Expected: PASS. (Pages still render their own outer `<div>` until Tasks 6–10, so layout looks unstyled mid-refactor — that is fine; build must stay green.)

- [ ] **Step 4: Commit**

```bash
git add frontend/src/app/onboarding/layout.tsx frontend/src/app/onboarding/doctor/layout.tsx
git commit -m "refactor(onboarding): reduce layouts to provider-only wrappers"
```

---

## Task 6: Patient steps 1–5 adopt shell + input + nav

For each patient step page, apply the same three edits. The form/validation/pills/photo logic stays byte-for-byte identical — only the wrapper, input className, and nav row change.

**The three edits (apply to every step page):**

1. **Imports:** remove `ProgressIndicator` import; add
   `import { OnboardingShell } from '@/components/ui/onboarding-shell';`
   `import { OnboardingNav } from '@/components/ui/onboarding-nav';`
   `import { onboardingInputClass, onboardingTextareaClass } from '@/lib/onboarding-styles';`
   (import `onboardingTextareaClass` only on pages that have a textarea, i.e. step 4).
2. **Delete** the local `const inputClass = …` (and `const textareaClass = …`) declarations.
3. **Wrapper:** replace the outer
   `<div className="flex flex-col gap-6"><ProgressIndicator …/><div><h1>…</h1><p>…</p></div> … </div>`
   with `<OnboardingShell step={N} totalSteps={6} title="…" subtitle="…"> … </OnboardingShell>`, keeping the `<form>` (and any non-form content) as children.
4. **Class references:** replace `className={inputClass}` → `className={onboardingInputClass}` and `className={textareaClass}` → `className={onboardingTextareaClass}`.
5. **Nav:** replace the footer `<div className="flex justify-…"><Button…>…</Button></div>` with `<OnboardingNav … />`.

- [ ] **Step 1: Step 1 (`frontend/src/app/onboarding/1/page.tsx`)**

- Remove `ProgressIndicator` import; add the three imports above (no textarea import).
- Delete `const inputClass = …`.
- Wrap: outer `<div className="flex flex-col gap-6">…</div>` becomes:

```tsx
<OnboardingShell
  step={1}
  totalSteps={6}
  title="Personal Information"
  subtitle="Tell us a little about yourself so your doctors have context."
>
  <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
    {/* unchanged FormFields */}
    <OnboardingNav submitLabel="Continue →" />
  </form>
</OnboardingShell>
```

- Replace the three `className={inputClass}` usages with `className={onboardingInputClass}`.
- Replace the final `<div className="flex justify-end pt-2"> … </div>` with `<OnboardingNav submitLabel="Continue →" />` (submit type defaults to `'submit'`; no `onBack` on step 1).

- [ ] **Step 2: Step 2 (`frontend/src/app/onboarding/2/page.tsx`)**

- Same import swap (no textarea).
- Delete `const inputClass`.
- Wrap in `<OnboardingShell step={2} totalSteps={6} title="…" subtitle="…">` using the page's existing `<h1>`/`<p>` text as `title`/`subtitle`.
- Replace every `className={inputClass}` → `className={onboardingInputClass}`.
- Replace the footer nav with:

```tsx
<OnboardingNav onBack={() => router.push('/onboarding/1')} submitLabel="Continue →" />
```

- [ ] **Step 3: Step 3 (`frontend/src/app/onboarding/3/page.tsx`)**

- Same edits; `step={3}`. Preserve the weight/height unit toggles and BMI markup unchanged. Replace `inputClass` usages and footer nav:

```tsx
<OnboardingNav onBack={() => router.push('/onboarding/2')} submitLabel="Continue →" />
```

- [ ] **Step 4: Step 4 (`frontend/src/app/onboarding/4/page.tsx`)**

- Import swap **including** `onboardingTextareaClass`.
- Delete both `const inputClass` and `const textareaClass`.
- Wrap in `<OnboardingShell step={4} totalSteps={6} title="Medical History" subtitle="Helps your doctor understand your health context. All optional and kept private — separate items with commas.">`.
- Replace `className={inputClass}` → `className={onboardingInputClass}` and `className={textareaClass}` → `className={onboardingTextareaClass}`. Keep all `Chip` pill markup and `toggleChip` logic unchanged.
- Footer nav:

```tsx
<OnboardingNav onBack={() => router.push('/onboarding/3')} submitLabel="Continue →" />
```

- [ ] **Step 5: Step 5 (`frontend/src/app/onboarding/5/page.tsx`)**

- Read the file first to see its photo-upload markup and submit/next handler.
- Wrap in `<OnboardingShell step={5} totalSteps={6} title="…" subtitle="…">` (reuse existing heading text).
- Replace any `inputClass` usage with `onboardingInputClass`.
- Replace the footer nav. If step 5 advances via a button with an async upload, use:

```tsx
<OnboardingNav
  onBack={() => router.push('/onboarding/4')}
  submitType="button"
  onSubmit={handleNext}
  loading={uploading}
  loadingLabel="Uploading…"
  submitLabel="Continue →"
/>
```

  Match the actual handler/loading variable names found in the file (do not invent names). If the page uses a `<form onSubmit>`, keep `submitType="submit"` and omit `onSubmit`.

- [ ] **Step 6: Verify build after each step, then once at the end**

Run: `cd frontend && npm run lint && npm run build`
Expected: PASS. Manually confirm steps render with the header + card shell and that Continue/Back still navigate.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/app/onboarding/1 frontend/src/app/onboarding/2 frontend/src/app/onboarding/3 frontend/src/app/onboarding/4 frontend/src/app/onboarding/5
git commit -m "refactor(onboarding): patient steps 1-5 adopt shared shell/input/nav"
```

---

## Task 7: Doctor steps 1–4 adopt shell + input + nav

Same three edits as Task 6. These pages currently use `rounded-xl … focus:ring-1` inputs and inline `rounded-full px-8 py-6` buttons — both are replaced. **Do not touch** the manual `setErrors` validation, the specialization dropdown logic, the `useSpecializations` hook, the language/focus `Chip` pills, or the photo-upload handlers.

- [ ] **Step 1: Doctor step 1 (`frontend/src/app/onboarding/doctor/1/page.tsx`)**

- Remove `ProgressIndicator` import; add `OnboardingShell`, `OnboardingNav`, and `onboardingInputClass` imports.
- Wrap in `<OnboardingShell step={1} totalSteps={5} title="Personal Information" subtitle="Let patients know who they are consulting with.">`. Keep the photo dropzone block unchanged inside.
- Replace BOTH inline input classNames (the long `w-full rounded-xl … transition-all` strings on the `fullName` and `professionalTitle` inputs) with `className={onboardingInputClass}`.
- Replace the footer:

```tsx
<OnboardingNav
  submitType="button"
  onSubmit={handleNext}
  loading={uploading}
  loadingLabel="Uploading…"
  submitLabel="Continue →"
/>
```

- [ ] **Step 2: Doctor step 2 (`frontend/src/app/onboarding/doctor/2/page.tsx`)**

- Import swap; delete `const inputClass = '…rounded-xl…'`.
- Wrap in `<OnboardingShell step={2} totalSteps={5} title="Credentials & Licensure" subtitle="Required for verification. Your PRC license confirms you are licensed to practice.">`.
- Replace every `className={inputClass}` → `className={onboardingInputClass}` (PRC, expiry, PTR, region, city inputs). Keep `formatPrc`/`formatPtr` onChange logic unchanged. Keep the `grid grid-cols-1 md:grid-cols-2 gap-4` region/city row.
- Footer:

```tsx
<OnboardingNav onBack={() => router.push('/onboarding/doctor/1')} submitLabel="Continue →" />
```

- [ ] **Step 3: Doctor step 3 (`frontend/src/app/onboarding/doctor/3/page.tsx`)**

- Read the file first (specialization select + free-text fallback, experience, language pills).
- Import swap; delete any local `inputClass`/`selectClass` (`rounded-xl`) constant.
- Wrap in `<OnboardingShell step={3} totalSteps={5} title="…" subtitle="…">` (reuse existing heading text).
- Replace input/select classNames with `onboardingInputClass`. Keep the `<select>` + free-text fallback logic and the language `Chip` pills unchanged.
- Footer:

```tsx
<OnboardingNav onBack={() => router.push('/onboarding/doctor/2')} submitLabel="Continue →" />
```

- [ ] **Step 4: Doctor step 4 (`frontend/src/app/onboarding/doctor/4/page.tsx`)**

- Read the file first (bio textarea, focus pills, fee, availability).
- Import swap including `onboardingTextareaClass` for the bio textarea.
- Wrap in `<OnboardingShell step={4} totalSteps={5} title="…" subtitle="…">`.
- Replace input classNames with `onboardingInputClass` and the bio textarea className with `onboardingTextareaClass`. Keep focus-area `Chip` pills and fee/availability logic unchanged.
- Footer:

```tsx
<OnboardingNav onBack={() => router.push('/onboarding/doctor/3')} submitLabel="Continue →" />
```

- [ ] **Step 5: Verify build**

Run: `cd frontend && npm run lint && npm run build`
Expected: PASS. Confirm doctor steps now match patient styling (header + card, rounded-md inputs, gradient `<Button>` nav, no pill buttons).

- [ ] **Step 6: Commit**

```bash
git add frontend/src/app/onboarding/doctor/1 frontend/src/app/onboarding/doctor/2 frontend/src/app/onboarding/doctor/3 frontend/src/app/onboarding/doctor/4
git commit -m "refactor(onboarding): doctor steps 1-4 adopt shared shell/input/nav"
```

---

## Task 8: Patient review (step 6) → ReviewIdCard

**Files:**
- Modify: `frontend/src/app/onboarding/6/page.tsx`

Keep ALL state, handlers (`handlePhotoChange`, `handleSubmit`), `hasLocationInsurance`/`hasMedical` gates, every `EditableRow`, and the submit/409-retry logic exactly as-is. Only the outer wrapper, the hero markup, the error alert, and the footer change.

- [ ] **Step 1: Update imports**

- Remove the `ProgressIndicator` import.
- Add:

```tsx
import { OnboardingShell } from '@/components/ui/onboarding-shell';
import { OnboardingNav } from '@/components/ui/onboarding-nav';
import { ReviewIdCard, ReviewErrorAlert } from '@/components/ui/review-id-card';
```

- The page no longer needs its own `photoInputRef`/hero markup (moved into `ReviewIdCard`); keep `uploadingPhoto`, `photoError`, and `handlePhotoChange` — they are passed to `ReviewIdCard`. (`ReviewIdCard` owns its own file input ref.)

- [ ] **Step 2: Replace the wrapper, hero, and grid container**

Replace the top-level return structure. The outer `<div className="flex flex-col gap-8">`, the `<ProgressIndicator/>`, the centered `<div className="text-center">…</div>` heading, the entire gradient hero `<div className="bg-surface-white rounded-3xl …">…</div>`, and its inner `<div className="p-8 grid grid-cols-2 …">` become:

```tsx
<OnboardingShell
  step={6}
  totalSteps={6}
  title="One last check"
  subtitle="Tap EDIT on any field to fix it right here."
>
  <ReviewIdCard
    idLabel="Digital Patient ID"
    name={data.fullName}
    photoUrl={data.profilePictureUrl}
    uploadingPhoto={uploadingPhoto}
    photoError={photoError}
    onPhotoChange={handlePhotoChange}
  >
    {/* ALL existing <EditableRow .../> children, the col-span-2 dividers,
        and the hasLocationInsurance / hasMedical fragments — unchanged */}
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
```

Notes:
- The `EditableRow` grid is now provided by `ReviewIdCard`'s `grid grid-cols-1 sm:grid-cols-2` container — delete the page's old `<div className="p-8 grid grid-cols-2 …">` wrapper but KEEP all `EditableRow` elements and the `<div className="col-span-2 h-px bg-outline-variant/30" />` dividers as direct children of `ReviewIdCard`.
- Delete the old inline `serverError` alert block (the `<div role="alert" …>` with the Retry button) — replaced by `<ReviewErrorAlert>`.
- Delete the old footer `<div className="flex gap-4 pt-4">…</div>` two-button block — replaced by `<OnboardingNav>`.
- `{showToast && <Toast … />}` stays (render it as a sibling after `</OnboardingShell>` or anywhere in the returned fragment; wrap the return in a fragment if needed).

- [ ] **Step 3: Verify build**

Run: `cd frontend && npm run lint && npm run build`
Expected: PASS. Manually confirm: EDIT/SAVE/CANCEL still work, inline photo upload works, PhilHealth/HMO validation messages still block save, Retry re-submits.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/app/onboarding/6/page.tsx
git commit -m "refactor(onboarding): patient review uses shared ReviewIdCard"
```

---

## Task 9: Doctor review (step 5) → ReviewIdCard

**Files:**
- Modify: `frontend/src/app/onboarding/doctor/5/page.tsx`

Keep ALL state, `useSpecializations`, `specOptions`, `handlePhotoChange`, `handleSubmit`, and every `EditableRow` exactly as-is. Convert the muted header + `max-h-[60vh]` scrollbox into the shared `ReviewIdCard`, and add an inline error alert.

- [ ] **Step 1: Update imports and add a serverError state**

- Remove the `ProgressIndicator` import.
- Add:

```tsx
import { OnboardingShell } from '@/components/ui/onboarding-shell';
import { OnboardingNav } from '@/components/ui/onboarding-nav';
import { ReviewIdCard, ReviewErrorAlert } from '@/components/ui/review-id-card';
```

- Add a state for inline submit errors (presentational addition allowed by this task):

```tsx
const [serverError, setServerError] = useState<string | null>(null);
```

- In `handleSubmit`, set it instead of (or in addition to) the error toast: at the start `setServerError(null);`, and in the `catch` block replace `setToast({ message: 'Failed to save profile. Please try again.', variant: 'error' });` with `setServerError('Failed to save profile. Please try again.');`. Keep the success path (`setToast({ … variant: 'success' })`) and the `'Session expired…'` toast unchanged. Do not alter the API call itself.

- [ ] **Step 2: Replace wrapper, header, scrollbox, and footer**

Replace the outer `<div className="flex flex-col gap-6">`, the `<ProgressIndicator/>`, the `<div><h1>Review Your Profile</h1>…</div>` heading, the scroll container `<div className="… overflow-y-auto max-h-[60vh] …">`, the muted profile header `<div className="bg-surface-container …">…</div>`, and the inner `<div className="bg-surface-white rounded-2xl … grid grid-cols-2 …">` with:

```tsx
<OnboardingShell
  step={5}
  totalSteps={5}
  title="Review Your Profile"
  subtitle="Tap EDIT on any field to fix it right here."
>
  <ReviewIdCard
    idLabel="Verified Provider"
    name={data.fullName}
    subtitle={[data.professionalTitle, data.specialization].filter(Boolean).join(' · ')}
    photoUrl={data.profilePictureUrl}
    uploadingPhoto={uploadingPhoto}
    photoError={photoError}
    onPhotoChange={handlePhotoChange}
  >
    {/* ALL existing <EditableRow .../> children — unchanged */}
  </ReviewIdCard>

  {serverError && <ReviewErrorAlert message={serverError} onRetry={handleSubmit} />}

  <OnboardingNav
    onBack={() => router.push('/onboarding/doctor/4')}
    submitType="button"
    onSubmit={handleSubmit}
    loading={isSubmitting}
    loadingLabel="Completing…"
    submitLabel="Complete Registration"
  />
</OnboardingShell>
{toast && <Toast message={toast.message} variant={toast.variant} onDismiss={() => setToast(null)} />}
```

Notes:
- Delete the page's own `photoInputRef` + hero markup and the old footer `<div className="flex justify-between items-center pt-4">…</div>`.
- Move all `EditableRow` elements to be direct children of `ReviewIdCard` (its grid replaces the page's `grid grid-cols-2` wrapper). The existing `fullWidth` rows keep working via `col-span-2`.
- Wrap the return in a fragment if needed so the trailing `{toast && …}` renders alongside `</OnboardingShell>`.

- [ ] **Step 3: Verify build**

Run: `cd frontend && npm run lint && npm run build`
Expected: PASS. Manually confirm: inline photo upload works, EDIT/SAVE with PRC/PTR validation still blocks invalid saves, submit shows the gradient button spinner, a failed submit shows the inline alert with Retry, success still toasts + redirects.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/app/onboarding/doctor/5/page.tsx
git commit -m "refactor(onboarding): doctor review uses shared ReviewIdCard"
```

---

## Task 10: Final consistency + responsiveness sweep

**Files:**
- Verify/adjust: all 11 onboarding pages + 3 new components.

- [ ] **Step 1: Grep for leftover divergent classes**

Run from `frontend/`:

```bash
grep -rn "rounded-full\|rounded-2xl\|rounded-3xl\|rounded-xl\|ring-1 ring-primary\|grid-cols-2\b\|max-h-\[60vh\]\|shadow-hover\|px-8 py-6" src/app/onboarding
```

Expected after refactor: no `rounded-full`/`rounded-2xl`/`rounded-3xl`/`rounded-xl` on inputs or step/nav buttons; no `ring-1 ring-primary` inputs; no bare `grid-cols-2` (must be `grid-cols-1 sm:grid-cols-2`); no `max-h-[60vh]`; no `shadow-hover`; no `px-8 py-6` pill buttons. The `rounded-xl`/`rounded-2xl` inside `ReviewIdCard` (avatar tile, photo button) are intentional and live in the component file, not the pages. Fix any stragglers in the pages to the canonical tokens.

- [ ] **Step 2: Mobile check at 360px**

Run `npm run dev`, open each flow at a 360px viewport (DevTools device toolbar). Confirm: header + card fit, no horizontal scroll, review grids are single-column, `OnboardingNav` stacks (primary on top). Fix any overflow with `min-w-0`/`truncate` as already applied in `ReviewIdCard`.

- [ ] **Step 3: Final verification**

Run: `cd frontend && npm run lint && npm run build`
Expected: PASS with only the 2 known unrelated warnings.

- [ ] **Step 4: Commit any sweep fixes**

```bash
git add -A frontend/src/app/onboarding frontend/src/components/ui
git commit -m "polish(onboarding): final consistency + responsive sweep"
```

- [ ] **Step 5: Delete spec + plan per standing rule**

After the plan executes cleanly and the branch builds:

```bash
git rm docs/superpowers/specs/2026-05-29-onboarding-design-unification-design.md \
       docs/superpowers/plans/2026-05-29-onboarding-design-unification.md
git commit -m "chore: remove completed onboarding design unification spec and plan"
```

---

## Self-Review

**Spec coverage:**
- Shell primitive → Tasks 2, 5, 6, 7. ✓
- Shared input style → Tasks 1, 6, 7. ✓
- Buttons/nav primitive → Tasks 3, 6, 7, 8, 9 (pills/rounded-2xl removed). ✓
- ReviewIdCard + shared error alert → Tasks 4, 8, 9. ✓
- Mobile (grid-cols-1 sm:grid-cols-2, stacking nav) → Tasks 4, 6–9, 10. ✓
- Motion (FadeIn, active:scale-95) → Task 2 (FadeIn in shell); button scale retained via `<Button>`. ✓
- Scope guard (no logic changes) → restated per task; the single allowed presentational `serverError` state in Task 10/Task 9 is explicitly scoped. ✓
- DESIGN.md radii/shadows → Canonical Token Decisions, applied throughout. ✓

**Placeholder scan:** No TBD/TODO; page-edit tasks that depend on unread files (patient 5, doctor 3, doctor 4) explicitly say "read the file first" and "match actual variable names" rather than inventing identifiers.

**Type consistency:** `OnboardingShell` props (`step,totalSteps,title,subtitle`), `OnboardingNav` props (`onBack,submitLabel,loadingLabel,loading,disabled,submitType,onSubmit`), and `ReviewIdCard` props (`idLabel,name,subtitle,photoUrl,uploadingPhoto,photoError,onPhotoChange,statusLabel`) are referenced consistently across all consuming tasks.
