# Onboarding New Schema Fields — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the additive patient/doctor schema fields the backend already accepts into the Next.js onboarding flows: patient gains a Location & Insurance step + structured medical history; doctor gains a Credentials (PRC) step.

**Architecture:** Pure frontend. Patient flow 5→6 steps (insert step 2, restructure medical step). Doctor flow 4→5 steps (insert step 2). Multi-step state lives in existing React context providers; per-step validation uses react-hook-form + zod (matching existing patient steps). No backend changes — every DTO/endpoint already validates these fields.

**Tech Stack:** Next.js (App Router), React, react-hook-form, zod, Tailwind. No test framework — verification is `npm run lint` + `npm run build` (tsc via next build).

**Conventions:**
- All commands run from `frontend/` unless noted.
- Verification gate per task: `npm run lint && npm run build` must pass clean.
- Reuse existing components: `FormField`, `Button`, `ProgressIndicator`, `Spinner`, `Toast`, `PhoneInput`, `BirthdateInput`.
- List fields stored as comma strings in context, split to arrays only at submit.
- Standard input class (copy verbatim where used):
  `'w-full rounded-md border border-outline-variant bg-surface-white px-3 py-2.5 text-sm text-on-surface font-manrope placeholder:text-outline transition-colors focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 aria-[invalid=true]:border-error'`

---

## PART A — PATIENT FLOW

### Task 1: Patient onboarding types

**Files:**
- Modify: `frontend/src/types/patient.ts`

- [ ] **Step 1: Replace `OnboardingData`, `ONBOARDING_DEFAULTS`, `CreatePatientProfileBody`; add `UpdateMedicalHistoryBody`**

Replace lines 1–61 (the `OnboardingData` interface, `ONBOARDING_DEFAULTS`, and `CreatePatientProfileBody`) with:

```ts
// frontend/src/types/patient.ts

export interface OnboardingData {
  // Step 1 — Personal
  fullName: string;
  birthdate: string;       // ISO date string "YYYY-MM-DD"
  contactDetails: string;
  // Step 2 — Location & Insurance (all optional)
  address: string;
  city: string;
  region: string;
  philhealthId: string;
  hmoProvider: string;
  hmoCardNo: string;
  // Step 3 — Metrics
  weightKg: number | null;
  heightCm: number | null;
  // Step 4 — Medical History (lists held as comma strings, split on submit)
  bloodType: string;
  allergies: string;
  chronicConditions: string;
  currentMedications: string;
  pastSurgeries: string;
  familyHistory: string;
  smokingStatus: string;
  // Step 5 — Photo
  profilePictureUrl: string | null;
}

export const ONBOARDING_DEFAULTS: OnboardingData = {
  fullName: '',
  birthdate: '',
  contactDetails: '',
  address: '',
  city: '',
  region: '',
  philhealthId: '',
  hmoProvider: '',
  hmoCardNo: '',
  weightKg: null,
  heightCm: null,
  bloodType: '',
  allergies: '',
  chronicConditions: '',
  currentMedications: '',
  pastSurgeries: '',
  familyHistory: '',
  smokingStatus: '',
  profilePictureUrl: null,
};

/** Body sent to POST/PATCH /patients/profile */
export interface CreatePatientProfileBody {
  fullName: string;
  birthdate: string;
  /** Weight in kilograms — maps from OnboardingData.weightKg */
  weight?: number;
  /** Height in centimetres — maps from OnboardingData.heightCm */
  height?: number;
  profilePictureUrl?: string;
  contactDetails?: string;
  address?: string;
  city?: string;
  region?: string;
  philhealthId?: string;
  hmoProvider?: string;
  hmoCardNo?: string;
}

/** Body sent to PATCH /patients/medical-history */
export interface UpdateMedicalHistoryBody {
  bloodType?: string;
  allergies?: string[];
  chronicConditions?: string[];
  currentMedications?: string[];
  pastSurgeries?: string;
  familyHistory?: string;
  smokingStatus?: string;
}
```

Leave the `PatientProfile` interface (the GET read shape) unchanged — onboarding does not read it.

- [ ] **Step 2: Verify**

Run: `npm run lint && npm run build`
Expected: build fails with type errors in `onboarding/3/page.tsx` and `onboarding/5/page.tsx` (they still reference removed `conditions`/`medications`). **This is expected** — those pages are fixed in Tasks 5 and 6. Do not commit yet; continue to Task 2 (commit happens after the schema change so the type layer is internally consistent). If you prefer a green commit, you may commit after Task 6.

---

### Task 2: Patient onboarding zod schemas

**Files:**
- Modify: `frontend/src/lib/schemas/onboarding.schemas.ts`

