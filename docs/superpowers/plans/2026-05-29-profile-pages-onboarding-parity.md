# Profile Pages ↔ Onboarding Field Parity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring the patient and doctor dashboard "My Profile" pages to full field parity with the updated onboarding flows, with the small backend changes needed to load and save those fields.

**Architecture:** Both PATCH DTOs already accept every field, so backend work is two surgical service edits (include medical-history on patient GET; sync the specialization junction on doctor update). Frontend rebuilds both profile pages as sectioned forms reusing existing onboarding inputs/formatters/validators, plus two small shared UI units (`ProfileSection`, `ProfilePhotoField`).

**Tech Stack:** NestJS + Prisma + Jest (backend); Next.js (App Router) + React + Tailwind + next-auth (frontend).

**Spec:** `docs/superpowers/specs/2026-05-29-profile-pages-onboarding-parity-design.md`

---

## File Structure

**Backend (modify):**
- `backend/src/patients/patients.service.ts` — `findByUserId` includes `medicalHistoryRecord`.
- `backend/src/patients/patients.service.spec.ts` — update + add tests.
- `backend/src/doctors/doctors.service.ts` — `update` syncs primary specialization junction.
- `backend/src/doctors/doctors.service.spec.ts` — update + add tests.

**Frontend (create):**
- `frontend/src/components/ui/profile-section.tsx` — titled section wrapper.
- `frontend/src/components/ui/profile-photo-field.tsx` — avatar + immediate upload.

**Frontend (modify):**
- `frontend/src/types/patient.ts` — extend `PatientProfile`, add medical-history record type.
- `frontend/src/app/dashboard/profile/page.tsx` — rebuilt patient profile page.
- `frontend/src/app/doctor/profile/page.tsx` — rebuilt doctor profile page.

---

## Task 1: Backend — patient GET includes structured medical history

**Files:**
- Modify: `backend/src/patients/patients.service.ts:36-42`
- Test: `backend/src/patients/patients.service.spec.ts:125-149`

- [ ] **Step 1: Update existing test + add coverage for the include**

In `backend/src/patients/patients.service.spec.ts`, replace the whole `describe('findByUserId', …)` block (lines ~125-149) with:

```ts
  describe('findByUserId', () => {
    it('should return a profile (with medical history) if found', async () => {
      const userId = 'user123';
      const expectedResult = {
        id: 'profile123',
        userId,
        medicalHistoryRecord: { id: 'h1', allergies: ['nuts'] },
      };
      mockPrismaService.patientProfile.findUnique.mockResolvedValue(
        expectedResult,
      );

      const result = await service.findByUserId(userId);

      expect(mockPrismaService.patientProfile.findUnique).toHaveBeenCalledWith({
        where: { userId },
        include: { medicalHistoryRecord: true },
      });
      expect(result).toEqual(expectedResult);
    });

    it('should throw NotFoundException if not found', async () => {
      const userId = 'user123';
      mockPrismaService.patientProfile.findUnique.mockResolvedValue(null);

      await expect(service.findByUserId(userId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
```

- [ ] **Step 2: Run tests to verify the include test fails**

Run: `cd backend && npx jest src/patients/patients.service.spec.ts -t findByUserId`
Expected: FAIL — `findUnique` called with `{ where: { userId } }`, missing `include`.

- [ ] **Step 3: Add the include in the service**

In `backend/src/patients/patients.service.ts`, change `findByUserId`:

```ts
  async findByUserId(userId: string) {
    const profile = await this.prisma.patientProfile.findUnique({
      where: { userId },
      include: { medicalHistoryRecord: true },
    });
    if (!profile) throw new NotFoundException('Profile not found');
    return profile;
  }
```

- [ ] **Step 4: Run tests to verify pass**

Run: `cd backend && npx jest src/patients/patients.service.spec.ts`
Expected: PASS (all PatientsService tests green).

- [ ] **Step 5: Commit**

```bash
git add backend/src/patients/patients.service.ts backend/src/patients/patients.service.spec.ts
git commit -m "feat(patients): include medical history in profile fetch"
```

---

## Task 2: Backend — doctor update syncs primary specialization junction

**Files:**
- Modify: `backend/src/doctors/doctors.service.ts:92-98`
- Test: `backend/src/doctors/doctors.service.spec.ts:176-192`

- [ ] **Step 1: Replace the `update` test block**

In `backend/src/doctors/doctors.service.spec.ts`, replace the whole `describe('update', …)` block (lines ~176-192) with:

```ts
  describe('update', () => {
    it('updates the profile and syncs the primary specialization', async () => {
      const existing = { id: '1', userId: 'user-1' };
      mockPrismaService.doctorProfile.findUnique.mockResolvedValue(existing);

      const mockTx = {
        doctorProfile: { update: jest.fn() },
        specialization: {
          upsert: jest.fn().mockResolvedValue({ id: 'spec-1', name: 'Neurology' }),
        },
        doctorSpecialization: {
          deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
          upsert: jest.fn().mockResolvedValue({}),
        },
      };
      const updateDto = { specialization: 'Neurology' };
      const expected = { ...existing, ...updateDto };
      mockTx.doctorProfile.update.mockResolvedValue(expected);
      (mockPrismaService.$transaction as jest.Mock).mockImplementation(
        async (cb) => cb(mockTx),
      );

      const result = await service.update('user-1', updateDto);

      expect(result).toEqual(expected);
      expect(mockTx.doctorProfile.update).toHaveBeenCalledWith({
        where: { id: existing.id },
        data: updateDto,
      });
      expect(mockTx.specialization.upsert).toHaveBeenCalled();
      expect(mockTx.doctorSpecialization.upsert).toHaveBeenCalled();
    });

    it('skips specialization sync when no specialization is provided', async () => {
      const existing = { id: '1', userId: 'user-1' };
      mockPrismaService.doctorProfile.findUnique.mockResolvedValue(existing);

      const mockTx = {
        doctorProfile: {
          update: jest.fn().mockResolvedValue({ ...existing, bio: 'x' }),
        },
        specialization: { upsert: jest.fn() },
        doctorSpecialization: { deleteMany: jest.fn(), upsert: jest.fn() },
      };
      (mockPrismaService.$transaction as jest.Mock).mockImplementation(
        async (cb) => cb(mockTx),
      );

      await service.update('user-1', { bio: 'x' });

      expect(mockTx.specialization.upsert).not.toHaveBeenCalled();
    });
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && npx jest src/doctors/doctors.service.spec.ts -t "update"`
Expected: FAIL — current `update` calls `prisma.doctorProfile.update` directly (no `$transaction`, no junction sync).

- [ ] **Step 3: Rewrite `update` to sync the junction in a transaction**

In `backend/src/doctors/doctors.service.ts`, replace `update` (lines ~92-98):

```ts
  async update(userId: string, data: UpdateDoctorDto) {
    const profile = await this.findByUserId(userId);
    return this.prisma.$transaction(async (tx) => {
      const saved = await tx.doctorProfile.update({
        where: { id: profile.id },
        data,
      });
      if (data.specialization) {
        await this.syncPrimarySpecialization(tx, saved.id, data.specialization);
      }
      return saved;
    });
  }
```

(`syncPrimarySpecialization(tx, doctorId, name)` already exists at lines ~60-80 and is reused as-is.)

- [ ] **Step 4: Run tests to verify pass**

Run: `cd backend && npx jest src/doctors/doctors.service.spec.ts`
Expected: PASS (all DoctorsService tests green).

- [ ] **Step 5: Commit**

```bash
git add backend/src/doctors/doctors.service.ts backend/src/doctors/doctors.service.spec.ts
git commit -m "feat(doctors): sync primary specialization on profile update"
```

---

## Task 3: Frontend — extend the PatientProfile type

**Files:**
- Modify: `frontend/src/types/patient.ts` (the `PatientProfile` interface block)

- [ ] **Step 1: Add the medical-history record type and extend PatientProfile**

In `frontend/src/types/patient.ts`, replace the existing `/** Shape returned by GET /patients/profile */ export interface PatientProfile { … }` block with:

```ts
/** Structured medical history nested under GET /patients/profile */
export interface PatientMedicalHistoryRecord {
  bloodType: string | null;
  allergies: string[];
  chronicConditions: string[];
  currentMedications: string[];
  pastSurgeries: string | null;
  familyHistory: string | null;
  smokingStatus: string | null;
}

/** Shape returned by GET /patients/profile */
export interface PatientProfile {
  id: string;
  userId: string;
  fullName: string;
  birthdate: string;
  weight: number | null;
  height: number | null;
  profilePictureUrl: string | null;
  contactDetails: string | null;
  medicalHistory: string | null;
  address: string | null;
  city: string | null;
  region: string | null;
  philhealthId: string | null;
  hmoProvider: string | null;
  hmoCardNo: string | null;
  medicalHistoryRecord: PatientMedicalHistoryRecord | null;
  createdAt: string;
  updatedAt: string;
}
```

- [ ] **Step 2: Typecheck**

Run: `cd frontend && npx tsc --noEmit`
Expected: PASS (no errors introduced).

- [ ] **Step 3: Commit**

```bash
git add frontend/src/types/patient.ts
git commit -m "feat(types): extend PatientProfile with location, insurance, medical history"
```

---

## Task 4: Frontend — shared `ProfileSection` and `ProfilePhotoField`

**Files:**
- Create: `frontend/src/components/ui/profile-section.tsx`
- Create: `frontend/src/components/ui/profile-photo-field.tsx`

