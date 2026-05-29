# Doctor Onboarding Enhancements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add PRC/PTR formatting+validation, a DB-sourced specialization dropdown, quick-pick pills for languages and focus areas, and inline per-field editing (incl. photo) on the doctor review step.

**Architecture:** One new public backend read endpoint (`GET /specializations`). Frontend: shared `Chip` and `EditableRow` components extracted from the patient flow and reused; a `useSpecializations` hook; targeted edits to doctor steps 2–5.

**Tech Stack:** NestJS + Prisma (backend, Jest mocked-Prisma tests). Next.js App Router + react-hook-form + zod + Tailwind (frontend; verification = `npm run lint` + `npm run build`, no test framework).

**Conventions:**
- Backend commands from `backend/`; frontend from `frontend/`; `git` from repo root `/home/vincentdev/vincent-projects/launchpad/telehealth-app`.
- Backend gate: `npm test` (currently green). Frontend gate: `npm run lint && npm run build` (2 pre-existing unrelated warnings in `DoctorCard.tsx`/`ActivityLogIcon` are acceptable; introduce no new ones).

---

## PART A — BACKEND

### Task 1: `GET /specializations` public endpoint

**Files:**
- Create: `backend/src/specializations/specializations.service.ts`
- Create: `backend/src/specializations/specializations.service.spec.ts`
- Create: `backend/src/specializations/specializations.controller.ts`
- Create: `backend/src/specializations/specializations.module.ts`
- Modify: `backend/src/app.module.ts`

- [ ] **Step 1: Write the failing service test**

`backend/src/specializations/specializations.service.spec.ts`:

```ts
import { Test, TestingModule } from '@nestjs/testing';
import { SpecializationsService } from './specializations.service';
import { PrismaService } from '../prisma/prisma.service';

describe('SpecializationsService', () => {
  let service: SpecializationsService;

  const mockPrismaService = {
    specialization: { findMany: jest.fn() },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SpecializationsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();
    service = module.get<SpecializationsService>(SpecializationsService);
    jest.clearAllMocks();
  });

  it('returns specializations ordered by name', async () => {
    const rows = [{ id: '1', name: 'Cardiology', description: null, createdAt: new Date() }];
    mockPrismaService.specialization.findMany.mockResolvedValue(rows);

    const result = await service.findAll();

    expect(result).toBe(rows);
    expect(mockPrismaService.specialization.findMany).toHaveBeenCalledWith({
      orderBy: { name: 'asc' },
    });
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npm test -- specializations.service`
Expected: FAIL — cannot find `./specializations.service`.

- [ ] **Step 3: Implement the service**

`backend/src/specializations/specializations.service.ts`:

```ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SpecializationsService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.specialization.findMany({ orderBy: { name: 'asc' } });
  }
}
```

- [ ] **Step 4: Create the controller**

`backend/src/specializations/specializations.controller.ts`:

```ts
import { Controller, Get } from '@nestjs/common';
import { SpecializationsService } from './specializations.service';
import { Public } from '../auth/decorators/public.decorator';

@Controller('specializations')
export class SpecializationsController {
  constructor(private readonly specializationsService: SpecializationsService) {}

  @Public()
  @Get()
  findAll() {
    return this.specializationsService.findAll();
  }
}
```

- [ ] **Step 5: Create the module**

`backend/src/specializations/specializations.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { SpecializationsService } from './specializations.service';
import { SpecializationsController } from './specializations.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [SpecializationsController],
  providers: [SpecializationsService],
})
export class SpecializationsModule {}
```

- [ ] **Step 6: Register in app.module**

In `backend/src/app.module.ts`, add the import next to the other module imports:

```ts
import { SpecializationsModule } from './specializations/specializations.module';
```

And add `SpecializationsModule,` to the `imports: [...]` array (e.g. right after `ReviewsModule,`).

- [ ] **Step 7: Run backend tests**

Run: `npm test`
Expected: PASS — all suites green, including the new `SpecializationsService` test.

- [ ] **Step 8: Commit**

```bash
cd /home/vincentdev/vincent-projects/launchpad/telehealth-app
git add backend/src/specializations backend/src/app.module.ts
git commit -m "feat(specializations): add public GET /specializations endpoint"
```

