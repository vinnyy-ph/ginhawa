# Doctor Onboarding Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a multi-step onboarding wizard for doctors to collect their personal information, specialization, experience, and practice details.

**Architecture:** We will implement a React Context (`DoctorOnboardingProvider`) to hold state across four steps, similar to the patient onboarding flow. We will replace the single-page `/onboarding/doctor/page.tsx` with a nested route structure `/(onboarding)/doctor/[step]/page.tsx` and a layout. Validation will occur at each step before progression. Final submission will hit `POST /doctors/profile`.

**Tech Stack:** Next.js (App Router), React Context, Tailwind CSS, shadcn/ui.

---

### Task 1: Create Doctor Onboarding Context

**Files:**
- Create: `frontend/src/context/doctor-onboarding-context.tsx`
- Create: `frontend/src/types/doctor-onboarding.ts`

- [ ] **Step 1: Write types**

```typescript
// frontend/src/types/doctor-onboarding.ts
export interface DoctorOnboardingData {
  fullName: string;
  professionalTitle: string;
  specialization: string;
  bio: string;
  yearsOfExperience: number | null;
  consultationFee: number | null;
  languagesSpoken: string;
  consultationFocusAreas: string;
  availabilitySummary: string;
  profilePictureUrl: string | null;
}

export const DOCTOR_ONBOARDING_DEFAULTS: DoctorOnboardingData = {
  fullName: '',
  professionalTitle: '',
  specialization: '',
  bio: '',
  yearsOfExperience: null,
  consultationFee: null,
  languagesSpoken: '',
  consultationFocusAreas: '',
  availabilitySummary: '',
  profilePictureUrl: null,
};
```

- [ ] **Step 2: Write Context Provider**

```tsx
// frontend/src/context/doctor-onboarding-context.tsx
'use client';

import * as React from 'react';
import { type DoctorOnboardingData, DOCTOR_ONBOARDING_DEFAULTS } from '@/types/doctor-onboarding';

interface DoctorOnboardingContextValue {
  data: DoctorOnboardingData;
  update: (patch: Partial<DoctorOnboardingData>) => void;
  reset: () => void;
}

const DoctorOnboardingContext = React.createContext<DoctorOnboardingContextValue | null>(null);

export function DoctorOnboardingProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = React.useState<DoctorOnboardingData>(DOCTOR_ONBOARDING_DEFAULTS);

  const update = React.useCallback((patch: Partial<DoctorOnboardingData>) => {
    setData((prev) => ({ ...prev, ...patch }));
  }, []);

  const reset = React.useCallback(() => {
    setData(DOCTOR_ONBOARDING_DEFAULTS);
  }, []);

  return (
    <DoctorOnboardingContext.Provider value={{ data, update, reset }}>
      {children}
    </DoctorOnboardingContext.Provider>
  );
}

export function useDoctorOnboarding(): DoctorOnboardingContextValue {
  const ctx = React.useContext(DoctorOnboardingContext);
  if (!ctx) {
    throw new Error('useDoctorOnboarding must be used within <DoctorOnboardingProvider>');
  }
  return ctx;
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/types/doctor-onboarding.ts frontend/src/context/doctor-onboarding-context.tsx
git commit -m "feat: add doctor onboarding context and types"
```

### Task 2: Setup Routing and Layout

**Files:**
- Create: `frontend/src/app/onboarding/doctor/layout.tsx`
- Modify: `frontend/src/app/onboarding/doctor/page.tsx`
- Create: `frontend/src/app/onboarding/doctor/1/page.tsx`

- [ ] **Step 1: Write Layout**

```tsx
// frontend/src/app/onboarding/doctor/layout.tsx
import { DoctorOnboardingProvider } from '@/context/doctor-onboarding-context';

export default function DoctorOnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DoctorOnboardingProvider>
      <div className="min-h-screen bg-surface flex items-center justify-center p-4">
        <div className="w-full max-w-2xl bg-surface-white rounded-3xl shadow-sm border border-outline-variant p-8 md:p-12 relative overflow-hidden">
          {children}
        </div>
      </div>
    </DoctorOnboardingProvider>
  );
}
```