- [ ] **Step 1: Replace `step3Schema` with two new schemas; keep `step1Schema`/`step2Schema`**

Replace the `step3Schema` block (lines 25–29) and the `Step3Schema` type export (line 33) with:

```ts
export const locationInsuranceSchema = z.object({
  address: z.string().optional(),
  city: z.string().optional(),
  region: z.string().optional(),
  philhealthId: z.string().optional(),
  hmoProvider: z.string().optional(),
  hmoCardNo: z.string().optional(),
});

export const medicalHistorySchema = z.object({
  bloodType: z.string().optional(),
  allergies: z.string().optional(),
  chronicConditions: z.string().optional(),
  currentMedications: z.string().optional(),
  pastSurgeries: z.string().optional(),
  familyHistory: z.string().optional(),
  smokingStatus: z.string().optional(),
});
```

And replace `export type Step3Schema = z.infer<typeof step3Schema>;` with:

```ts
export type LocationInsuranceSchema = z.infer<typeof locationInsuranceSchema>;
export type MedicalHistorySchema = z.infer<typeof medicalHistorySchema>;
```

Keep `step1Schema`, `step2Schema`, and their type exports unchanged.

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit -p tsconfig.json` (or rely on `npm run build` after Task 6)
Expected: schema file itself has no errors. Page errors remain until Tasks 3–6.

---

### Task 3: Renumber patient route files + fix nav on unchanged pages

This moves the four existing later steps up by one and fixes navigation/progress on the pages whose **content** is otherwise unchanged (step 1 Personal, metrics, photo). Medical and Review pages are rewritten in Tasks 5–6.

**Files (moves, descending to avoid collisions):**
- `frontend/src/app/onboarding/5` → `6`
- `frontend/src/app/onboarding/4` → `5`
- `frontend/src/app/onboarding/3` → `4`
- `frontend/src/app/onboarding/2` → `3`

- [ ] **Step 1: Move the directories (from repo root)**

```bash
cd /home/vincentdev/vincent-projects/launchpad/telehealth-app
git mv frontend/src/app/onboarding/5 frontend/src/app/onboarding/6
git mv frontend/src/app/onboarding/4 frontend/src/app/onboarding/5
git mv frontend/src/app/onboarding/3 frontend/src/app/onboarding/4
git mv frontend/src/app/onboarding/2 frontend/src/app/onboarding/3
```

After this: `3`=metrics, `4`=medical(old step3), `5`=photo, `6`=review. Slot `2` is now free for the new Location & Insurance page.

- [ ] **Step 2: Fix step 1 (Personal) — `onboarding/1/page.tsx`**

Change the progress total only:
- `<ProgressIndicator currentStep={1} totalSteps={5} />` → `totalSteps={6}`

The `router.push('/onboarding/2')` is correct as-is (now points to the new Location step).

- [ ] **Step 3: Fix metrics page — `onboarding/3/page.tsx`** (moved from `2`)

Apply these exact replacements:
- `<ProgressIndicator currentStep={2} totalSteps={5} />` → `currentStep={3} totalSteps={6}`
- `router.push('/onboarding/3')` (in `onSubmit`) → `router.push('/onboarding/4')`
- `onClick={() => router.push('/onboarding/1')}` (Back button) → `router.push('/onboarding/2')`

- [ ] **Step 4: Fix photo page — `onboarding/5/page.tsx`** (moved from `4`)

Apply these exact replacements:
- `<ProgressIndicator currentStep={4} totalSteps={5} />` → `currentStep={5} totalSteps={6}`
- Both occurrences of `router.push('/onboarding/5')` → `router.push('/onboarding/6')` (in the no-file early-return and after upload)
- `onClick={() => router.push('/onboarding/3')}` (Back button) → `router.push('/onboarding/4')`

- [ ] **Step 5: Verify**

Run: `npm run lint`
Expected: PASS (build still errors only in `4`=medical and `6`=review, fixed next).

---

### Task 4: New Location & Insurance step

**Files:**
- Create: `frontend/src/app/onboarding/2/page.tsx`

- [ ] **Step 1: Create the page**

```tsx
// frontend/src/app/onboarding/2/page.tsx
'use client';

import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  locationInsuranceSchema,
  type LocationInsuranceSchema,
} from '@/lib/schemas/onboarding.schemas';
import { useOnboarding } from '@/context/onboarding-context';
import { ProgressIndicator } from '@/components/ui/progress-indicator';
import { FormField } from '@/components/ui/form-field';
import { Button } from '@/components/ui/button';