---

## PART B — SHARED FRONTEND

### Task 2: PRC/PTR formatters + validators

**Files:**
- Modify: `frontend/src/lib/format.ts`

- [ ] **Step 1: Append the four helpers**

Add to the end of `frontend/src/lib/format.ts`:

```ts
/** Format a PRC license no. as up to 7 raw digits (no separators). */
export const formatPrc = (value: string) => value.replace(/\D/g, '').slice(0, 7);

/** Valid when the PRC license no. is exactly 7 digits. */
export const isValidPrc = (value: string) => value.replace(/\D/g, '').length === 7;

/** Format a PTR no. as up to 8 raw digits (no separators). */
export const formatPtr = (value: string) => value.replace(/\D/g, '').slice(0, 8);

/** Valid when empty (optional) or 7–8 digits. */
export const isValidPtr = (value: string) => {
  const len = value.replace(/\D/g, '').length;
  return len === 0 || len === 7 || len === 8;
};
```

- [ ] **Step 2: Verify**

Run: `npm run lint`
Expected: PASS.

---

### Task 3: Extract shared `Chip` component

**Files:**
- Create: `frontend/src/components/ui/chip.tsx`
- Modify: `frontend/src/app/onboarding/4/page.tsx`

- [ ] **Step 1: Create the shared Chip**

`frontend/src/components/ui/chip.tsx`:

```tsx
'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export function Chip({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'px-3 py-1.5 rounded-full text-xs font-medium transition-all border',
        selected
          ? 'bg-primary text-white border-primary shadow-sm'
          : 'bg-surface-white text-on-surface-variant border-outline-variant hover:border-primary/50 hover:bg-surface-variant/50',
      )}
    >
      {children}
    </button>
  );
}
```

- [ ] **Step 2: Refactor patient step 4 to import it**

In `frontend/src/app/onboarding/4/page.tsx`:
1. Delete the local `function Chip({ ... }) { ... }` definition (the whole component block).
2. The `cn` import becomes unused only if nothing else uses it — leave the `import { cn } from '@/lib/utils';` line **only if** other `cn(...)` calls remain; if lint flags it as unused, remove that import line.
3. Add: `import { Chip } from '@/components/ui/chip';` with the other component imports.

- [ ] **Step 3: Verify**

Run: `npm run lint && npm run build`
Expected: PASS. Patient step 4 pills still work (now using the shared Chip).

---

### Task 4: Extract shared `EditableRow` component

**Files:**
- Create: `frontend/src/components/ui/editable-row.tsx`
- Modify: `frontend/src/app/onboarding/6/page.tsx`

- [ ] **Step 1: Create the shared component**