- [ ] **Step 2: Update Root Page to Redirect**

```tsx
// frontend/src/app/onboarding/doctor/page.tsx
import { redirect } from 'next/navigation';

export default function DoctorOnboardingRoot() {
  redirect('/onboarding/doctor/1');
}
```

- [ ] **Step 3: Create Stub for Step 1**

```tsx
// frontend/src/app/onboarding/doctor/1/page.tsx
export default function Step1() {
  return <div>Step 1</div>;
}
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/app/onboarding/doctor/layout.tsx frontend/src/app/onboarding/doctor/page.tsx frontend/src/app/onboarding/doctor/1/page.tsx
git commit -m "feat: setup doctor onboarding layout and redirection"
```

### Task 3: Implement Step 1 (Personal Info & Photo)

**Files:**
- Modify: `frontend/src/app/onboarding/doctor/1/page.tsx`

- [ ] **Step 1: Write Step 1 Implementation**

```tsx
// frontend/src/app/onboarding/doctor/1/page.tsx
'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useDoctorOnboarding } from '@/context/doctor-onboarding-context';
import { FormField } from '@/components/ui/form-field';
import { Button } from '@/components/ui/button';
import { ProgressIndicator } from '@/components/ui/progress-indicator';
import { Spinner } from '@/components/ui/spinner';
import { apiUpload, ApiError } from '@/lib/api-client';

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export default function DoctorOnboardingStep1() {
  const router = useRouter();
  const { data: session } = useSession();
  const { data, update } = useDoctorOnboarding();
  const inputRef = useRef<HTMLInputElement>(null);

  const [fullName, setFullName] = useState(data.fullName);
  const [professionalTitle, setProfessionalTitle] = useState(data.professionalTitle);
  const [preview, setPreview] = useState<string | null>(data.profilePictureUrl);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setServerError(null);
    const file = e.target.files?.[0];
    if (!file) return;

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

  const handleNext = async () => {
    const newErrors: Record<string, string> = {};
    if (!fullName.trim()) newErrors.fullName = 'Full Name is required';
    if (!professionalTitle.trim()) newErrors.professionalTitle = 'Professional Title is required';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    if (selectedFile) {
      setUploading(true);
      const token = session?.user?.accessToken;
      if (!token) {
        setServerError('Session expired. Please log in again.');
        setUploading(false);
        return;
      }
      try {
        const { url } = await apiUpload<{ url: string }>('/uploads/profile-picture', selectedFile, token);
        update({ fullName, professionalTitle, profilePictureUrl: url });
        router.push('/onboarding/doctor/2');
      } catch (err) {
         if (err instanceof ApiError) {
          setServerError(err.message ?? 'Upload failed. Please try again.');
        } else {
          setServerError('Something went wrong. Please try again.');
        }
        setUploading(false);
      }
    } else {
      update({ fullName, professionalTitle });
      router.push('/onboarding/doctor/2');
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <ProgressIndicator currentStep={1} totalSteps={4} />
      <div>
        <h1 className="text-2xl font-semibold text-text-primary font-plus-jakarta">Personal Information</h1>
        <p className="mt-1 text-sm text-on-surface-variant font-manrope">
          Let patients know who they are consulting with.
        </p>
      </div>

      <div className="flex flex-col items-center gap-5 my-4">
        <div
          className="h-32 w-32 rounded-full bg-surface-container border-2 border-dashed border-outline-variant overflow-hidden flex items-center justify-center cursor-pointer hover:border-primary transition-colors"
          onClick={() => inputRef.current?.click()}
          role="button"
          tabIndex={0}
        >
          {preview ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={preview} alt="Preview" className="h-full w-full object-cover" />
          ) : (
            <span className="text-xs text-outline font-manrope">Upload Photo</span>
          )}
        </div>
        <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={handleFileChange} />
        {serverError && <p className="text-xs text-error font-manrope">{serverError}</p>}
      </div>

      <div className="flex flex-col gap-4">
        <FormField id="fullName" label="Full Name" error={errors.fullName} required>
          <input id="fullName" value={fullName} onChange={e => setFullName(e.target.value)} className="w-full rounded-md border border-outline-variant bg-surface-white px-3 py-2.5 text-sm text-on-surface font-manrope focus:outline-none focus:border-primary" placeholder="Dr. Jane Doe" />
        </FormField>
        <FormField id="professionalTitle" label="Professional Title" error={errors.professionalTitle} required>
          <input id="professionalTitle" value={professionalTitle} onChange={e => setProfessionalTitle(e.target.value)} className="w-full rounded-md border border-outline-variant bg-surface-white px-3 py-2.5 text-sm text-on-surface font-manrope focus:outline-none focus:border-primary" placeholder="MD, FPCP" />
        </FormField>
      </div>

      <div className="flex justify-end pt-4">
        <Button onClick={handleNext} disabled={uploading}>
           {uploading ? <><Spinner /> Uploading...</> : 'Continue →'}
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/app/onboarding/doctor/1/page.tsx
git commit -m "feat: implement doctor onboarding step 1"
```