export default function OnboardingStep2() {
  const router = useRouter();
  const { data, update } = useOnboarding();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LocationInsuranceSchema>({
    resolver: zodResolver(locationInsuranceSchema),
    defaultValues: {
      address: data.address,
      city: data.city,
      region: data.region,
      philhealthId: data.philhealthId,
      hmoProvider: data.hmoProvider,
      hmoCardNo: data.hmoCardNo,
    },
    mode: 'onBlur',
  });

  const onSubmit = (values: LocationInsuranceSchema) => {
    update({
      address: values.address ?? '',
      city: values.city ?? '',
      region: values.region ?? '',
      philhealthId: values.philhealthId ?? '',
      hmoProvider: values.hmoProvider ?? '',
      hmoCardNo: values.hmoCardNo ?? '',
    });
    router.push('/onboarding/3');
  };

  const inputClass =
    'w-full rounded-md border border-outline-variant bg-surface-white px-3 py-2.5 text-sm text-on-surface font-manrope placeholder:text-outline transition-colors focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 aria-[invalid=true]:border-error';

  return (
    <div className="flex flex-col gap-6">
      <ProgressIndicator currentStep={2} totalSteps={6} />
      <div>
        <h1 className="text-2xl font-semibold text-text-primary font-plus-jakarta">
          Location & Insurance
        </h1>
        <p className="mt-1 text-sm text-on-surface-variant font-manrope">
          Optional — helps with billing and connecting you to nearby care. You can skip any field.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
        <FormField id="ob2-address" label="Address" error={errors.address?.message}>
          <input type="text" autoComplete="street-address" placeholder="123 Mabini St." className={inputClass} {...register('address')} />
        </FormField>

        <div className="grid grid-cols-2 gap-4">
          <FormField id="ob2-city" label="City" error={errors.city?.message}>
            <input type="text" autoComplete="address-level2" placeholder="Quezon City" className={inputClass} {...register('city')} />
          </FormField>
          <FormField id="ob2-region" label="Region" error={errors.region?.message}>
            <input type="text" autoComplete="address-level1" placeholder="NCR" className={inputClass} {...register('region')} />
          </FormField>
        </div>

        <FormField id="ob2-philhealthId" label="PhilHealth ID" error={errors.philhealthId?.message}>
          <input type="text" placeholder="12-345678901-2" className={inputClass} {...register('philhealthId')} />
        </FormField>

        <div className="grid grid-cols-2 gap-4">
          <FormField id="ob2-hmoProvider" label="HMO Provider" error={errors.hmoProvider?.message}>
            <input type="text" placeholder="Maxicare" className={inputClass} {...register('hmoProvider')} />
          </FormField>
          <FormField id="ob2-hmoCardNo" label="HMO Card No." error={errors.hmoCardNo?.message}>
            <input type="text" placeholder="0000-0000-0000" className={inputClass} {...register('hmoCardNo')} />
          </FormField>
        </div>

        <div className="flex justify-between pt-2">
          <Button id="ob2-back" type="button" variant="outline" size="lg" onClick={() => router.push('/onboarding/1')}>← Back</Button>
          <Button id="ob2-next" type="submit" size="lg" className="min-w-[140px]">Continue →</Button>
        </div>
      </form>
    </div>
  );
}
```

- [ ] **Step 2: Verify**

Run: `npm run lint`
Expected: PASS.

---

### Task 5: Restructure Medical History step

**Files:**
- Overwrite: `frontend/src/app/onboarding/4/page.tsx` (moved from old step 3; replace entire file)

- [ ] **Step 1: Replace the whole file**

```tsx
// frontend/src/app/onboarding/4/page.tsx
'use client';

import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  medicalHistorySchema,
  type MedicalHistorySchema,
} from '@/lib/schemas/onboarding.schemas';
import { useOnboarding } from '@/context/onboarding-context';
import { ProgressIndicator } from '@/components/ui/progress-indicator';
import { FormField } from '@/components/ui/form-field';
import { Button } from '@/components/ui/button';

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown'];
const SMOKING_OPTIONS = [
  { value: '', label: 'Prefer not to say' },
  { value: 'Never', label: 'Never' },
  { value: 'Former', label: 'Former' },
  { value: 'Current', label: 'Current' },
];