- [ ] **Step 1: Create `ProfileSection`**

Create `frontend/src/components/ui/profile-section.tsx`:

```tsx
'use client';

import * as React from 'react';

/** Titled section block for the dashboard profile forms. */
export function ProfileSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant font-manrope">
        {title}
      </h2>
      {children}
    </section>
  );
}
```

- [ ] **Step 2: Create `ProfilePhotoField`**

Create `frontend/src/components/ui/profile-photo-field.tsx`:

```tsx
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
```

- [ ] **Step 3: Typecheck**

Run: `cd frontend && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/ui/profile-section.tsx frontend/src/components/ui/profile-photo-field.tsx
git commit -m "feat(ui): add ProfileSection and ProfilePhotoField"
```

---

## Task 5: Frontend — rebuild the patient profile page

**Files:**
- Modify (full replace): `frontend/src/app/dashboard/profile/page.tsx`

- [ ] **Step 1: Replace the page with the sectioned form**

Overwrite `frontend/src/app/dashboard/profile/page.tsx` with:

```tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { apiRequest } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { CheckCircledIcon } from "@radix-ui/react-icons";
import { FormField } from "@/components/ui/form-field";
import { PhoneInput } from "@/components/ui/phone-input";
import { Chip } from "@/components/ui/chip";
import { ProfileSection } from "@/components/ui/profile-section";
import { ProfilePhotoField } from "@/components/ui/profile-photo-field";
import {
  onboardingInputClass,
  onboardingTextareaClass,
} from "@/lib/onboarding-styles";
import {
  formatPhone,
  formatPhilHealth,
  formatHmoCard,
  isValidPhilHealth,
  isValidHmoCard,
} from "@/lib/format";
import type { PatientProfile } from "@/types/patient";

const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "Unknown"];
const SMOKING_OPTIONS = [
  { value: "", label: "Prefer not to say" },
  { value: "Never", label: "Never" },
  { value: "Former", label: "Former" },
  { value: "Current", label: "Current" },
];
const COMMON_ALLERGIES = ["Penicillin", "Seafood", "Peanuts", "Aspirin"];
const COMMON_CONDITIONS = ["Hypertension", "Diabetes", "Asthma", "High Cholesterol"];
const COMMON_MEDICATIONS = ["Metformin", "Amlodipine", "Losartan", "Salbutamol"];

const toItems = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);
const optList = (s: string) => {
  const l = toItems(s);
  return l.length ? l : undefined;
};

export default function PatientProfilePage() {
  const { data: session } = useSession();
  const token = session?.user?.accessToken;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Personal
  const [fullName, setFullName] = useState("");
  const [birthdate, setBirthdate] = useState("");
  const [contactDigits, setContactDigits] = useState(""); // raw digits
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [profilePictureUrl, setProfilePictureUrl] = useState<string | null>(null);

  // Location & insurance
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [region, setRegion] = useState("");
  const [philhealthId, setPhilhealthId] = useState("");
  const [hmoProvider, setHmoProvider] = useState("");
  const [hmoCardNo, setHmoCardNo] = useState("");

  // Medical history
  const [bloodType, setBloodType] = useState("");
  const [smokingStatus, setSmokingStatus] = useState("");
  const [allergies, setAllergies] = useState("");
  const [chronicConditions, setChronicConditions] = useState("");
  const [currentMedications, setCurrentMedications] = useState("");
  const [pastSurgeries, setPastSurgeries] = useState("");
  const [familyHistory, setFamilyHistory] = useState("");

  useEffect(() => {
    if (!token) return;
    apiRequest<PatientProfile>("/patients/profile", { token })
      .then((d) => {
        setFullName(d.fullName ?? "");
        setBirthdate(d.birthdate ? d.birthdate.split("T")[0] : "");
        setContactDigits((d.contactDetails ?? "").replace(/\D/g, "").replace(/^0/, "").slice(0, 10));
        setWeight(d.weight != null ? String(d.weight) : "");
        setHeight(d.height != null ? String(d.height) : "");
        setProfilePictureUrl(d.profilePictureUrl ?? null);
        setAddress(d.address ?? "");
        setCity(d.city ?? "");
        setRegion(d.region ?? "");
        setPhilhealthId(d.philhealthId ?? "");
        setHmoProvider(d.hmoProvider ?? "");
        setHmoCardNo(d.hmoCardNo ?? "");
        const m = d.medicalHistoryRecord;
        setBloodType(m?.bloodType ?? "");
        setSmokingStatus(m?.smokingStatus ?? "");
        setAllergies((m?.allergies ?? []).join(", "));
        setChronicConditions((m?.chronicConditions ?? []).join(", "));
        setCurrentMedications((m?.currentMedications ?? []).join(", "));
        setPastSurgeries(m?.pastSurgeries ?? "");
        setFamilyHistory(m?.familyHistory ?? "");
      })
      .catch(() => setError("Failed to load profile."))
      .finally(() => setLoading(false));
  }, [token]);

  const bmi = useMemo(() => {
    const w = parseFloat(weight);
    const h = parseFloat(height);
    if (!w || !h || h <= 0) return null;
    const m = h / 100;
    return Math.round((w / (m * m)) * 10) / 10;
  }, [weight, height]);

  const toggleChip = (
    value: string,
    current: string,
    setter: (v: string) => void,
  ) => {
    const items = toItems(current);
    const next = items.includes(value)
      ? items.filter((i) => i !== value)
      : [...items, value];
    setter(next.join(", "));
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;

    if (philhealthId && !isValidPhilHealth(philhealthId)) {
      setError("Enter the full 12-digit PhilHealth ID, or leave it blank.");
      return;
    }
    if (hmoCardNo && !isValidHmoCard(hmoCardNo)) {
      setError("Enter the full 12-character HMO card number, or leave it blank.");
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      await apiRequest("/patients/profile", {
        method: "PATCH",
        token,
        body: {
          fullName: fullName.trim() || undefined,
          birthdate: birthdate || undefined,
          weight: weight ? Number(weight) : undefined,
          height: height ? Number(height) : undefined,
          contactDetails: contactDigits || undefined,
          profilePictureUrl: profilePictureUrl || undefined,
          address: address.trim() || undefined,
          city: city.trim() || undefined,
          region: region.trim() || undefined,
          philhealthId: philhealthId.trim() || undefined,
          hmoProvider: hmoProvider.trim() || undefined,
          hmoCardNo: hmoCardNo.trim() || undefined,
        },
      });

      await apiRequest("/patients/medical-history", {
        method: "PATCH",
        token,
        body: {
          bloodType: bloodType || undefined,
          allergies: optList(allergies),
          chronicConditions: optList(chronicConditions),
          currentMedications: optList(currentMedications),
          pastSurgeries: pastSurgeries.trim() || undefined,
          familyHistory: familyHistory.trim() || undefined,
          smokingStatus: smokingStatus || undefined,
        },
      });

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch {
      setError("Failed to save profile. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <DashboardLayout role="patient">
      <div className="max-w-2xl animate-in fade-in duration-500">
        <div className="mb-8">
          <h1 className="text-3xl font-bold font-serif text-text-primary mb-2">My Profile</h1>
          <p className="text-on-surface-variant">Update your personal, location, and medical information.</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Spinner size="lg" /></div>
        ) : (
          <div className="bg-surface-white rounded-xl shadow-soft border border-outline-variant/30 p-6">
            {success && (
              <div className="mb-6 flex items-center gap-2 text-sm text-success bg-success/10 px-4 py-3 rounded-lg border border-success/20">
                <CheckCircledIcon className="w-4 h-4 shrink-0" />
                Profile updated successfully.
              </div>
            )}
            {error && (
              <div className="mb-6 text-sm text-error bg-red-50 px-4 py-3 rounded-lg border border-red-100">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-8">
              <ProfileSection title="Personal">
                <ProfilePhotoField value={profilePictureUrl} onChange={setProfilePictureUrl} />
                <FormField id="p-fullName" label="Full name">
                  <input id="p-fullName" className={onboardingInputClass} value={fullName} onChange={(e) => setFullName(e.target.value)} />
                </FormField>
                <FormField id="p-birthdate" label="Date of birth">
                  <input id="p-birthdate" type="date" className={onboardingInputClass} value={birthdate} onChange={(e) => setBirthdate(e.target.value)} />
                </FormField>
                <FormField id="p-contact" label="Contact number">
                  <PhoneInput
                    placeholder="917 123 4567"
                    value={formatPhone(contactDigits)}
                    onChange={(e) =>
                      setContactDigits(e.target.value.replace(/\D/g, "").replace(/^0/, "").slice(0, 10))
                    }
                  />
                </FormField>
                <div className="grid grid-cols-2 gap-4">
                  <FormField id="p-weight" label="Weight (kg)">
                    <input id="p-weight" type="number" min="0" step="0.1" className={onboardingInputClass} value={weight} onChange={(e) => setWeight(e.target.value)} />
                  </FormField>
                  <FormField id="p-height" label="Height (cm)">
                    <input id="p-height" type="number" min="0" step="0.1" className={onboardingInputClass} value={height} onChange={(e) => setHeight(e.target.value)} />
                  </FormField>
                </div>
                {bmi !== null && (
                  <p className="text-xs text-on-surface-variant font-manrope">Estimated BMI: <span className="font-bold text-on-surface">{bmi}</span></p>
                )}
              </ProfileSection>

              <ProfileSection title="Location & Insurance">
                <FormField id="p-address" label="Address">
                  <input id="p-address" className={onboardingInputClass} value={address} onChange={(e) => setAddress(e.target.value)} />
                </FormField>
                <div className="grid grid-cols-2 gap-4">
                  <FormField id="p-city" label="City">
                    <input id="p-city" className={onboardingInputClass} value={city} onChange={(e) => setCity(e.target.value)} />
                  </FormField>
                  <FormField id="p-region" label="Region">
                    <input id="p-region" className={onboardingInputClass} value={region} onChange={(e) => setRegion(e.target.value)} />
                  </FormField>
                </div>
                <FormField id="p-philhealth" label="PhilHealth ID">
                  <input id="p-philhealth" inputMode="numeric" placeholder="12-345678901-2" className={onboardingInputClass} value={philhealthId} onChange={(e) => setPhilhealthId(formatPhilHealth(e.target.value))} />
                </FormField>
                <div className="grid grid-cols-2 gap-4">
                  <FormField id="p-hmoProvider" label="HMO Provider">
                    <input id="p-hmoProvider" className={onboardingInputClass} placeholder="Maxicare" value={hmoProvider} onChange={(e) => setHmoProvider(e.target.value)} />
                  </FormField>
                  <FormField id="p-hmoCardNo" label="HMO Card No.">
                    <input id="p-hmoCardNo" placeholder="XXXX-XXXX-XXXX" className={onboardingInputClass} value={hmoCardNo} onChange={(e) => setHmoCardNo(formatHmoCard(e.target.value))} />
                  </FormField>
                </div>
              </ProfileSection>

              <ProfileSection title="Medical History">
                <div className="grid grid-cols-2 gap-4">
                  <FormField id="p-bloodType" label="Blood type">
                    <select id="p-bloodType" className={onboardingInputClass} value={bloodType} onChange={(e) => setBloodType(e.target.value)}>
                      <option value="">Select…</option>
                      {BLOOD_TYPES.map((bt) => <option key={bt} value={bt}>{bt}</option>)}
                    </select>
                  </FormField>
                  <FormField id="p-smoking" label="Smoking status">
                    <select id="p-smoking" className={onboardingInputClass} value={smokingStatus} onChange={(e) => setSmokingStatus(e.target.value)}>
                      {SMOKING_OPTIONS.map((o) => <option key={o.label} value={o.value}>{o.label}</option>)}
                    </select>
                  </FormField>
                </div>
                <FormField id="p-allergies" label="Allergies" hint="Tap a suggestion or type your own, separated by commas">
                  <div className="flex flex-col gap-2.5">
                    <div className="flex flex-wrap gap-2">
                      {COMMON_ALLERGIES.map((v) => (
                        <Chip key={v} selected={toItems(allergies).includes(v)} onClick={() => toggleChip(v, allergies, setAllergies)}>{v}</Chip>
                      ))}
                    </div>
                    <input id="p-allergies" className={onboardingInputClass} placeholder="Penicillin, Peanuts" value={allergies} onChange={(e) => setAllergies(e.target.value)} />
                  </div>
                </FormField>
                <FormField id="p-conditions" label="Chronic conditions" hint="Tap a suggestion or type your own, separated by commas">
                  <div className="flex flex-col gap-2.5">
                    <div className="flex flex-wrap gap-2">
                      {COMMON_CONDITIONS.map((v) => (
                        <Chip key={v} selected={toItems(chronicConditions).includes(v)} onClick={() => toggleChip(v, chronicConditions, setChronicConditions)}>{v}</Chip>
                      ))}
                    </div>
                    <input id="p-conditions" className={onboardingInputClass} placeholder="Hypertension, Asthma" value={chronicConditions} onChange={(e) => setChronicConditions(e.target.value)} />
                  </div>
                </FormField>
                <FormField id="p-meds" label="Current medications" hint="Tap a suggestion or type your own, separated by commas">
                  <div className="flex flex-col gap-2.5">
                    <div className="flex flex-wrap gap-2">
                      {COMMON_MEDICATIONS.map((v) => (
                        <Chip key={v} selected={toItems(currentMedications).includes(v)} onClick={() => toggleChip(v, currentMedications, setCurrentMedications)}>{v}</Chip>
                      ))}
                    </div>
                    <input id="p-meds" className={onboardingInputClass} placeholder="Amlodipine 5mg, Metformin" value={currentMedications} onChange={(e) => setCurrentMedications(e.target.value)} />
                  </div>
                </FormField>
                <FormField id="p-surgeries" label="Past surgeries">
                  <textarea id="p-surgeries" className={onboardingTextareaClass} placeholder="e.g. Appendectomy (2018)" value={pastSurgeries} onChange={(e) => setPastSurgeries(e.target.value)} />
                </FormField>
                <FormField id="p-family" label="Family history">
                  <textarea id="p-family" className={onboardingTextareaClass} placeholder="e.g. Diabetes (mother)" value={familyHistory} onChange={(e) => setFamilyHistory(e.target.value)} />
                </FormField>
              </ProfileSection>

              <div className="flex justify-end">
                <Button type="submit" disabled={saving} className="min-w-[120px]">
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `cd frontend && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Lint the file**