### Task 4: Implement Step 2 (Specialization & Experience)

**Files:**
- Create: `frontend/src/app/onboarding/doctor/2/page.tsx`

- [ ] **Step 1: Write Step 2 Implementation**

```tsx
// frontend/src/app/onboarding/doctor/2/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useDoctorOnboarding } from '@/context/doctor-onboarding-context';
import { FormField } from '@/components/ui/form-field';
import { Button } from '@/components/ui/button';
import { ProgressIndicator } from '@/components/ui/progress-indicator';

export default function DoctorOnboardingStep2() {
  const router = useRouter();
  const { data, update } = useDoctorOnboarding();

  const [specialization, setSpecialization] = useState(data.specialization);
  const [yearsOfExperience, setYearsOfExperience] = useState(data.yearsOfExperience?.toString() || '');
  const [languagesSpoken, setLanguagesSpoken] = useState(data.languagesSpoken);
  
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleNext = () => {
    if (!specialization.trim()) {
      setErrors({ specialization: 'Specialization is required' });
      return;
    }

    update({ 
      specialization, 
      yearsOfExperience: yearsOfExperience ? parseInt(yearsOfExperience, 10) : null,
      languagesSpoken 
    });
    router.push('/onboarding/doctor/3');
  };

  return (
    <div className="flex flex-col gap-6">
      <ProgressIndicator currentStep={2} totalSteps={4} />
      <div>
        <h1 className="text-2xl font-semibold text-text-primary font-plus-jakarta">Specialization & Experience</h1>
        <p className="mt-1 text-sm text-on-surface-variant font-manrope">
          Help patients understand your expertise.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        <FormField id="specialization" label="Primary Specialization" error={errors.specialization} required>
          <input id="specialization" value={specialization} onChange={e => setSpecialization(e.target.value)} className="w-full rounded-md border border-outline-variant bg-surface-white px-3 py-2.5 text-sm text-on-surface font-manrope focus:outline-none focus:border-primary" placeholder="Cardiology" />
        </FormField>
        <FormField id="yearsOfExperience" label="Years of Experience (Optional)">
          <input id="yearsOfExperience" type="number" min="0" value={yearsOfExperience} onChange={e => setYearsOfExperience(e.target.value)} className="w-full rounded-md border border-outline-variant bg-surface-white px-3 py-2.5 text-sm text-on-surface font-manrope focus:outline-none focus:border-primary" placeholder="10" />
        </FormField>
        <FormField id="languagesSpoken" label="Languages Spoken (Optional)">
          <input id="languagesSpoken" value={languagesSpoken} onChange={e => setLanguagesSpoken(e.target.value)} className="w-full rounded-md border border-outline-variant bg-surface-white px-3 py-2.5 text-sm text-on-surface font-manrope focus:outline-none focus:border-primary" placeholder="English, Tagalog" />
        </FormField>
      </div>

      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={() => router.push('/onboarding/doctor/1')}>← Back</Button>
        <Button onClick={handleNext}>Continue →</Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/app/onboarding/doctor/2/page.tsx
git commit -m "feat: implement doctor onboarding step 2"
```