export default function OnboardingStep4() {
  const router = useRouter();
  const { data, update } = useOnboarding();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<MedicalHistorySchema>({
    resolver: zodResolver(medicalHistorySchema),
    defaultValues: {
      bloodType: data.bloodType,
      allergies: data.allergies,
      chronicConditions: data.chronicConditions,
      currentMedications: data.currentMedications,
      pastSurgeries: data.pastSurgeries,
      familyHistory: data.familyHistory,
      smokingStatus: data.smokingStatus,
    },
    mode: 'onBlur',
  });

  const onSubmit = (values: MedicalHistorySchema) => {
    update({
      bloodType: values.bloodType ?? '',
      allergies: values.allergies ?? '',
      chronicConditions: values.chronicConditions ?? '',
      currentMedications: values.currentMedications ?? '',
      pastSurgeries: values.pastSurgeries ?? '',
      familyHistory: values.familyHistory ?? '',
      smokingStatus: values.smokingStatus ?? '',
    });
    router.push('/onboarding/5');
  };

  const inputClass =
    'w-full rounded-md border border-outline-variant bg-surface-white px-3 py-2.5 text-sm text-on-surface font-manrope placeholder:text-outline transition-colors focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 aria-[invalid=true]:border-error';
  const textareaClass =
    'w-full rounded-md border border-outline-variant bg-surface-white px-3 py-2.5 text-sm text-on-surface font-manrope placeholder:text-outline transition-colors resize-y min-h-[80px] focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 aria-[invalid=true]:border-error';

  return (
    <div className="flex flex-col gap-6">
      <ProgressIndicator currentStep={4} totalSteps={6} />
      <div>
        <h1 className="text-2xl font-semibold text-text-primary font-plus-jakarta">Medical History</h1>
        <p className="mt-1 text-sm text-on-surface-variant font-manrope">
          Helps your doctor understand your health context. All optional and kept private — separate items with commas.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
        <div className="grid grid-cols-2 gap-4">
          <FormField id="ob4-bloodType" label="Blood type" error={errors.bloodType?.message}>
            <select className={inputClass} {...register('bloodType')}>
              <option value="">Select…</option>
              {BLOOD_TYPES.map((bt) => (
                <option key={bt} value={bt}>{bt}</option>
              ))}
            </select>
          </FormField>
          <FormField id="ob4-smokingStatus" label="Smoking status" error={errors.smokingStatus?.message}>
            <select className={inputClass} {...register('smokingStatus')}>
              {SMOKING_OPTIONS.map((o) => (
                <option key={o.label} value={o.value}>{o.label}</option>
              ))}
            </select>
          </FormField>
        </div>

        <FormField id="ob4-allergies" label="Allergies" error={errors.allergies?.message} hint='Comma-separated, e.g. "Penicillin, Peanuts"'>
          <input type="text" placeholder="Penicillin, Peanuts" className={inputClass} {...register('allergies')} />
        </FormField>

        <FormField id="ob4-chronicConditions" label="Chronic conditions" error={errors.chronicConditions?.message} hint='Comma-separated, e.g. "Hypertension, Asthma"'>
          <input type="text" placeholder="Hypertension, Asthma" className={inputClass} {...register('chronicConditions')} />
        </FormField>

        <FormField id="ob4-currentMedications" label="Current medications" error={errors.currentMedications?.message} hint='Comma-separated, e.g. "Amlodipine 5mg, Metformin"'>
          <input type="text" placeholder="Amlodipine 5mg, Metformin" className={inputClass} {...register('currentMedications')} />
        </FormField>

        <FormField id="ob4-pastSurgeries" label="Past surgeries" error={errors.pastSurgeries?.message}>
          <textarea placeholder="e.g. Appendectomy (2018)" className={textareaClass} {...register('pastSurgeries')} />
        </FormField>

        <FormField id="ob4-familyHistory" label="Family history" error={errors.familyHistory?.message}>
          <textarea placeholder="e.g. Diabetes (mother), Heart disease (father)" className={textareaClass} {...register('familyHistory')} />
        </FormField>

        <div className="flex justify-between pt-2">
          <Button id="ob4-back" type="button" variant="outline" size="lg" onClick={() => router.push('/onboarding/3')}>← Back</Button>
          <Button id="ob4-next" type="submit" size="lg" className="min-w-[140px]">Continue →</Button>
        </div>
      </form>
    </div>
  );
}
```

- [ ] **Step 2: Verify**

Run: `npm run lint`
Expected: PASS.

---

### Task 6: Review page — new fields, conditional blocks, dual sequential submit

**Files:**
- Overwrite: `frontend/src/app/onboarding/6/page.tsx` (moved from old step 5; replace entire file)

- [ ] **Step 1: Replace the whole file**

```tsx
// frontend/src/app/onboarding/6/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { apiRequest, ApiError } from '@/lib/api-client';
import { useOnboarding } from '@/context/onboarding-context';
import { ProgressIndicator } from '@/components/ui/progress-indicator';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Toast } from '@/components/ui/toast';
import type { CreatePatientProfileBody, UpdateMedicalHistoryBody } from '@/types/patient';

function InfoPoint({ label, value, editHref }: { label: string; value: string; editHref?: string }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-wider font-bold text-outline font-plus-jakarta">{label}</span>
        {editHref && (
          <Link href={editHref} className="text-[10px] font-bold text-primary hover:underline">EDIT</Link>
        )}
      </div>
      <span className="text-sm font-medium text-on-surface font-manrope">{value || '—'}</span>
    </div>
  );
}