Run: `cd frontend && npx next lint --file src/app/dashboard/profile/page.tsx`
Expected: No errors (warnings about `<img>` are suppressed via the eslint-disable in `ProfilePhotoField`).

- [ ] **Step 4: Commit**

```bash
git add frontend/src/app/dashboard/profile/page.tsx
git commit -m "feat(profile): patient profile page reaches onboarding field parity"
```

---

## Task 6: Frontend — rebuild the doctor profile page

**Files:**
- Modify (full replace): `frontend/src/app/doctor/profile/page.tsx`

- [ ] **Step 1: Replace the page with the sectioned form**

Overwrite `frontend/src/app/doctor/profile/page.tsx` with:

```tsx
"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { apiRequest } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { CheckCircledIcon } from "@radix-ui/react-icons";
import { FormField } from "@/components/ui/form-field";
import { Chip } from "@/components/ui/chip";
import { ProfileSection } from "@/components/ui/profile-section";
import { ProfilePhotoField } from "@/components/ui/profile-photo-field";
import { useSpecializations } from "@/hooks/use-specializations";
import {
  onboardingInputClass,
  onboardingTextareaClass,
} from "@/lib/onboarding-styles";
import {
  formatPrc,
  formatPtr,
  isValidPrc,
  isValidPtr,
} from "@/lib/format";

interface DoctorProfileData {
  fullName: string;
  professionalTitle: string;
  specialization: string;
  bio: string | null;
  yearsOfExperience: number | null;
  consultationFee: number | null;
  languagesSpoken?: string[] | null;
  consultationFocusAreas: string | null;
  availabilitySummary: string | null;
  profilePictureUrl: string | null;
  prcLicenseNo: string | null;
  prcLicenseExpiry: string | null;
  ptrNo: string | null;
  region: string | null;
  city: string | null;
}

const COMMON_LANGUAGES = ["English", "Tagalog", "Cebuano", "Ilocano"];

const toItems = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);

export default function DoctorProfilePage() {
  const { data: session } = useSession();
  const token = session?.user?.accessToken;
  const { specializations, loading: specsLoading } = useSpecializations();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [fullName, setFullName] = useState("");
  const [professionalTitle, setProfessionalTitle] = useState("");
  const [profilePictureUrl, setProfilePictureUrl] = useState<string | null>(null);

  const [prcLicenseNo, setPrcLicenseNo] = useState("");
  const [prcLicenseExpiry, setPrcLicenseExpiry] = useState("");
  const [ptrNo, setPtrNo] = useState("");
  const [region, setRegion] = useState("");
  const [city, setCity] = useState("");

  const [specialization, setSpecialization] = useState("");
  const [yearsOfExperience, setYearsOfExperience] = useState("");
  const [languagesSpoken, setLanguagesSpoken] = useState("");
  const [bio, setBio] = useState("");
  const [consultationFocusAreas, setConsultationFocusAreas] = useState("");
  const [consultationFee, setConsultationFee] = useState("");
  const [availabilitySummary, setAvailabilitySummary] = useState("");

  useEffect(() => {
    if (!token) return;
    apiRequest<DoctorProfileData>("/doctors/profile", { token })
      .then((d) => {
        setFullName(d.fullName ?? "");
        setProfessionalTitle(d.professionalTitle ?? "");
        setProfilePictureUrl(d.profilePictureUrl ?? null);
        setPrcLicenseNo(d.prcLicenseNo ?? "");
        setPrcLicenseExpiry(d.prcLicenseExpiry ? d.prcLicenseExpiry.split("T")[0] : "");
        setPtrNo(d.ptrNo ?? "");
        setRegion(d.region ?? "");
        setCity(d.city ?? "");
        setSpecialization(d.specialization ?? "");
        setYearsOfExperience(d.yearsOfExperience != null ? String(d.yearsOfExperience) : "");
        setLanguagesSpoken(d.languagesSpoken?.join(", ") ?? "");
        setBio(d.bio ?? "");
        setConsultationFocusAreas(d.consultationFocusAreas ?? "");
        setConsultationFee(d.consultationFee != null ? String(d.consultationFee) : "");
        setAvailabilitySummary(d.availabilitySummary ?? "");
      })
      .catch(() => setError("Failed to load profile."))
      .finally(() => setLoading(false));
  }, [token]);

  // Keep an already-saved specialization selectable even if not in the fetched list.
  const specOptions =
    specialization && !specializations.includes(specialization)
      ? [specialization, ...specializations]
      : specializations;
  const specFetchFailed = !specsLoading && specializations.length === 0;

  const toggleLanguage = (value: string) => {
    const items = toItems(languagesSpoken);
    const next = items.includes(value)
      ? items.filter((i) => i !== value)
      : [...items, value];
    setLanguagesSpoken(next.join(", "));
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;

    if (prcLicenseNo && !isValidPrc(prcLicenseNo)) {
      setError("PRC license number must be 7 digits, or leave it blank.");
      return;
    }
    if (ptrNo && !isValidPtr(ptrNo)) {
      setError("PTR number must be 7–8 digits, or leave it blank.");
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      await apiRequest("/doctors/profile", {
        method: "PATCH",
        token,
        body: {
          fullName: fullName.trim() || undefined,
          professionalTitle: professionalTitle.trim() || undefined,
          profilePictureUrl: profilePictureUrl || undefined,
          prcLicenseNo: prcLicenseNo.trim() || undefined,
          prcLicenseExpiry: prcLicenseExpiry || undefined,
          ptrNo: ptrNo.trim() || undefined,
          region: region.trim() || undefined,
          city: city.trim() || undefined,
          specialization: specialization.trim() || undefined,
          yearsOfExperience: yearsOfExperience ? Number(yearsOfExperience) : undefined,
          languagesSpoken: languagesSpoken.trim()
            ? languagesSpoken.split(",").map((s) => s.trim()).filter(Boolean)
            : [],
          bio: bio.trim() || undefined,
          consultationFocusAreas: consultationFocusAreas.trim() || undefined,
          consultationFee: consultationFee ? Number(consultationFee) : undefined,
          availabilitySummary: availabilitySummary.trim() || undefined,
        },
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch {
      setError("Failed to save profile. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <DashboardLayout role="doctor">
      <div className="max-w-2xl animate-in fade-in duration-500">
        <div className="mb-8">
          <h1 className="text-3xl font-bold font-serif text-text-primary mb-2">My Profile</h1>
          <p className="text-on-surface-variant">Update your professional information visible to patients.</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Spinner size="lg" /></div>
        ) : (
          <div className="bg-surface-white rounded-xl shadow-soft border border-outline-variant/30 p-6">
            {success && (
              <div className="mb-6 flex items-center gap-2 text-sm text-success bg-success/10 px-4 py-3 rounded-lg border border-success/20">
                <CheckCircledIcon className="w-4 h-4 shrink-0" />
                Profile updated successfully.
              </div>
            )}
            {error && (
              <div className="mb-6 text-sm text-error bg-red-50 px-4 py-3 rounded-lg border border-red-100">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-8">
              <ProfileSection title="Personal">
                <ProfilePhotoField value={profilePictureUrl} onChange={setProfilePictureUrl} />
                <div className="grid grid-cols-2 gap-4">
                  <FormField id="d-fullName" label="Full name">
                    <input id="d-fullName" className={onboardingInputClass} value={fullName} onChange={(e) => setFullName(e.target.value)} />
                  </FormField>
                  <FormField id="d-title" label="Professional title">
                    <input id="d-title" className={onboardingInputClass} placeholder="MD, FPCP" value={professionalTitle} onChange={(e) => setProfessionalTitle(e.target.value)} />
                  </FormField>
                </div>
              </ProfileSection>

              <ProfileSection title="Credentials">
                <FormField id="d-prc" label="PRC License Number">
                  <input id="d-prc" inputMode="numeric" placeholder="0123456" className={onboardingInputClass} value={prcLicenseNo} onChange={(e) => setPrcLicenseNo(formatPrc(e.target.value))} />
                </FormField>
                <FormField id="d-prcExpiry" label="PRC License Expiry">
                  <input id="d-prcExpiry" type="date" className={onboardingInputClass} value={prcLicenseExpiry} onChange={(e) => setPrcLicenseExpiry(e.target.value)} />
                </FormField>
                <FormField id="d-ptr" label="PTR Number">
                  <input id="d-ptr" inputMode="numeric" placeholder="12345678" className={onboardingInputClass} value={ptrNo} onChange={(e) => setPtrNo(formatPtr(e.target.value))} />
                </FormField>
                <div className="grid grid-cols-2 gap-4">
                  <FormField id="d-region" label="Region">
                    <input id="d-region" className={onboardingInputClass} placeholder="NCR" value={region} onChange={(e) => setRegion(e.target.value)} />
                  </FormField>
                  <FormField id="d-city" label="City">
                    <input id="d-city" className={onboardingInputClass} placeholder="Makati" value={city} onChange={(e) => setCity(e.target.value)} />
                  </FormField>
                </div>
              </ProfileSection>

              <ProfileSection title="Practice">
                <FormField id="d-spec" label="Primary Specialization">
                  {specFetchFailed ? (
                    <input id="d-spec" className={onboardingInputClass} placeholder="e.g. Cardiology" value={specialization} onChange={(e) => setSpecialization(e.target.value)} />
                  ) : (
                    <select id="d-spec" className={onboardingInputClass} value={specialization} onChange={(e) => setSpecialization(e.target.value)}>
                      <option value="" disabled>{specsLoading ? "Loading…" : "Select your specialization"}</option>
                      {specOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  )}
                </FormField>
                <div className="grid grid-cols-2 gap-4">
                  <FormField id="d-years" label="Years of Experience">
                    <input id="d-years" type="number" min="0" className={onboardingInputClass} value={yearsOfExperience} onChange={(e) => setYearsOfExperience(e.target.value)} />
                  </FormField>
                  <FormField id="d-fee" label="Consultation Fee (₱)">
                    <input id="d-fee" type="number" min="0" step="50" className={onboardingInputClass} value={consultationFee} onChange={(e) => setConsultationFee(e.target.value)} />
                  </FormField>
                </div>
                <FormField id="d-langs" label="Languages Spoken" hint="Tap a suggestion or type your own, separated by commas">
                  <div className="flex flex-col gap-2.5">
                    <div className="flex flex-wrap gap-2">
                      {COMMON_LANGUAGES.map((v) => (
                        <Chip key={v} selected={toItems(languagesSpoken).includes(v)} onClick={() => toggleLanguage(v)}>{v}</Chip>
                      ))}
                    </div>
                    <input id="d-langs" className={onboardingInputClass} placeholder="English, Tagalog" value={languagesSpoken} onChange={(e) => setLanguagesSpoken(e.target.value)} />
                  </div>
                </FormField>
                <FormField id="d-bio" label="Professional Bio">
                  <textarea id="d-bio" className={`${onboardingTextareaClass} min-h-[120px]`} placeholder="Tell patients about your background and approach to care..." value={bio} onChange={(e) => setBio(e.target.value)} />
                </FormField>
                <FormField id="d-focus" label="Focus Areas (comma-separated)">
                  <textarea id="d-focus" className={onboardingTextareaClass} placeholder="Hypertension management, Preventive cardiology..." value={consultationFocusAreas} onChange={(e) => setConsultationFocusAreas(e.target.value)} />
                </FormField>
                <FormField id="d-avail" label="Availability Summary">
                  <input id="d-avail" className={onboardingInputClass} placeholder="Weekdays 9 AM - 5 PM" value={availabilitySummary} onChange={(e) => setAvailabilitySummary(e.target.value)} />
                </FormField>
              </ProfileSection>

              <div className="flex justify-end">
                <Button type="submit" disabled={saving} className="min-w-[120px]">
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `cd frontend && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Lint the file**