`frontend/src/components/ui/editable-row.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

export const editInputClass =
  'w-full rounded-md border border-outline-variant bg-surface-white px-2.5 py-1.5 text-sm text-on-surface font-manrope placeholder:text-outline focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20';

/**
 * One review row. Shows a value + EDIT; clicking EDIT swaps in an inline editor
 * (snapshot of the row's fields) with SAVE/CANCEL — no navigation away. SAVE
 * runs optional validate(); on error the row stays open and shows the message.
 */
export function EditableRow<T extends Record<string, unknown>>({
  label,
  display,
  initial,
  onSave,
  render,
  validate,
  fullWidth,
}: {
  label: string;
  display: string;
  initial: T;
  onSave: (draft: T) => void;
  render: (draft: T, set: <K extends keyof T>(k: K, v: T[K]) => void) => React.ReactNode;
  validate?: (draft: T) => string | null;
  fullWidth?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<T>(initial);
  const [error, setError] = useState<string | null>(null);

  const start = () => {
    setDraft(initial);
    setError(null);
    setEditing(true);
  };
  const set = <K extends keyof T>(k: K, v: T[K]) => setDraft((p) => ({ ...p, [k]: v }) as T);
  const cancel = () => {
    setError(null);
    setEditing(false);
  };
  const save = () => {
    const err = validate?.(draft) ?? null;
    if (err) {
      setError(err);
      return;
    }
    onSave(draft);
    setError(null);
    setEditing(false);
  };

  return (
    <div className={cn('flex flex-col gap-1', fullWidth && 'col-span-2')}>
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-wider font-bold text-outline font-plus-jakarta">{label}</span>
        {editing ? (
          <div className="flex items-center gap-3">
            <button type="button" onClick={save} className="text-[10px] font-bold text-primary hover:underline">SAVE</button>
            <button type="button" onClick={cancel} className="text-[10px] font-bold text-outline hover:underline">CANCEL</button>
          </div>
        ) : (
          <button type="button" onClick={start} className="text-[10px] font-bold text-primary hover:underline">EDIT</button>
        )}
      </div>
      {editing ? (
        <div className="mt-1 flex flex-col gap-1">
          {render(draft, set)}
          {error && <span role="alert" className="text-[11px] font-medium text-error font-manrope">{error}</span>}
        </div>
      ) : (
        <span className="text-sm font-medium text-on-surface font-manrope">{display || '—'}</span>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Refactor patient step 6 to import it**

In `frontend/src/app/onboarding/6/page.tsx`:
1. Delete the local `const editInputClass = ...;` declaration and the entire local `function EditableRow<T extends Partial<OnboardingData>>({ ... }) { ... }` block.
2. Add this import with the other component imports:
   `import { EditableRow, editInputClass } from '@/components/ui/editable-row';`
3. The `OnboardingData` type import may still be used elsewhere in the file (e.g. `CreatePatientProfileBody`); keep the existing `import type { OnboardingData, ... } from '@/types/patient';` line as-is (it is still referenced by `update`'s inferred types and is harmless). If lint flags `OnboardingData` as unused after the extraction, drop just that name from the type import.

- [ ] **Step 3: Verify**

Run: `npm run lint && npm run build`
Expected: PASS. Patient review inline editing unchanged in behavior.

---

### Task 5: `useSpecializations` hook

**Files:**
- Create: `frontend/src/hooks/use-specializations.ts`

- [ ] **Step 1: Create the hook**

`frontend/src/hooks/use-specializations.ts`:

```ts
'use client';

import { useEffect, useState } from 'react';
import { apiRequest } from '@/lib/api-client';