const toList = (s: string) => s.split(',').map((x) => x.trim()).filter(Boolean);

export default function OnboardingStep6() {
  const router = useRouter();
  const { data: session } = useSession();
  const { data, reset } = useOnboarding();
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);

  const hasLocationInsurance =
    !!(data.address || data.city || data.region || data.philhealthId || data.hmoProvider || data.hmoCardNo);
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
      allergies: toList(data.allergies),
      chronicConditions: toList(data.chronicConditions),
      currentMedications: toList(data.currentMedications),
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

      // 2) Then upsert structured medical history (idempotent).
      await apiRequest('/patients/medical-history', { method: 'PATCH', body: medicalBody, token });

      reset();
      setShowToast(true);
      setTimeout(() => router.push('/dashboard'), 1800);
    } catch {
      setServerError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <ProgressIndicator currentStep={6} totalSteps={6} />

      <div className="text-center">
        <h1 className="text-3xl font-bold text-text-primary font-plus-jakarta tracking-tight">One last check</h1>
        <p className="mt-2 text-on-surface-variant font-manrope">This will be your official digital health record.</p>
      </div>

      <div className="bg-surface-white rounded-3xl border border-outline-variant/30 shadow-lifted overflow-hidden transition-all duration-300 hover:shadow-hover">
        <div className="bg-gradient-to-br from-primary to-primary-container p-8 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none" />
          <div className="flex items-center gap-6 relative z-10">
            <div className="relative">
              <div className="h-24 w-24 rounded-2xl bg-white/20 backdrop-blur-md border-2 border-white/30 overflow-hidden flex items-center justify-center shadow-inner">
                {data.profilePictureUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={data.profilePictureUrl} alt={data.fullName} className="h-full w-full object-cover" />
                ) : (
                  <svg className="w-12 h-12 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 0116 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                )}
              </div>
              <Link href="/onboarding/5" className="absolute -bottom-2 -right-2 bg-white text-primary p-2 rounded-xl shadow-lg hover:scale-110 transition-transform">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                </svg>
              </Link>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold tracking-[0.2em] text-white/70 uppercase font-plus-jakarta mb-1">Digital Patient ID</span>
              <h2 className="text-2xl font-bold font-plus-jakarta tracking-tight leading-tight">{data.fullName}</h2>
              <div className="flex items-center gap-2 mt-2">
                <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
                <span className="text-xs font-medium text-white/80">Profile Complete</span>
              </div>
            </div>
          </div>
        </div>

        <div className="p-8 grid grid-cols-2 gap-x-8 gap-y-10">
          <InfoPoint label="Full Name" value={data.fullName} editHref="/onboarding/1" />
          <InfoPoint label="Date of Birth" value={data.birthdate} editHref="/onboarding/1" />
          <InfoPoint label="Contact Info" value={data.contactDetails} editHref="/onboarding/1" />
          <InfoPoint label="Metrics" value={`${data.weightKg ? data.weightKg + 'kg' : '—'} / ${data.heightCm ? data.heightCm + 'cm' : '—'}`} editHref="/onboarding/3" />

          {hasLocationInsurance && (
            <>
              <div className="col-span-2 h-px bg-outline-variant/30" />
              <div className="col-span-2">
                <InfoPoint
                  label="Location"
                  value={[data.address, data.city, data.region].filter(Boolean).join(', ')}
                  editHref="/onboarding/2"
                />
              </div>
              <InfoPoint label="PhilHealth ID" value={data.philhealthId} editHref="/onboarding/2" />
              <InfoPoint label="HMO" value={[data.hmoProvider, data.hmoCardNo].filter(Boolean).join(' · ')} editHref="/onboarding/2" />
            </>
          )}

          {hasMedical && (
            <>
              <div className="col-span-2 h-px bg-outline-variant/30" />
              <InfoPoint label="Blood Type" value={data.bloodType} editHref="/onboarding/4" />
              <InfoPoint label="Smoking" value={data.smokingStatus} editHref="/onboarding/4" />
              <div className="col-span-2"><InfoPoint label="Allergies" value={data.allergies} editHref="/onboarding/4" /></div>
              <div className="col-span-2"><InfoPoint label="Chronic Conditions" value={data.chronicConditions} editHref="/onboarding/4" /></div>
              <div className="col-span-2"><InfoPoint label="Current Medications" value={data.currentMedications} editHref="/onboarding/4" /></div>
              {data.pastSurgeries && <div className="col-span-2"><InfoPoint label="Past Surgeries" value={data.pastSurgeries} editHref="/onboarding/4" /></div>}
              {data.familyHistory && <div className="col-span-2"><InfoPoint label="Family History" value={data.familyHistory} editHref="/onboarding/4" /></div>}
            </>
          )}
        </div>
      </div>

      {serverError && (
        <div role="alert" className="flex items-center gap-3 rounded-2xl border border-error/20 bg-error/5 p-4 text-sm text-error font-manrope animate-in fade-in slide-in-from-top-2">
          <svg className="h-5 w-5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <span className="flex-1 font-medium">{serverError}</span>
          <button onClick={handleSubmit} className="text-xs font-bold uppercase tracking-wider hover:underline focus:outline-none bg-error text-white px-3 py-1 rounded-lg">Retry</button>
        </div>
      )}

      <div className="flex gap-4 pt-4">
        <Button id="ob6-back" type="button" variant="outline" size="lg" className="flex-1 h-14 rounded-2xl font-bold" onClick={() => router.push('/onboarding/5')} disabled={submitting}>
          Back
        </Button>
        <Button id="ob6-complete" type="button" size="lg" className="flex-[2] h-14 rounded-2xl font-bold shadow-lifted hover:shadow-hover transition-all" disabled={submitting} onClick={handleSubmit}>
          {submitting ? (
            <span className="flex items-center gap-2"><Spinner className="w-5 h-5" /> Processing…</span>
          ) : (
            'Generate ID Card ✓'
          )}
        </Button>
      </div>

      {showToast && <Toast message="Profile verified! Redirecting to dashboard..." variant="success" />}
    </div>
  );
}
```

- [ ] **Step 2: Verify the whole patient flow compiles**

Run: `npm run lint && npm run build`
Expected: PASS (no type errors; Task 1's expected errors are now resolved).

- [ ] **Step 3: Commit Part A**

```bash
cd /home/vincentdev/vincent-projects/launchpad/telehealth-app
git add frontend/src/types/patient.ts frontend/src/lib/schemas/onboarding.schemas.ts frontend/src/app/onboarding
git commit -m "feat(onboarding): add patient location/insurance step and structured medical history"
```

---

## PART B — DOCTOR FLOW

### Task 7: Doctor onboarding types

**Files:**
- Modify: `frontend/src/types/doctor-onboarding.ts`

- [ ] **Step 1: Add the five credential fields to the interface and defaults**

In `DoctorOnboardingData`, add after `profilePictureUrl: string | null;`:

```ts
  prcLicenseNo: string;
  prcLicenseExpiry: string; // "YYYY-MM-DD"
  ptrNo: string;
  region: string;
  city: string;