### Task 5: Implement Step 3 (Practice Details)

**Files:**
- Create: `frontend/src/app/onboarding/doctor/3/page.tsx`

- [ ] **Step 1: Write Step 3 Implementation**

```tsx
// frontend/src/app/onboarding/doctor/3/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useDoctorOnboarding } from '@/context/doctor-onboarding-context';
import { FormField } from '@/components/ui/form-field';
import { Button } from '@/components/ui/button';
import { ProgressIndicator } from '@/components/ui/progress-indicator';

export default function DoctorOnboardingStep3() {
  const router = useRouter();
  const { data, update } = useDoctorOnboarding();

  const [bio, setBio] = useState(data.bio);
  const [consultationFocusAreas, setConsultationFocusAreas] = useState(data.consultationFocusAreas);
  const [consultationFee, setConsultationFee] = useState(data.consultationFee?.toString() || '');
  const [availabilitySummary, setAvailabilitySummary] = useState(data.availabilitySummary);
  
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleNext = () => {
    if (!bio.trim()) {
      setErrors({ bio: 'Short Bio is required' });
      return;
    }

    update({ 
      bio, 
      consultationFocusAreas,
      consultationFee: consultationFee ? parseInt(consultationFee, 10) : null,
      availabilitySummary
    });
    router.push('/onboarding/doctor/4');
  };

  return (
    <div className="flex flex-col gap-6">
      <ProgressIndicator currentStep={3} totalSteps={4} />
      <div>
        <h1 className="text-2xl font-semibold text-text-primary font-plus-jakarta">Practice Details</h1>
        <p className="mt-1 text-sm text-on-surface-variant font-manrope">
          Provide more context about your consultations.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        <FormField id="bio" label="Short Bio" error={errors.bio} required>
          <textarea id="bio" value={bio} onChange={e => setBio(e.target.value)} rows={3} className="w-full rounded-md border border-outline-variant bg-surface-white px-3 py-2.5 text-sm text-on-surface font-manrope focus:outline-none focus:border-primary" placeholder="Brief introduction about yourself..." />
        </FormField>
        <FormField id="consultationFocusAreas" label="Focus Areas (Optional)">
          <textarea id="consultationFocusAreas" value={consultationFocusAreas} onChange={e => setConsultationFocusAreas(e.target.value)} rows={2} className="w-full rounded-md border border-outline-variant bg-surface-white px-3 py-2.5 text-sm text-on-surface font-manrope focus:outline-none focus:border-primary" placeholder="Hypertension, Heart Failure" />
        </FormField>
        <FormField id="consultationFee" label="Consultation Fee (Optional)">
          <input id="consultationFee" type="number" min="0" value={consultationFee} onChange={e => setConsultationFee(e.target.value)} className="w-full rounded-md border border-outline-variant bg-surface-white px-3 py-2.5 text-sm text-on-surface font-manrope focus:outline-none focus:border-primary" placeholder="500" />
        </FormField>
        <FormField id="availabilitySummary" label="Availability Summary (Optional)">
          <input id="availabilitySummary" value={availabilitySummary} onChange={e => setAvailabilitySummary(e.target.value)} className="w-full rounded-md border border-outline-variant bg-surface-white px-3 py-2.5 text-sm text-on-surface font-manrope focus:outline-none focus:border-primary" placeholder="Mon-Fri, 9AM-5PM" />
        </FormField>
      </div>

      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={() => router.push('/onboarding/doctor/2')}>← Back</Button>
        <Button onClick={handleNext}>Continue →</Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/app/onboarding/doctor/3/page.tsx
git commit -m "feat: implement doctor onboarding step 3"
```