Run: `cd frontend && npx next lint --file src/app/doctor/profile/page.tsx`
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/app/doctor/profile/page.tsx
git commit -m "feat(profile): doctor profile page reaches onboarding field parity"
```

---

## Task 7: Full verification

**Files:** none (verification only)

- [ ] **Step 1: Backend test suite**

Run: `cd backend && npm test`
Expected: PASS — all suites green (no regressions; new patient/doctor tests pass).

- [ ] **Step 2: Frontend production build**

Run: `cd frontend && npm run build`
Expected: Build succeeds, 0 TypeScript errors, both `/dashboard/profile` and `/doctor/profile` routes compiled.

- [ ] **Step 3: Commit (only if any lockfile/build artifact changes are expected — otherwise skip)**

No commit expected here; this task is verification only.

---

## Self-Review Notes

- **Spec coverage:** Patient fields (location/insurance/structured medical/photo/phone) → Task 5; doctor fields (credentials/location/specialization dropdown/photo) → Task 6; patient GET include → Task 1; doctor junction sync → Task 2; shared units → Task 4; type → Task 3. All spec sections covered.
- **No DTO/schema changes** — confirmed both PATCH DTOs already accept every field.
- **Breaking-test guard:** Task 1 rewrites the `findByUserId` assertion (now expects `include`); Task 2 rewrites the `update` assertion (now runs in `$transaction` + junction sync). Both handled in-task.
- **Type consistency:** `PatientProfile.medicalHistoryRecord` (Task 3) is consumed in Task 5 load; `DoctorProfileData` extended inline in Task 6; `ProfilePhotoField({ value, onChange })` + `ProfileSection({ title, children })` signatures (Task 4) match call sites in Tasks 5–6.
- **Legacy `medicalHistory`** free-text field intentionally dropped from the patient page; DB column untouched (out of scope).