```

In `DOCTOR_ONBOARDING_DEFAULTS`, add after `profilePictureUrl: null,`:

```ts
  prcLicenseNo: '',
  prcLicenseExpiry: '',
  ptrNo: '',
  region: '',
  city: '',
```

- [ ] **Step 2: Verify**

Run: `npm run lint`
Expected: PASS.

---

### Task 8: Doctor credentials zod schema

**Files:**
- Modify: `frontend/src/lib/schemas/onboarding.schemas.ts`

- [ ] **Step 1: Append the credentials schema**

Add at the end of the file:

```ts
export const doctorCredentialsSchema = z.object({
  prcLicenseNo: z.string().min(1, 'PRC license number is required'),
  prcLicenseExpiry: z
    .string()
    .min(1, 'PRC license expiry is required')
    .refine(
      // input type="date" yields "YYYY-MM-DD"; lexical compare against today is valid.
      // Use >= so a license expiring today is still accepted.
      (val) => val >= new Date().toISOString().split('T')[0],
      'License expiry must be today or a future date',
    ),
  ptrNo: z.string().optional(),
  region: z.string().optional(),
  city: z.string().optional(),
});

export type DoctorCredentialsSchema = z.infer<typeof doctorCredentialsSchema>;
```

- [ ] **Step 2: Verify**

Run: `npm run lint`
Expected: PASS.

---

### Task 9: Renumber doctor route files + fix nav on unchanged pages

**Files (moves, descending):**
- `frontend/src/app/onboarding/doctor/4` → `5`
- `frontend/src/app/onboarding/doctor/3` → `4`
- `frontend/src/app/onboarding/doctor/2` → `3`

- [ ] **Step 1: Move the directories (from repo root)**

```bash
cd /home/vincentdev/vincent-projects/launchpad/telehealth-app
git mv frontend/src/app/onboarding/doctor/4 frontend/src/app/onboarding/doctor/5
git mv frontend/src/app/onboarding/doctor/3 frontend/src/app/onboarding/doctor/4
git mv frontend/src/app/onboarding/doctor/2 frontend/src/app/onboarding/doctor/3
```

After this: `3`=specialization(old 2), `4`=practice(old 3), `5`=review(old 4). Slot `2` is free for the new Credentials page. The `onboarding/doctor/page.tsx` index (redirects to `/1`) and `layout.tsx` stay unchanged.

- [ ] **Step 2: Fix identity step — `onboarding/doctor/1/page.tsx`**

- `<ProgressIndicator currentStep={1} totalSteps={4} />` → `totalSteps={5}`

The two `router.push('/onboarding/doctor/2')` calls are correct as-is (now point to the new Credentials step).

- [ ] **Step 3: Fix specialization step — `onboarding/doctor/3/page.tsx`** (moved from `2`)

- `<ProgressIndicator currentStep={2} totalSteps={4} />` → `currentStep={3} totalSteps={5}`
- `router.push('/onboarding/doctor/1')` (Back) → `router.push('/onboarding/doctor/2')`
- `router.push('/onboarding/doctor/3')` (handleNext) → `router.push('/onboarding/doctor/4')`

- [ ] **Step 4: Fix practice step — `onboarding/doctor/4/page.tsx`** (moved from `3`)

- `<ProgressIndicator currentStep={3} totalSteps={4} />` → `currentStep={4} totalSteps={5}`
- `router.push('/onboarding/doctor/2')` (Back) → `router.push('/onboarding/doctor/3')`
- `router.push('/onboarding/doctor/4')` (handleNext) → `router.push('/onboarding/doctor/5')`

- [ ] **Step 5: Verify**

Run: `npm run lint`
Expected: PASS.

---

### Task 10: New doctor Credentials step

**Files:**
- Create: `frontend/src/app/onboarding/doctor/2/page.tsx`

- [ ] **Step 1: Create the page**

```tsx
'use client';