### Task 6: Implement Step 4 (Review & Submit)

**Files:**
- Create: `frontend/src/app/onboarding/doctor/4/page.tsx`

- [ ] **Step 1: Write Step 4 Implementation**

```tsx
// frontend/src/app/onboarding/doctor/4/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useDoctorOnboarding } from '@/context/doctor-onboarding-context';
import { apiRequest } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { ProgressIndicator } from '@/components/ui/progress-indicator';
import { Spinner } from '@/components/ui/spinner';
import { Toast } from '@/components/ui/toast';

export default function DoctorOnboardingStep4() {
  const router = useRouter();
  const { data: session } = useSession();
  const { data } = useDoctorOnboarding();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<{ message: string; variant: 'error' | 'success' } | null>(null);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setToast(null);

    try {
      const response = await apiRequest<{ profileComplete: boolean }>('/doctors/profile', {
        method: 'POST',
        body: data,
        token: session?.user?.accessToken as string,
      });

      if (response.profileComplete) {
        router.push('/doctor/dashboard');
      }
    } catch (error) {
      console.error('Failed to save profile', error);
      setToast({ message: 'Failed to save profile. Please try again.', variant: 'error' });
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <ProgressIndicator currentStep={4} totalSteps={4} />
      <div>
        <h1 className="text-2xl font-semibold text-text-primary font-plus-jakarta">Review Your Profile</h1>
        <p className="mt-1 text-sm text-on-surface-variant font-manrope">
          Make sure everything looks correct before submitting.
        </p>
      </div>

      <div className="bg-surface-container rounded-xl p-5 flex flex-col gap-4">
         {data.profilePictureUrl && (
          <div className="flex justify-center mb-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={data.profilePictureUrl} alt="Profile" className="w-24 h-24 rounded-full object-cover border border-outline-variant" />
          </div>
         )}
         
        <div className="grid grid-cols-2 gap-y-3 text-sm">
          <div className="text-on-surface-variant font-manrope">Full Name</div>
          <div className="text-on-surface font-medium">{data.fullName}</div>
          
          <div className="text-on-surface-variant font-manrope">Title</div>
          <div className="text-on-surface font-medium">{data.professionalTitle}</div>
          
          <div className="text-on-surface-variant font-manrope">Specialization</div>
          <div className="text-on-surface font-medium">{data.specialization}</div>
          
          <div className="text-on-surface-variant font-manrope">Bio</div>
          <div className="text-on-surface font-medium line-clamp-3">{data.bio}</div>
        </div>
      </div>

      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={() => router.push('/onboarding/doctor/3')} disabled={isSubmitting}>← Edit</Button>
        <Button onClick={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? <><Spinner /> Completing...</> : 'Complete Profile'}
        </Button>
      </div>

      {toast && (
        <Toast 
          message={toast.message} 
          variant={toast.variant} 
          onDismiss={() => setToast(null)} 
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/app/onboarding/doctor/4/page.tsx
git commit -m "feat: implement doctor onboarding step 4 review"
```

### Task 7: Update Project Audit

**Files:**
- Modify: `docs/audits/project_audit.md`

- [ ] **Step 1: Update Project Audit Document**
Update `docs/audits/project_audit.md` to reflect that the multi-step doctor onboarding flow is completed and all fields are wired properly.

- [ ] **Step 2: Commit**

```bash
git add docs/audits/project_audit.md
git commit -m "docs: update project audit with doctor onboarding completion"
```
