# Onboarding Slug Routing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace numbered onboarding routes (`/onboarding/1`–`6`, `/onboarding/doctor/1`–`5`) with a single page per flow driven by a named `?step=<slug>` query param.

**Architecture:** Each flow gets one client page wrapped in `<Suspense>` that reads `?step=`, resolves it against a step registry (single source of order), guards deep-links against incomplete prerequisites, and renders the matched step inside `OnboardingShell`. Step bodies become body-only components that receive a `nav` prop instead of calling `router.push` with hardcoded numbers. Form logic, validation, and API calls are unchanged.

**Tech Stack:** Next.js 16.2.6 (App Router), React, react-hook-form + zod, vitest + @testing-library/react.

---

## Notes for the implementer

- **Next.js 16 caveat** (`frontend/AGENTS.md`): `useSearchParams` in a Client Component MUST sit under a `<Suspense>` boundary or the route deopts. `useSearchParams` is read-only; change the URL via `useRouter().push`/`replace`. These rules are already baked into the page code below — follow it verbatim.
- All paths below are relative to `frontend/`.
- Run all commands from `frontend/`. Test command: `npm test` (= `vitest run`). Single file: `npx vitest run <path>`.
- The numbered step source files are the reference bodies to copy from during extraction; they are NOT deleted until the final task, so they remain available while you work.
- Final slugs:
  - Patient (`/onboarding`): `personal`, `location`, `body-metrics`, `medical-history`, `photo`, `review`.
  - Doctor (`/onboarding/doctor`): `personal`, `credentials`, `specialization`, `practice`, `review`.

## File structure

**Create:**
- `src/components/onboarding/steps/types.ts` — `OnboardingNav`, `StepDef` interfaces.
- `src/components/onboarding/resolve-step.ts` — `resolveStepSlug()` pure resolver.
- `src/components/onboarding/resolve-step.test.ts`
- `src/components/onboarding/steps/patient/guard.ts` — `firstIncompletePatientSlug()`.
- `src/components/onboarding/steps/patient/guard.test.ts`
- `src/components/onboarding/steps/patient/{personal,location,body-metrics,medical-history,photo,review}.tsx`
- `src/components/onboarding/steps/patient/review.test.tsx` (moved from `app/onboarding/6/page.test.tsx`)
- `src/components/onboarding/steps/patient/registry.ts`
- `src/components/onboarding/steps/doctor/guard.ts` — `firstIncompleteDoctorSlug()`.
- `src/components/onboarding/steps/doctor/guard.test.ts`
- `src/components/onboarding/steps/doctor/{personal,credentials,specialization,practice,review}.tsx`
- `src/components/onboarding/steps/doctor/registry.ts`
- `src/app/onboarding/page.tsx` — patient switcher page.

**Modify:**
- `src/app/onboarding/doctor/page.tsx` — replace redirect with doctor switcher page.
- `src/middleware.ts:12` — add explicit `/onboarding` matcher entry.
- `src/app/page.tsx:49` — `redirect("/onboarding/1")` → `redirect("/onboarding")`.
- `src/app/(auth)/signup/page.tsx:49` — `router.push('/onboarding/1')` → `router.push('/onboarding')`.

**Delete (final task):**
- `src/app/onboarding/1` … `src/app/onboarding/6` (incl. `6/page.test.tsx`).
- `src/app/onboarding/doctor/1` … `src/app/onboarding/doctor/5`.

**Unchanged:** `src/app/onboarding/layout.tsx`, `src/app/onboarding/doctor/layout.tsx` (providers stay), `src/lib/schemas/onboarding.schemas.ts`, `src/lib/onboarding-styles.ts`, all profile/doctor-profile cards.

---

## Task 1: Shared types + step resolver

**Files:**
- Create: `src/components/onboarding/steps/types.ts`
- Create: `src/components/onboarding/resolve-step.ts`
- Test: `src/components/onboarding/resolve-step.test.ts`

- [ ] **Step 1: Create the shared types**

`src/components/onboarding/steps/types.ts`:

```ts
import type * as React from 'react';

export interface OnboardingNav {
  goNext: () => void;
  goBack: () => void;
  goTo: (slug: string) => void;
  goToReview: () => void;
}

export interface StepDef {
  slug: string;
  title: string;
  subtitle?: string;
  card?: boolean;
  Component: React.ComponentType<{ nav: OnboardingNav }>;
}
```