import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  doctorCredentialsSchema,
  type DoctorCredentialsSchema,
} from '@/lib/schemas/onboarding.schemas';
import { useDoctorOnboarding } from '@/context/doctor-onboarding-context';
import { FormField } from '@/components/ui/form-field';
import { Button } from '@/components/ui/button';
import { ProgressIndicator } from '@/components/ui/progress-indicator';

export default function DoctorOnboardingStep2() {
  const router = useRouter();
  const { data, update } = useDoctorOnboarding();
  const today = new Date().toISOString().split('T')[0];

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<DoctorCredentialsSchema>({
    resolver: zodResolver(doctorCredentialsSchema),
    defaultValues: {
      prcLicenseNo: data.prcLicenseNo,
      prcLicenseExpiry: data.prcLicenseExpiry,
      ptrNo: data.ptrNo,
      region: data.region,
      city: data.city,
    },
    mode: 'onBlur',
  });

  const onSubmit = (values: DoctorCredentialsSchema) => {
    update({
      prcLicenseNo: values.prcLicenseNo,
      prcLicenseExpiry: values.prcLicenseExpiry,
      ptrNo: values.ptrNo ?? '',
      region: values.region ?? '',
      city: values.city ?? '',
    });
    router.push('/onboarding/doctor/3');
  };

  const inputClass =
    'w-full rounded-xl border border-outline-variant bg-surface-white px-4 py-3 text-sm text-on-surface font-manrope focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all';

  return (
    <div className="flex flex-col gap-6">
      <ProgressIndicator currentStep={2} totalSteps={5} />
      <div>
        <h1 className="text-2xl font-semibold text-text-primary font-plus-jakarta">Credentials & Licensure</h1>
        <p className="mt-1 text-sm text-on-surface-variant font-manrope">
          Required for verification. Your PRC license confirms you are licensed to practice.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
        <FormField id="prcLicenseNo" label="PRC License Number" error={errors.prcLicenseNo?.message} required>
          <input id="prcLicenseNo" className={inputClass} placeholder="0123456" {...register('prcLicenseNo')} />
        </FormField>

        <FormField id="prcLicenseExpiry" label="PRC License Expiry" error={errors.prcLicenseExpiry?.message} required>
          <input id="prcLicenseExpiry" type="date" min={today} className={inputClass} {...register('prcLicenseExpiry')} />
        </FormField>

        <FormField id="ptrNo" label="PTR Number (Optional)">
          <input id="ptrNo" className={inputClass} placeholder="PTR-000000" {...register('ptrNo')} />
        </FormField>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField id="region" label="Region (Optional)">
            <input id="region" className={inputClass} placeholder="NCR" {...register('region')} />
          </FormField>
          <FormField id="city" label="City (Optional)">
            <input id="city" className={inputClass} placeholder="Makati" {...register('city')} />
          </FormField>
        </div>

        <div className="flex justify-between items-center pt-4">
          <Button type="button" variant="ghost" onClick={() => router.push('/onboarding/doctor/1')} className="text-on-surface-variant hover:text-primary">
            ← Back
          </Button>
          <Button type="submit" className="rounded-full px-8 py-6 text-base font-semibold shadow-lg hover:shadow-xl transition-all">
            Continue →
          </Button>
        </div>
      </form>
    </div>
  );
}
```

- [ ] **Step 2: Verify**

Run: `npm run lint`
Expected: PASS.

---

### Task 11: Doctor Review page — nav + Credentials card

**Files:**
- Modify: `frontend/src/app/onboarding/doctor/5/page.tsx` (moved from old step 4)

- [ ] **Step 1: Fix progress + back nav**

- `<ProgressIndicator currentStep={4} totalSteps={4} />` → `currentStep={5} totalSteps={5}`
- `onClick={() => router.push('/onboarding/doctor/3')}` (Edit Details button) → `router.push('/onboarding/doctor/4')`

- [ ] **Step 2: Add a Credentials card to the review grid**

Immediately after the "Profile Header Review" block (the `div` that closes the avatar/name/title card — the one ending right before `{/* Details Grid */}`), insert this block:

```tsx
        {/* Credentials Review */}
        <div className="bg-surface-white rounded-xl p-4 border border-outline-variant/50 shadow-sm">
          <h3 className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2 font-plus-jakarta">Credentials</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm font-manrope text-on-surface">
            <p><span className="text-on-surface-variant">PRC License:</span> {data.prcLicenseNo || 'Not provided'}</p>
            <p><span className="text-on-surface-variant">Expiry:</span> {data.prcLicenseExpiry || 'Not provided'}</p>
            {data.ptrNo && <p><span className="text-on-surface-variant">PTR No:</span> {data.ptrNo}</p>}
            {(data.region || data.city) && (
              <p><span className="text-on-surface-variant">Location:</span> {[data.city, data.region].filter(Boolean).join(', ')}</p>
            )}
          </div>
        </div>