/** Fetches specialization names from the public GET /specializations endpoint. */
export function useSpecializations() {
  const [specializations, setSpecializations] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    apiRequest<{ id: string; name: string }[]>('/specializations', { method: 'GET' })
      .then((rows) => {
        if (active) setSpecializations(rows.map((r) => r.name));
      })
      .catch(() => {
        if (active) setSpecializations([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return { specializations, loading };
}
```

- [ ] **Step 2: Verify + commit Part B**

Run: `npm run lint && npm run build`
Expected: PASS.

```bash
cd /home/vincentdev/vincent-projects/launchpad/telehealth-app
git add frontend/src/lib/format.ts frontend/src/components/ui/chip.tsx frontend/src/components/ui/editable-row.tsx frontend/src/hooks/use-specializations.ts frontend/src/app/onboarding/4/page.tsx frontend/src/app/onboarding/6/page.tsx
git commit -m "refactor(onboarding): extract shared Chip + EditableRow, add specialization hook and PRC/PTR formatters"
```

---

## PART C — DOCTOR PAGES

### Task 6: Doctor step 2 — PRC/PTR format + validation

**Files:**
- Modify: `frontend/src/lib/schemas/onboarding.schemas.ts`
- Modify: `frontend/src/app/onboarding/doctor/2/page.tsx`

- [ ] **Step 1: Tighten the schema**

In `frontend/src/lib/schemas/onboarding.schemas.ts`:

1. Extend the format import to include the PRC/PTR validators:
```ts
import { isValidPhilHealth, isValidHmoCard, isValidPrc, isValidPtr } from '@/lib/format';
```
2. Replace the `prcLicenseNo` and `ptrNo` lines inside `doctorCredentialsSchema` with:
```ts
  prcLicenseNo: z
    .string()
    .min(1, 'PRC license number is required')
    .refine(isValidPrc, 'PRC license number must be 7 digits'),
```
and
```ts
  ptrNo: z
    .string()
    .optional()
    .refine((v) => isValidPtr(v ?? ''), 'PTR number must be 7–8 digits'),
```
Leave `prcLicenseExpiry`, `region`, `city` unchanged.

- [ ] **Step 2: Format inputs on the page**

In `frontend/src/app/onboarding/doctor/2/page.tsx`:

1. Keep the existing `import { localTodayISO } from '@/lib/schemas/onboarding.schemas';` line unchanged, and add a new import for the formatters (they live in `@/lib/format`):
```ts
import { formatPrc, formatPtr } from '@/lib/format';
```

2. Change the PRC field `<input>` (the `{...register('prcLicenseNo')}` one) to add numeric input mode and formatting on change:
```tsx
<input
  id="prcLicenseNo"
  inputMode="numeric"
  className={inputClass}
  placeholder="0123456"
  {...register('prcLicenseNo', {
    onChange: (e) => {
      e.target.value = formatPrc(e.target.value);
    },
  })}
/>
```

3. Change the PTR field `<input>` (the `{...register('ptrNo')}` one) likewise:
```tsx
<input
  id="ptrNo"
  inputMode="numeric"
  className={inputClass}
  placeholder="PTR-000000"
  {...register('ptrNo', {
    onChange: (e) => {
      e.target.value = formatPtr(e.target.value);
    },
  })}
/>
```

> Keep all other props/attributes these inputs already have (id, className). Only add `inputMode` + the `onChange` formatter.

- [ ] **Step 3: Verify**

Run: `npm run lint && npm run build`
Expected: PASS. Step 2 now blocks Continue unless PRC is 7 digits and PTR (if filled) is 7–8 digits.

---

### Task 7: Doctor step 3 — specialization dropdown + language pills

**Files:**
- Modify: `frontend/src/app/onboarding/doctor/3/page.tsx`

- [ ] **Step 1: Replace the whole file**

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useDoctorOnboarding } from '@/context/doctor-onboarding-context';
import { FormField } from '@/components/ui/form-field';
import { Button } from '@/components/ui/button';
import { ProgressIndicator } from '@/components/ui/progress-indicator';
import { Chip } from '@/components/ui/chip';
import { useSpecializations } from '@/hooks/use-specializations';

const COMMON_LANGUAGES = ['English', 'Tagalog', 'Cebuano', 'Ilocano'];

const fieldClass =
  'w-full rounded-xl border border-outline-variant bg-surface-white px-4 py-3 text-sm text-on-surface font-manrope focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all';

export default function DoctorOnboardingStep3() {
  const router = useRouter();
  const { data, update } = useDoctorOnboarding();
  const { specializations, loading } = useSpecializations();

  const [specialization, setSpecialization] = useState(data.specialization);
  const [yearsOfExperience, setYearsOfExperience] = useState(data.yearsOfExperience?.toString() || '');
  const [languagesSpoken, setLanguagesSpoken] = useState(data.languagesSpoken);

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Keep a previously chosen value selectable even if the fetched list lacks it.
  const options = specialization && !specializations.includes(specialization)
    ? [specialization, ...specializations]
    : specializations;

  const toItems = (s: string) => s.split(',').map((x) => x.trim()).filter(Boolean);
  const toggleLanguage = (value: string) => {
    const items = toItems(languagesSpoken);
    const next = items.includes(value) ? items.filter((i) => i !== value) : [...items, value];
    setLanguagesSpoken(next.join(', '));
  };
  const isLanguageSelected = (value: string) => toItems(languagesSpoken).includes(value);

  const handleNext = () => {
    if (!specialization.trim()) {
      setErrors({ specialization: 'Specialization is required' });
      return;
    }

    update({
      specialization,
      yearsOfExperience: (yearsOfExperience && !isNaN(parseInt(yearsOfExperience, 10))) ? parseInt(yearsOfExperience, 10) : null,
      languagesSpoken,
    });
    router.push('/onboarding/doctor/4');
  };

  return (
    <div className="flex flex-col gap-6">
      <ProgressIndicator currentStep={3} totalSteps={5} />
      <div>
        <h1 className="text-2xl font-semibold text-text-primary font-plus-jakarta">Specialization & Experience</h1>
        <p className="mt-1 text-sm text-on-surface-variant font-manrope">
          Help patients understand your expertise.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        <FormField id="specialization" label="Primary Specialization" error={errors.specialization} required>
          <select
            id="specialization"
            value={specialization}
            onChange={(e) => {
              setSpecialization(e.target.value);
              if (errors.specialization) setErrors((prev) => {
                const n = { ...prev };
                delete n.specialization;
                return n;
              });
            }}
            className={fieldClass}
          >
            <option value="" disabled>{loading ? 'Loading…' : 'Select your specialization'}</option>
            {options.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </FormField>

        <FormField id="yearsOfExperience" label="Years of Experience (Optional)">
          <input
            id="yearsOfExperience"
            type="number"
            min="0"
            value={yearsOfExperience}
            onChange={(e) => setYearsOfExperience(e.target.value)}
            className={fieldClass}
            placeholder="10"
          />
        </FormField>

        <FormField id="languagesSpoken" label="Languages Spoken (Optional)" hint="Tap a suggestion or type your own, separated by commas">
          <div className="flex flex-col gap-2.5">
            <div className="flex flex-wrap gap-2">
              {COMMON_LANGUAGES.map((v) => (
                <Chip key={v} selected={isLanguageSelected(v)} onClick={() => toggleLanguage(v)}>{v}</Chip>
              ))}
            </div>
            <input
              id="languagesSpoken"
              value={languagesSpoken}
              onChange={(e) => setLanguagesSpoken(e.target.value)}
              className={fieldClass}
              placeholder="English, Tagalog"
            />
          </div>
        </FormField>
      </div>

      <div className="flex justify-between items-center pt-4">
        <Button variant="ghost" onClick={() => router.push('/onboarding/doctor/2')} className="text-on-surface-variant hover:text-primary">
          ← Back
        </Button>
        <Button onClick={handleNext} className="rounded-full px-8 py-6 text-base font-semibold shadow-lg hover:shadow-xl transition-all">
          Continue →
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify**

Run: `npm run lint && npm run build`
Expected: PASS.

---

### Task 8: Doctor step 4 — focus-area pills

**Files:**
- Modify: `frontend/src/app/onboarding/doctor/4/page.tsx`

- [ ] **Step 1: Add the Chip import + constant**

In `frontend/src/app/onboarding/doctor/4/page.tsx`, add to the imports:
```ts
import { Chip } from '@/components/ui/chip';
```
And add a module-level constant above the component (after the imports):
```ts
const COMMON_FOCUS = ['Preventive Care', 'Chronic Disease Management', 'Lifestyle & Nutrition', 'Mental Health'];
```

- [ ] **Step 2: Add toggle helpers in the component**

Right after `const [errors, setErrors] = useState<Record<string, string>>({});` add:
```ts
  const toItems = (s: string) => s.split(',').map((x) => x.trim()).filter(Boolean);
  const toggleFocus = (value: string) => {
    const items = toItems(consultationFocusAreas);
    const next = items.includes(value) ? items.filter((i) => i !== value) : [...items, value];
    setConsultationFocusAreas(next.join(', '));
  };
  const isFocusSelected = (value: string) => toItems(consultationFocusAreas).includes(value);
```

- [ ] **Step 3: Add pills above the focus-areas textarea**

Replace the existing focus-areas `FormField` block:

```tsx
        <FormField id="consultationFocusAreas" label="Focus Areas (Optional)">
          <textarea 
            id="consultationFocusAreas" 
            value={consultationFocusAreas} 
            onChange={e => setConsultationFocusAreas(e.target.value)} 
            className="w-full min-h-[80px] rounded-xl border border-outline-variant bg-surface-white px-4 py-3 text-sm text-on-surface font-manrope focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all resize-none" 
            placeholder="e.g. Hypertension management, Preventive cardiology, Heart failure..." 
          />
        </FormField>
```

with:

```tsx
        <FormField id="consultationFocusAreas" label="Focus Areas (Optional)" hint="Tap a suggestion or type your own, separated by commas">
          <div className="flex flex-col gap-2.5">
            <div className="flex flex-wrap gap-2">
              {COMMON_FOCUS.map((v) => (
                <Chip key={v} selected={isFocusSelected(v)} onClick={() => toggleFocus(v)}>{v}</Chip>
              ))}
            </div>
            <textarea
              id="consultationFocusAreas"
              value={consultationFocusAreas}
              onChange={(e) => setConsultationFocusAreas(e.target.value)}
              className="w-full min-h-[80px] rounded-xl border border-outline-variant bg-surface-white px-4 py-3 text-sm text-on-surface font-manrope focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all resize-none"
              placeholder="e.g. Hypertension management, Preventive cardiology, Heart failure..."
            />
          </div>
        </FormField>
```

- [ ] **Step 4: Verify**

Run: `npm run lint && npm run build`
Expected: PASS.

---

### Task 9: Doctor step 5 — inline editing + inline photo upload

**Files:**
- Overwrite: `frontend/src/app/onboarding/doctor/5/page.tsx`

- [ ] **Step 1: Replace the whole file**

```tsx
'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useDoctorOnboarding } from '@/context/doctor-onboarding-context';
import { apiRequest, apiUpload, ApiError } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { ProgressIndicator } from '@/components/ui/progress-indicator';
import { Spinner } from '@/components/ui/spinner';
import { Toast } from '@/components/ui/toast';
import { EditableRow, editInputClass } from '@/components/ui/editable-row';
import { useSpecializations } from '@/hooks/use-specializations';
import { formatPrc, formatPtr, isValidPrc, isValidPtr } from '@/lib/format';

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export default function DoctorOnboardingStep5() {
  const router = useRouter();
  const { data: session } = useSession();
  const { data, update } = useDoctorOnboarding();
  const { specializations } = useSpecializations();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<{ message: string; variant: 'error' | 'success' } | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);

  const specOptions = data.specialization && !specializations.includes(data.specialization)
    ? [data.specialization, ...specializations]
    : specializations;

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhotoError(null);
    const file = e.target.files?.[0];
    if (!file) return;
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

  const handleSubmit = async () => {
    if (!session?.user?.accessToken) {
      setToast({ message: 'Session expired. Please log in again.', variant: 'error' });
      return;
    }

    setIsSubmitting(true);
    setToast(null);

    try {
      const response = await apiRequest<{ profileComplete: boolean }>('/doctors/profile', {
        method: 'POST',
        body: {
          ...data,
          prcLicenseExpiry: data.prcLicenseExpiry || undefined,
          languagesSpoken: data.languagesSpoken
            ? data.languagesSpoken.split(',').map((s: string) => s.trim()).filter(Boolean)
            : [],
        },
        token: session.user.accessToken as string,
      });

      if (response.profileComplete) {
        setToast({ message: 'Profile completed successfully!', variant: 'success' });
        setTimeout(() => {
          router.push('/doctor/dashboard');
        }, 1500);
      }
    } catch (error) {
      console.error('Failed to save profile', error);
      setToast({ message: 'Failed to save profile. Please try again.', variant: 'error' });
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <ProgressIndicator currentStep={5} totalSteps={5} />

      <div>
        <h1 className="text-2xl font-semibold text-text-primary font-plus-jakarta">Review Your Profile</h1>
        <p className="mt-1 text-sm text-on-surface-variant font-manrope">
          Tap EDIT on any field to fix it right here.
        </p>
      </div>

      <div className="flex flex-col gap-6 overflow-y-auto max-h-[60vh] pr-2 custom-scrollbar">
        {/* Profile header with inline photo upload */}
        <div className="bg-surface-container rounded-2xl p-6 flex flex-col md:flex-row items-center gap-6 border border-outline-variant/50">
          <div className="relative flex-shrink-0">
            <div className="h-24 w-24 rounded-full bg-surface-container-high border-2 border-primary/20 overflow-hidden">
              {data.profilePictureUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={data.profilePictureUrl} alt="Profile" className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full flex items-center justify-center text-on-surface-variant font-medium">
                  No Photo
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => photoInputRef.current?.click()}
              disabled={uploadingPhoto}
              className="absolute -bottom-1 -right-1 bg-white text-primary p-2 rounded-xl shadow-lg hover:scale-110 transition-transform disabled:opacity-60 disabled:hover:scale-100"
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
              onChange={handlePhotoChange}
            />
          </div>
          <div className="flex-1 text-center md:text-left">
            <h2 className="text-xl font-bold text-on-surface font-plus-jakarta">{data.fullName || 'Not provided'}</h2>
            <p className="text-primary font-medium font-manrope">{data.professionalTitle || 'No title'}</p>
            <p className="text-sm text-on-surface-variant font-manrope mt-1">{data.specialization || '—'}</p>
            {photoError && <p role="alert" className="text-xs text-error font-manrope mt-1">{photoError}</p>}
          </div>
        </div>

        {/* Inline-editable fields */}
        <div className="bg-surface-white rounded-2xl p-6 border border-outline-variant/50 shadow-sm grid grid-cols-2 gap-x-8 gap-y-6">
          <EditableRow label="Full Name" display={data.fullName} initial={{ fullName: data.fullName }} onSave={update}
            render={(d, set) => <input className={editInputClass} value={d.fullName} onChange={(e) => set('fullName', e.target.value)} />} />
          <EditableRow label="Professional Title" display={data.professionalTitle} initial={{ professionalTitle: data.professionalTitle }} onSave={update}
            render={(d, set) => <input className={editInputClass} value={d.professionalTitle} onChange={(e) => set('professionalTitle', e.target.value)} />} />

          <EditableRow label="Specialization" display={data.specialization} initial={{ specialization: data.specialization }} onSave={update}
            render={(d, set) => (
              <select className={editInputClass} value={d.specialization} onChange={(e) => set('specialization', e.target.value)}>
                <option value="" disabled>Select…</option>
                {specOptions.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            )} />
          <EditableRow label="Years of Experience" display={data.yearsOfExperience ? `${data.yearsOfExperience} years` : ''} initial={{ yearsOfExperience: data.yearsOfExperience }} onSave={update}
            render={(d, set) => (
              <input type="number" min="0" className={editInputClass} value={d.yearsOfExperience ?? ''}
                onChange={(e) => set('yearsOfExperience', e.target.value === '' ? null : parseInt(e.target.value, 10))} />
            )} />

          <EditableRow label="PRC License" display={data.prcLicenseNo} initial={{ prcLicenseNo: data.prcLicenseNo }} onSave={update}
            validate={(d) => (isValidPrc(d.prcLicenseNo) ? null : "Can't save — PRC license number must be 7 digits")}
            render={(d, set) => <input className={editInputClass} inputMode="numeric" value={d.prcLicenseNo} onChange={(e) => set('prcLicenseNo', formatPrc(e.target.value))} />} />
          <EditableRow label="PRC Expiry" display={data.prcLicenseExpiry} initial={{ prcLicenseExpiry: data.prcLicenseExpiry }} onSave={update}
            render={(d, set) => <input type="date" className={editInputClass} value={d.prcLicenseExpiry} onChange={(e) => set('prcLicenseExpiry', e.target.value)} />} />

          <EditableRow label="PTR No." display={data.ptrNo} initial={{ ptrNo: data.ptrNo }} onSave={update}
            validate={(d) => (isValidPtr(d.ptrNo) ? null : "Can't save — PTR number must be 7–8 digits")}
            render={(d, set) => <input className={editInputClass} inputMode="numeric" value={d.ptrNo} onChange={(e) => set('ptrNo', formatPtr(e.target.value))} />} />
          <EditableRow label="Consultation Fee" display={data.consultationFee ? `₱${data.consultationFee.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : ''} initial={{ consultationFee: data.consultationFee }} onSave={update}
            render={(d, set) => (
              <input type="number" min="0" step="0.01" className={editInputClass} value={d.consultationFee ?? ''}
                onChange={(e) => set('consultationFee', e.target.value === '' ? null : parseFloat(e.target.value))} />
            )} />

          <EditableRow label="Region" display={data.region} initial={{ region: data.region }} onSave={update}
            render={(d, set) => <input className={editInputClass} value={d.region} onChange={(e) => set('region', e.target.value)} />} />
          <EditableRow label="City" display={data.city} initial={{ city: data.city }} onSave={update}
            render={(d, set) => <input className={editInputClass} value={d.city} onChange={(e) => set('city', e.target.value)} />} />

          <EditableRow fullWidth label="Languages" display={data.languagesSpoken} initial={{ languagesSpoken: data.languagesSpoken }} onSave={update}
            render={(d, set) => <input className={editInputClass} placeholder="Comma-separated" value={d.languagesSpoken} onChange={(e) => set('languagesSpoken', e.target.value)} />} />
          <EditableRow fullWidth label="Focus Areas" display={data.consultationFocusAreas} initial={{ consultationFocusAreas: data.consultationFocusAreas }} onSave={update}
            render={(d, set) => <input className={editInputClass} placeholder="Comma-separated" value={d.consultationFocusAreas} onChange={(e) => set('consultationFocusAreas', e.target.value)} />} />
          <EditableRow fullWidth label="Availability" display={data.availabilitySummary} initial={{ availabilitySummary: data.availabilitySummary }} onSave={update}
            render={(d, set) => <input className={editInputClass} value={d.availabilitySummary} onChange={(e) => set('availabilitySummary', e.target.value)} />} />
          <EditableRow fullWidth label="Professional Bio" display={data.bio} initial={{ bio: data.bio }} onSave={update}
            render={(d, set) => <textarea className={`${editInputClass} resize-y min-h-[80px]`} value={d.bio} onChange={(e) => set('bio', e.target.value)} />} />
        </div>
      </div>

      <div className="flex justify-between items-center pt-4">
        <Button variant="ghost" onClick={() => router.push('/onboarding/doctor/4')} disabled={isSubmitting} className="text-on-surface-variant hover:text-primary">
          ← Back
        </Button>
        <Button onClick={handleSubmit} disabled={isSubmitting} className="rounded-full px-8 py-6 text-base font-semibold shadow-lg hover:shadow-xl transition-all bg-primary text-white">
          {isSubmitting ? (
            <span className="flex items-center gap-2"><Spinner className="h-4 w-4" /> Completing...</span>
          ) : (
            'Complete Registration'
          )}
        </Button>
      </div>

      {toast && <Toast message={toast.message} variant={toast.variant} onDismiss={() => setToast(null)} />}
    </div>
  );
}
```

- [ ] **Step 2: Verify the whole doctor flow**

Run: `npm run lint && npm run build`
Expected: PASS.

- [ ] **Step 3: Commit Part C**

```bash
cd /home/vincentdev/vincent-projects/launchpad/telehealth-app
git add frontend/src/lib/schemas/onboarding.schemas.ts frontend/src/app/onboarding/doctor
git commit -m "feat(onboarding): doctor specialization dropdown, language/focus pills, PRC/PTR validation, inline review editing"
```

---

## PART D — FINALIZE

### Task 10: Full verification + cleanup

- [ ] **Step 1: Backend tests**

Run (from `backend/`): `npm test`
Expected: all suites PASS (includes new SpecializationsService test).

- [ ] **Step 2: Frontend lint + build**

Run (from `frontend/`): `npm run lint && npm run build`
Expected: PASS; only the 2 pre-existing unrelated warnings.

- [ ] **Step 3: Delete spec + plan per standing rule**

Only after everything is verified green:
```bash
cd /home/vincentdev/vincent-projects/launchpad/telehealth-app
git rm docs/superpowers/specs/2026-05-29-doctor-onboarding-enhancements-design.md
git rm docs/superpowers/plans/2026-05-29-doctor-onboarding-enhancements.md
git commit -m "chore: remove completed doctor onboarding enhancements spec and plan"
```

---

## Self-Review Notes (coverage vs spec)

- Backend `GET /specializations` public + test → Task 1. ✓
- `formatPrc`/`isValidPrc`/`formatPtr`/`isValidPtr` → Task 2. ✓
- Shared `Chip` extraction + patient step 4 refactor → Task 3. ✓
- Shared `EditableRow` extraction + patient step 6 refactor → Task 4. ✓
- `useSpecializations` hook → Task 5. ✓
- Doctor step 2 PRC/PTR format + schema refine → Task 6. ✓
- Doctor step 3 specialization select + language pills → Task 7. ✓
- Doctor step 4 focus-area pills → Task 8. ✓
- Doctor step 5 inline edit (all fields, specialization select, PRC/PTR validated) + inline photo upload → Task 9. ✓
- Submit shape unchanged (`...data` + languages split + expiry guard) → Task 9. ✓
- No patient behavior change beyond extractions → Tasks 3, 4. ✓