- [ ] **Step 2: Write the failing resolver test**

`src/components/onboarding/resolve-step.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { resolveStepSlug } from './resolve-step';

const slugs = ['personal', 'location', 'review'];

describe('resolveStepSlug', () => {
  it('falls back to the first slug when none is requested', () => {
    expect(resolveStepSlug(null, slugs, null)).toBe('personal');
  });

  it('falls back to the first slug when the requested slug is unknown', () => {
    expect(resolveStepSlug('bogus', slugs, null)).toBe('personal');
  });

  it('returns the requested slug when nothing blocks it', () => {
    expect(resolveStepSlug('location', slugs, null)).toBe('location');
  });

  it('redirects to the block slug when the requested step is past it', () => {
    expect(resolveStepSlug('review', slugs, 'personal')).toBe('personal');
  });

  it('allows the requested step when it is at or before the block slug', () => {
    expect(resolveStepSlug('personal', slugs, 'personal')).toBe('personal');
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npx vitest run src/components/onboarding/resolve-step.test.ts`
Expected: FAIL — cannot find module `./resolve-step`.

- [ ] **Step 4: Implement the resolver**

`src/components/onboarding/resolve-step.ts`:

```ts
/**
 * Decide which onboarding step slug to render.
 * - Unknown or missing slug → first step.
 * - If `blockSlug` is set (first incomplete prerequisite) and the requested
 *   step sits after it, redirect back to the block slug.
 */
export function resolveStepSlug(
  requested: string | null,
  slugs: string[],
  blockSlug: string | null,
): string {
  const fallback = slugs[0];
  if (!requested || !slugs.includes(requested)) return fallback;
  if (blockSlug) {
    const blockIdx = slugs.indexOf(blockSlug);
    const reqIdx = slugs.indexOf(requested);
    if (reqIdx > blockIdx) return blockSlug;
  }
  return requested;
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run src/components/onboarding/resolve-step.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 6: Commit**

```bash
git add src/components/onboarding/steps/types.ts src/components/onboarding/resolve-step.ts src/components/onboarding/resolve-step.test.ts
git commit -m "feat(onboarding): step types and slug resolver"
```

---

## Task 2: Patient guard

**Files:**
- Create: `src/components/onboarding/steps/patient/guard.ts`
- Test: `src/components/onboarding/steps/patient/guard.test.ts`

Patient flow only hard-gates the `personal` step (steps 2–5 are optional/skippable). Once personal is valid, every step including `review` is reachable.

- [ ] **Step 1: Write the failing test**

`src/components/onboarding/steps/patient/guard.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { firstIncompletePatientSlug } from './guard';
import { ONBOARDING_DEFAULTS } from '@/types/patient';