```

(PRC fields are required so the card always has content; PTR/region/city lines render only when present.)

- [ ] **Step 3: Verify the whole doctor flow compiles**

Run: `npm run lint && npm run build`
Expected: PASS.

- [ ] **Step 4: Commit Part B**

```bash
cd /home/vincentdev/vincent-projects/launchpad/telehealth-app
git add frontend/src/types/doctor-onboarding.ts frontend/src/lib/schemas/onboarding.schemas.ts frontend/src/app/onboarding/doctor
git commit -m "feat(onboarding): add doctor credentials step (PRC license, PTR, location)"
```

---

## PART C — FINALIZE

### Task 12: Full verification + cleanup

- [ ] **Step 1: Final build + lint**

Run (from `frontend/`): `npm run lint && npm run build`
Expected: both PASS, no errors/warnings introduced.

- [ ] **Step 2: Manual route sanity (read-only check)**

Confirm the route dirs match the intended order:
```bash
ls frontend/src/app/onboarding        # expect: 1 2 3 4 5 6 layout.tsx
ls frontend/src/app/onboarding/doctor # expect: 1 2 3 4 5 layout.tsx page.tsx
```

- [ ] **Step 3: Delete spec + plan per standing rule**

Only after all tasks verified complete with no errors:
```bash
cd /home/vincentdev/vincent-projects/launchpad/telehealth-app
git rm docs/superpowers/specs/2026-05-29-onboarding-new-schema-design.md
git rm docs/superpowers/plans/2026-05-29-onboarding-new-schema.md
git commit -m "chore: remove completed onboarding new-schema spec and plan"
```

---

## Self-Review Notes (coverage vs spec)

- Patient location/insurance (address, city, region, philhealthId, hmoProvider, hmoCardNo) → Tasks 1, 2, 4, 6. ✓
- Patient structured medical history, all 7 fields, comma lists, sequential PATCH → Tasks 1, 2, 5, 6. ✓
- Old free-text `medicalHistory` blob dropped from profile body → Task 1 (type) + Task 6 (submit). ✓
- Doctor credentials (PRC no/expiry required, PTR/region/city optional), expiry `>= today`, input `min=today` → Tasks 7, 8, 10. ✓
- Doctor submit unchanged shape (spreads `...data`) → new fields flow automatically; verified in Task 11 build. ✓
- Conditional review blocks (patient location/insurance + medical; doctor PTR/region/city) → Tasks 6, 11. ✓
- Renumbering + progress/nav fixes → Tasks 3, 9. ✓
- `contactDetails` kept, `phoneNumber` ignored → Task 1 keeps `contactDetails`, no `phoneNumber` added. ✓
- No backend changes. ✓