describe('firstIncompletePatientSlug', () => {
  it('returns "personal" when required personal fields are missing', () => {
    expect(firstIncompletePatientSlug(ONBOARDING_DEFAULTS)).toBe('personal');
  });

  it('returns null once personal info is complete', () => {
    const data = {
      ...ONBOARDING_DEFAULTS,
      fullName: 'Juan Dela Cruz',
      birthdate: '1990-01-01',
      contactDetails: '9171234567',
    };
    expect(firstIncompletePatientSlug(data)).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/components/onboarding/steps/patient/guard.test.ts`
Expected: FAIL — cannot find module `./guard`.

- [ ] **Step 3: Implement the guard**

`src/components/onboarding/steps/patient/guard.ts`:

```ts
import { step1Schema } from '@/lib/schemas/onboarding.schemas';
import type { OnboardingData } from '@/types/patient';

/** First step the patient still needs to complete, or null if cleared to roam. */
export function firstIncompletePatientSlug(data: OnboardingData): string | null {
  const personalOk = step1Schema.safeParse({
    fullName: data.fullName,
    birthdate: data.birthdate,
    contactDetails: data.contactDetails,
  }).success;
  return personalOk ? null : 'personal';
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/components/onboarding/steps/patient/guard.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/onboarding/steps/patient/guard.ts src/components/onboarding/steps/patient/guard.test.ts
git commit -m "feat(onboarding): patient step guard"
```

---

## Task 3: Doctor guard

**Files:**
- Create: `src/components/onboarding/steps/doctor/guard.ts`
- Test: `src/components/onboarding/steps/doctor/guard.test.ts`

Doctor flow is sequential: `personal` → `credentials` → `specialization` are all required before later steps.

- [ ] **Step 1: Write the failing test**

`src/components/onboarding/steps/doctor/guard.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { firstIncompleteDoctorSlug } from './guard';
import { DOCTOR_ONBOARDING_DEFAULTS } from '@/types/doctor-onboarding';

const withPersonal = {
  ...DOCTOR_ONBOARDING_DEFAULTS,
  fullName: 'Dr. Jane Doe',
  professionalTitle: 'MD',
};
const withCreds = {
  ...withPersonal,
  prcLicenseNo: '1234567',
  prcLicenseExpiry: '2999-01-01',
};
const complete = { ...withCreds, specialization: 'Cardiology' };

describe('firstIncompleteDoctorSlug', () => {
  it('returns "personal" when name/title missing', () => {
    expect(firstIncompleteDoctorSlug(DOCTOR_ONBOARDING_DEFAULTS)).toBe('personal');
  });

  it('returns "credentials" when only personal is done', () => {
    expect(firstIncompleteDoctorSlug(withPersonal)).toBe('credentials');
  });

  it('returns "specialization" when credentials are done but specialization is blank', () => {
    expect(firstIncompleteDoctorSlug(withCreds)).toBe('specialization');
  });

  it('returns null when all required steps are complete', () => {
    expect(firstIncompleteDoctorSlug(complete)).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/components/onboarding/steps/doctor/guard.test.ts`
Expected: FAIL — cannot find module `./guard`.

- [ ] **Step 3: Implement the guard**

`src/components/onboarding/steps/doctor/guard.ts`:

```ts
import { doctorCredentialsSchema } from '@/lib/schemas/onboarding.schemas';
import type { DoctorOnboardingData } from '@/types/doctor-onboarding';

/** First required step the doctor still needs to complete, or null if all done. */
export function firstIncompleteDoctorSlug(data: DoctorOnboardingData): string | null {
  if (!data.fullName.trim() || !data.professionalTitle.trim()) return 'personal';

  const credsOk = doctorCredentialsSchema.safeParse({
    prcLicenseNo: data.prcLicenseNo,
    prcLicenseExpiry: data.prcLicenseExpiry,
    ptrNo: data.ptrNo,
    region: data.region,
    city: data.city,
  }).success;
  if (!credsOk) return 'credentials';

  if (!data.specialization.trim()) return 'specialization';
  return null;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/components/onboarding/steps/doctor/guard.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/onboarding/steps/doctor/guard.ts src/components/onboarding/steps/doctor/guard.test.ts
git commit -m "feat(onboarding): doctor step guard"
```

---

## Task 4: Extract patient step components

Each new component is the **exact body** of the matching numbered page, with three mechanical changes:

1. Change the declaration to a named export taking a `nav` prop:
   `export function <Name>({ nav }: { nav: OnboardingNav })`
2. Remove the `<OnboardingShell …>` wrapper element (and its `import`) — keep only its children. The page now supplies the shell.
3. Replace every `router.push('/onboarding/…')` per the table below. Remove the now-unused `useRouter` import + `const router = useRouter()` **unless** the table says to keep it.

Add `import type { OnboardingNav } from '@/components/onboarding/steps/types';` to every file.

| New file | Copy body from | Export name | router.push replacements | Keep `useRouter`? |
|---|---|---|---|---|
| `patient/personal.tsx` | `app/onboarding/1/page.tsx` | `PersonalStep` | `/onboarding/2` → `nav.goNext()` | No |
| `patient/location.tsx` | `app/onboarding/2/page.tsx` | `LocationStep` | `/onboarding/3` → `nav.goNext()`; `/onboarding/1` → `nav.goBack()`; `/onboarding/6` → `nav.goToReview()` | No |
| `patient/body-metrics.tsx` | `app/onboarding/3/page.tsx` | `BodyMetricsStep` | `/onboarding/4` → `nav.goNext()`; `/onboarding/2` → `nav.goBack()`; `/onboarding/6` → `nav.goToReview()` | No |
| `patient/medical-history.tsx` | `app/onboarding/4/page.tsx` | `MedicalHistoryStep` | `/onboarding/5` → `nav.goNext()`; `/onboarding/3` → `nav.goBack()`; `/onboarding/6` → `nav.goToReview()` | No |
| `patient/photo.tsx` | `app/onboarding/5/page.tsx` | `PhotoStep` | both `/onboarding/6` (in `handleUploadAndContinue`) → `nav.goToReview()`; `/onboarding/4` → `nav.goBack()`; onSkip `/onboarding/6` → `nav.goToReview()` | No |
| `patient/review.tsx` | `app/onboarding/6/page.tsx` | `ReviewStep` | `/onboarding/5` → `nav.goBack()`; **keep** `router.push('/')` as-is | **Yes** |

Notes:
- `personal.tsx`: the body is the `<form>…</form>` currently inside `<OnboardingShell>`.
- `photo.tsx` and `review.tsx` currently return a fragment with siblings outside the shell (`CameraCapture`, `Toast`). Keep those siblings — they become part of the returned fragment alongside the former shell children (they are fixed-position overlays, unaffected by living inside the shell `<main>`). Example return shape for `review.tsx`:
  ```tsx
  return (
    <>
      <ReviewIdCard …>…</ReviewIdCard>
      {serverError && <ReviewErrorAlert message={serverError} onRetry={handleSubmit} />}
      <OnboardingNav onBack={() => nav.goBack()} submitType="button" onSubmit={handleSubmit} loading={submitting} submitLabel="Generate ID Card ✓" />
      {showToast && <Toast message="Profile verified! Redirecting to dashboard..." variant="success" />}
    </>
  );
  ```

- [ ] **Step 1: Create `patient/personal.tsx`** per the table.
- [ ] **Step 2: Create `patient/location.tsx`** per the table.
- [ ] **Step 3: Create `patient/body-metrics.tsx`** per the table.
- [ ] **Step 4: Create `patient/medical-history.tsx`** per the table.
- [ ] **Step 5: Create `patient/photo.tsx`** per the table.
- [ ] **Step 6: Create `patient/review.tsx`** per the table.

- [ ] **Step 7: Typecheck the new components**

Run: `npx tsc --noEmit`
Expected: no errors in the new `patient/*.tsx` files. (Pre-existing errors elsewhere, if any, are out of scope — confirm none reference these new files.)

- [ ] **Step 8: Commit**

```bash
git add src/components/onboarding/steps/patient/
git commit -m "refactor(onboarding): extract patient step components"
```

---

## Task 5: Patient registry

**Files:**
- Create: `src/components/onboarding/steps/patient/registry.ts`

- [ ] **Step 1: Create the registry**

`src/components/onboarding/steps/patient/registry.ts`:

```ts
import type { StepDef } from '@/components/onboarding/steps/types';
import { PersonalStep } from './personal';
import { LocationStep } from './location';
import { BodyMetricsStep } from './body-metrics';
import { MedicalHistoryStep } from './medical-history';
import { PhotoStep } from './photo';
import { ReviewStep } from './review';

export const PATIENT_BASE_PATH = '/onboarding';

// Order lives here. Reordering / adding / removing a step = edit this array only.
export const PATIENT_STEPS: StepDef[] = [
  { slug: 'personal', title: 'Personal Information', subtitle: 'Tell us a little about yourself so your doctors have context.', Component: PersonalStep },
  { slug: 'location', title: 'Location & Insurance', subtitle: 'Optional — helps with billing and connecting you to nearby care. You can skip any field.', Component: LocationStep },
  { slug: 'body-metrics', title: 'Body Metrics', subtitle: 'Your weight and height help doctors give accurate advice.', Component: BodyMetricsStep },
  { slug: 'medical-history', title: 'Medical History', subtitle: 'Helps your doctor understand your health context. All optional and kept private — separate items with commas.', Component: MedicalHistoryStep },
  { slug: 'photo', title: 'Profile Picture', subtitle: 'Add a photo so doctors can recognise you — optional.', Component: PhotoStep },
  { slug: 'review', title: 'One last check', subtitle: 'Tap EDIT on any field to fix it right here.', card: false, Component: ReviewStep },
];
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors referencing the registry.

- [ ] **Step 3: Commit**

```bash
git add src/components/onboarding/steps/patient/registry.ts
git commit -m "feat(onboarding): patient step registry"
```

---

## Task 6: Patient switcher page

**Files:**
- Create: `src/app/onboarding/page.tsx`

- [ ] **Step 1: Create the page**

`src/app/onboarding/page.tsx`:

```tsx
'use client';

import * as React from 'react';
import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useOnboarding } from '@/context/onboarding-context';
import { OnboardingShell } from '@/components/ui/onboarding-shell';
import { PATIENT_STEPS, PATIENT_BASE_PATH } from '@/components/onboarding/steps/patient/registry';
import { firstIncompletePatientSlug } from '@/components/onboarding/steps/patient/guard';
import { resolveStepSlug } from '@/components/onboarding/resolve-step';
import type { OnboardingNav } from '@/components/onboarding/steps/types';

const SLUGS = PATIENT_STEPS.map((s) => s.slug);

function PatientOnboardingInner() {
  const router = useRouter();
  const params = useSearchParams();
  const { data } = useOnboarding();

  const requested = params.get('step');
  const blockSlug = firstIncompletePatientSlug(data);
  const slug = resolveStepSlug(requested, SLUGS, blockSlug);

  // Keep the URL in sync with the resolved step (rewrite unknown/blocked/missing).
  React.useEffect(() => {
    if (requested !== slug) {
      router.replace(`${PATIENT_BASE_PATH}?step=${slug}`);
    }
  }, [requested, slug, router]);

  const idx = SLUGS.indexOf(slug);
  const step = PATIENT_STEPS[idx];

  const go = React.useCallback(
    (s: string) => router.push(`${PATIENT_BASE_PATH}?step=${s}`),
    [router],
  );
  const nav: OnboardingNav = {
    goNext: () => go(SLUGS[Math.min(idx + 1, SLUGS.length - 1)]),
    goBack: () => go(SLUGS[Math.max(idx - 1, 0)]),
    goTo: go,
    goToReview: () => go(SLUGS[SLUGS.length - 1]),
  };

  const Step = step.Component;
  return (
    <OnboardingShell
      step={idx + 1}
      totalSteps={PATIENT_STEPS.length}
      title={step.title}
      subtitle={step.subtitle}
      card={step.card ?? true}
    >
      <Step nav={nav} />
    </OnboardingShell>
  );
}

export default function PatientOnboardingPage() {
  return (
    <Suspense fallback={null}>
      <PatientOnboardingInner />
    </Suspense>
  );
}
```

- [ ] **Step 2: Manual smoke check (dev server)**

Run: `npm run dev`, visit `http://localhost:3000/onboarding` while logged in as a patient with no profile.
Expected: URL rewrites to `/onboarding?step=personal`; the Personal Information step renders inside the shell; Continue advances to `?step=location`; Back returns; deep-linking `/onboarding?step=review` with empty data bounces to `?step=personal`. Stop the dev server when done.

- [ ] **Step 3: Typecheck + commit**

Run: `npx tsc --noEmit` (expect no errors referencing this page).

```bash
git add src/app/onboarding/page.tsx
git commit -m "feat(onboarding): patient slug-driven switcher page"
```

---

## Task 7: Extract doctor step components

Same mechanical rules as Task 4 (named export taking `{ nav }`, strip `OnboardingShell` wrapper + import, add `OnboardingNav` import, swap `router.push`).

| New file | Copy body from | Export name | router.push replacements | Keep `useRouter`? |
|---|---|---|---|---|
| `doctor/personal.tsx` | `app/onboarding/doctor/1/page.tsx` | `PersonalStep` | both `/onboarding/doctor/2` → `nav.goNext()` | No |
| `doctor/credentials.tsx` | `app/onboarding/doctor/2/page.tsx` | `CredentialsStep` | `/onboarding/doctor/3` → `nav.goNext()`; `/onboarding/doctor/1` → `nav.goBack()` | No |
| `doctor/specialization.tsx` | `app/onboarding/doctor/3/page.tsx` | `SpecializationStep` | `/onboarding/doctor/4` → `nav.goNext()`; `/onboarding/doctor/2` → `nav.goBack()` | No |
| `doctor/practice.tsx` | `app/onboarding/doctor/4/page.tsx` | `PracticeStep` | `/onboarding/doctor/5` → `nav.goNext()`; `/onboarding/doctor/3` → `nav.goBack()` | No |
| `doctor/review.tsx` | `app/onboarding/doctor/5/page.tsx` | `ReviewStep` | `/onboarding/doctor/4` → `nav.goBack()`; **keep** `router.push('/doctor/dashboard')` as-is | **Yes** |

Note: `doctor/review.tsx` keeps its trailing `{toast && <Toast … />}` sibling in the returned fragment, as in Task 4's review example.

- [ ] **Step 1: Create `doctor/personal.tsx`** per the table.
- [ ] **Step 2: Create `doctor/credentials.tsx`** per the table.
- [ ] **Step 3: Create `doctor/specialization.tsx`** per the table.
- [ ] **Step 4: Create `doctor/practice.tsx`** per the table.
- [ ] **Step 5: Create `doctor/review.tsx`** per the table.

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors referencing the new `doctor/*.tsx` files.

- [ ] **Step 7: Commit**

```bash
git add src/components/onboarding/steps/doctor/personal.tsx src/components/onboarding/steps/doctor/credentials.tsx src/components/onboarding/steps/doctor/specialization.tsx src/components/onboarding/steps/doctor/practice.tsx src/components/onboarding/steps/doctor/review.tsx
git commit -m "refactor(onboarding): extract doctor step components"
```

---

## Task 8: Doctor registry

**Files:**
- Create: `src/components/onboarding/steps/doctor/registry.ts`

- [ ] **Step 1: Create the registry**

`src/components/onboarding/steps/doctor/registry.ts`:

```ts
import type { StepDef } from '@/components/onboarding/steps/types';
import { PersonalStep } from './personal';
import { CredentialsStep } from './credentials';
import { SpecializationStep } from './specialization';
import { PracticeStep } from './practice';
import { ReviewStep } from './review';

export const DOCTOR_BASE_PATH = '/onboarding/doctor';

// Order lives here. Reordering / adding / removing a step = edit this array only.
export const DOCTOR_STEPS: StepDef[] = [
  { slug: 'personal', title: 'Personal Information', subtitle: 'Let patients know who they are consulting with.', Component: PersonalStep },
  { slug: 'credentials', title: 'Credentials & Licensure', subtitle: 'Required for verification. Your PRC license confirms you are licensed to practice.', Component: CredentialsStep },
  { slug: 'specialization', title: 'Specialization & Experience', subtitle: 'Help patients understand your expertise.', Component: SpecializationStep },
  { slug: 'practice', title: 'Practice Details', subtitle: 'Share more about your practice and availability.', Component: PracticeStep },
  { slug: 'review', title: 'Review Your Profile', subtitle: 'Tap EDIT on any field to fix it right here.', card: false, Component: ReviewStep },
];
```

- [ ] **Step 2: Typecheck + commit**

Run: `npx tsc --noEmit` (expect no new errors).

```bash
git add src/components/onboarding/steps/doctor/registry.ts
git commit -m "feat(onboarding): doctor step registry"
```

---

## Task 9: Doctor switcher page

**Files:**
- Modify: `src/app/onboarding/doctor/page.tsx` (replace the redirect-to-`/1` body entirely)

- [ ] **Step 1: Replace the page contents**

`src/app/onboarding/doctor/page.tsx`:

```tsx
'use client';

import * as React from 'react';
import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useDoctorOnboarding } from '@/context/doctor-onboarding-context';
import { OnboardingShell } from '@/components/ui/onboarding-shell';
import { DOCTOR_STEPS, DOCTOR_BASE_PATH } from '@/components/onboarding/steps/doctor/registry';
import { firstIncompleteDoctorSlug } from '@/components/onboarding/steps/doctor/guard';
import { resolveStepSlug } from '@/components/onboarding/resolve-step';
import type { OnboardingNav } from '@/components/onboarding/steps/types';

const SLUGS = DOCTOR_STEPS.map((s) => s.slug);

function DoctorOnboardingInner() {
  const router = useRouter();
  const params = useSearchParams();
  const { data } = useDoctorOnboarding();

  const requested = params.get('step');
  const blockSlug = firstIncompleteDoctorSlug(data);
  const slug = resolveStepSlug(requested, SLUGS, blockSlug);

  React.useEffect(() => {
    if (requested !== slug) {
      router.replace(`${DOCTOR_BASE_PATH}?step=${slug}`);
    }
  }, [requested, slug, router]);

  const idx = SLUGS.indexOf(slug);
  const step = DOCTOR_STEPS[idx];

  const go = React.useCallback(
    (s: string) => router.push(`${DOCTOR_BASE_PATH}?step=${s}`),
    [router],
  );
  const nav: OnboardingNav = {
    goNext: () => go(SLUGS[Math.min(idx + 1, SLUGS.length - 1)]),
    goBack: () => go(SLUGS[Math.max(idx - 1, 0)]),
    goTo: go,
    goToReview: () => go(SLUGS[SLUGS.length - 1]),
  };

  const Step = step.Component;
  return (
    <OnboardingShell
      step={idx + 1}
      totalSteps={DOCTOR_STEPS.length}
      title={step.title}
      subtitle={step.subtitle}
      card={step.card ?? true}
    >
      <Step nav={nav} />
    </OnboardingShell>
  );
}

export default function DoctorOnboardingPage() {
  return (
    <Suspense fallback={null}>
      <DoctorOnboardingInner />
    </Suspense>
  );
}
```

- [ ] **Step 2: Manual smoke check (dev server)**

Run: `npm run dev`, visit `/onboarding/doctor` as a doctor with no profile.
Expected: rewrites to `?step=personal`; sequential nav works; deep-linking `?step=review` with empty data bounces to the first incomplete required step. Stop the dev server when done.

- [ ] **Step 3: Typecheck + commit**

Run: `npx tsc --noEmit` (expect no new errors).

```bash
git add src/app/onboarding/doctor/page.tsx
git commit -m "feat(onboarding): doctor slug-driven switcher page"
```

---

## Task 10: Update external references

**Files:**
- Modify: `src/middleware.ts`
- Modify: `src/app/page.tsx`
- Modify: `src/app/(auth)/signup/page.tsx`

- [ ] **Step 1: Add explicit `/onboarding` to the middleware matcher**

In `src/middleware.ts`, the matcher currently has `"/onboarding/:path*"` (which does not match the bare `/onboarding`). Add a sibling entry so the new patient page is protected:

```ts
    "/onboarding",
    "/onboarding/:path*",
```

- [ ] **Step 2: Fix the patient home redirect**

In `src/app/page.tsx:49`, change:

```ts
        redirect("/onboarding/1");
```

to:

```ts
        redirect("/onboarding");
```

- [ ] **Step 3: Fix the patient signup redirect**

In `src/app/(auth)/signup/page.tsx:49`, change:

```ts
        router.push('/onboarding/1');
```

to:

```ts
        router.push('/onboarding');
```

(The doctor refs — `signup/doctor`, `doctor/dashboard`, `doctor/schedule` — already point at `/onboarding/doctor`, which is now the real page. No change.)

- [ ] **Step 4: Typecheck + commit**

Run: `npx tsc --noEmit` (expect no new errors).

```bash
git add src/middleware.ts src/app/page.tsx "src/app/(auth)/signup/page.tsx"
git commit -m "refactor(onboarding): point entry redirects at slug routes"
```

---

## Task 11: Move review test, delete numbered routes, verify

**Files:**
- Create: `src/components/onboarding/steps/patient/review.test.tsx`
- Delete: `src/app/onboarding/1` … `6`, `src/app/onboarding/doctor/1` … `5`

- [ ] **Step 1: Create the moved patient review test**

The old `app/onboarding/6/page.test.tsx` asserted the shell title `'One last check'`, which now lives on the page (not the step). Drop that assertion; keep the rest, render `ReviewStep` with a stub `nav`.

`src/components/onboarding/steps/patient/review.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { OnboardingProvider } from '@/context/onboarding-context';
import { ReviewStep } from './review';
import type { OnboardingNav } from '@/components/onboarding/steps/types';

vi.mock('next-auth/react', () => ({
  useSession: () => ({ data: { user: { accessToken: 'tok', role: 'PATIENT' } }, status: 'authenticated' }),
  signOut: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => '/onboarding',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

const nav: OnboardingNav = {
  goNext: vi.fn(),
  goBack: vi.fn(),
  goTo: vi.fn(),
  goToReview: vi.fn(),
};

const seed = {
  fullName: 'Juan Dela Cruz',
  birthdate: '1990-01-01',
  contactDetails: '9171234567',
  weightKg: 70,
  heightCm: 175,
  city: 'Manila',
  bloodType: 'O+',
  allergies: 'Penicillin',
};

beforeEach(() => {
  window.sessionStorage.setItem('ginhawa.onboarding.patient', JSON.stringify(seed));
  vi.stubGlobal(
    'fetch',
    vi.fn(() => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({}) } as Response)),
  );
});

afterEach(() => {
  window.sessionStorage.clear();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function renderStep() {
  return render(
    <OnboardingProvider>
      <ReviewStep nav={nav} />
    </OnboardingProvider>,
  );
}

describe('patient ReviewStep', () => {
  it('renders the digital ID card and submit button', () => {
    renderStep();
    expect(screen.getByText('Digital Patient ID')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Generate ID Card/i })).toBeInTheDocument();
  });

  it('renders the always-present identity rows', () => {
    renderStep();
    expect(screen.getByText('Full Name')).toBeInTheDocument();
    expect(screen.getByText('Date of Birth')).toBeInTheDocument();
    expect(screen.getByText('Contact Info')).toBeInTheDocument();
    expect(screen.getByText('Metrics')).toBeInTheDocument();
  });

  it('renders the location/insurance group when those fields are present', () => {
    renderStep();
    expect(screen.getByText('Location')).toBeInTheDocument();
    expect(screen.getByText('PhilHealth ID')).toBeInTheDocument();
    expect(screen.getByText('HMO')).toBeInTheDocument();
  });

  it('renders the medical group when those fields are present', () => {
    renderStep();
    expect(screen.getByText('Blood Type')).toBeInTheDocument();
    expect(screen.getByText('Smoking')).toBeInTheDocument();
    expect(screen.getByText('Allergies')).toBeInTheDocument();
    expect(screen.getByText('Chronic Conditions')).toBeInTheDocument();
    expect(screen.getByText('Current Medications')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the moved test to verify it passes**

Run: `npx vitest run src/components/onboarding/steps/patient/review.test.tsx`
Expected: PASS (4 tests).

- [ ] **Step 3: Delete the numbered route folders**

```bash
git rm -r src/app/onboarding/1 src/app/onboarding/2 src/app/onboarding/3 src/app/onboarding/4 src/app/onboarding/5 src/app/onboarding/6
git rm -r src/app/onboarding/doctor/1 src/app/onboarding/doctor/2 src/app/onboarding/doctor/3 src/app/onboarding/doctor/4 src/app/onboarding/doctor/5
```

- [ ] **Step 4: Verify no dangling references to numbered routes remain**

Run: `grep -rnE "/onboarding/[0-9]|/onboarding/doctor/[0-9]" src`
Expected: no output.

- [ ] **Step 5: Full verification**

Run each, all must pass clean:
```bash
npx tsc --noEmit
npm test
npm run build
```
Expected: typecheck clean; full vitest suite green; production build succeeds (no static-rendering deopt error — the `<Suspense>` boundaries prevent it).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "refactor(onboarding): drop numbered routes, move review test"
```

---

## Self-review notes (for the implementer)

- **Spec coverage:** slug routes (Tasks 6, 9) · registry single-source order (Tasks 5, 8) · guard/redirect-to-first-incomplete (Tasks 2, 3 + pages) · drop old URLs, no shims (Task 11) · external ref updates (Task 10) · shell lifted to page / Option A (Tasks 4, 6, 7, 9) · tests incl. moved review test (Tasks 1–3, 11). All covered.
- **Type consistency:** `OnboardingNav` / `StepDef` defined in Task 1, used identically in every step component, registry, page, and test. `firstIncompletePatientSlug` / `firstIncompleteDoctorSlug` / `resolveStepSlug` signatures match their call sites in the pages. `PATIENT_BASE_PATH` / `DOCTOR_BASE_PATH` and `PATIENT_STEPS` / `DOCTOR_STEPS` names match between registry and page imports.
- **Out of scope (unchanged):** zod schema names, `onboarding-styles.ts`, profile/doctor-profile cards, onboarding layouts/providers.
