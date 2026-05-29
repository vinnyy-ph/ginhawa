# Dashboard Doctor Detail Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an in-dashboard doctor detail + booking page for logged-in patients at `/dashboard/find-doctors/[id]`, extracting the data-fetch and patient-booking logic into shared units reused by the refactored public `/doctors/[id]` page.

**Architecture:** Create three shared units — `useDoctorDetail` hook, `DoctorAbout` presentational component, `DoctorBookingPanel` (patient booking flow). Build the new dashboard page (inner-dashboard style, no gradient hero, wrapped in DashboardLayout) on top of them, then refactor the public page to consume the same units while keeping its gradient hero and anonymous/doctor/patient branching.

**Tech Stack:** Next.js App Router, React, TypeScript, Tailwind, Radix icons, next-auth, existing `apiRequest`, `SlotPicker`, `DoctorProfile`/`AvailabilitySlot` types.

**Testing note:** The frontend has no unit-test harness (no jest/vitest/testing-library, zero test files). Per project CLAUDE.md (simplicity, surgical changes, YAGNI), this plan verifies via `npx tsc --noEmit` per unit and `npm run build` (0 TS errors) for the pages, plus a manual browser check — no test framework is introduced.

**Note on `DoctorBookingPanel` props:** The design spec listed props `{ doctor, slots }`, but `doctor` is never read inside the panel (booking uses `selectedSlot.id` only). To avoid an unused prop, the panel takes `{ slots }` only. Both pages render `<DoctorBookingPanel slots={slots} />`.

**Commit hygiene:** The working tree contains UNRELATED uncommitted changes from another agent (onboarding files). Every commit must `git add` only the exact files listed — NEVER `git add -A` / `git add .`. Do not switch branches.

---

### Task 1: useDoctorDetail hook

**Files:**
- Create: `frontend/src/components/doctors/use-doctor-detail.ts`

- [ ] **Step 1: Write the hook**

Create `frontend/src/components/doctors/use-doctor-detail.ts` with exactly:

```tsx
import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api-client";
import type { DoctorProfile, AvailabilitySlot } from "@/types/api";

export function useDoctorDetail(id: string) {
  const [doctor, setDoctor] = useState<DoctorProfile | null>(null);
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDoctorAndSlots() {
      try {
        setLoading(true);
        setError(null);
        const [doctorData, slotsData] = await Promise.all([
          apiRequest<DoctorProfile>(`/doctors/${id}`),
          apiRequest<AvailabilitySlot[]>(`/doctors/${id}/slots`),
        ]);
        setDoctor(doctorData);
        const now = new Date();
        const availableSlots = slotsData
          .filter((s) => s.status === "AVAILABLE" && new Date(s.startTime) > now)
          .sort(
            (a, b) =>
              new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
          );
        setSlots(availableSlots);
      } catch {
        setError(
          "Failed to load doctor profile. They may not exist or are unavailable."
        );
      } finally {
        setLoading(false);
      }
    }
    if (id) fetchDoctorAndSlots();
  }, [id]);

  return { doctor, slots, loading, error };
}
```

- [ ] **Step 2: Typecheck**

Run: `cd frontend && npx tsc --noEmit`
Expected: No errors mentioning `use-doctor-detail.ts`.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/doctors/use-doctor-detail.ts
git commit -m "feat(doctors): add useDoctorDetail hook"
```

---

### Task 2: DoctorAbout component

**Files:**
- Create: `frontend/src/components/doctors/DoctorAbout.tsx`

- [ ] **Step 1: Write the component**

Create `frontend/src/components/doctors/DoctorAbout.tsx` with exactly:

```tsx
import React from "react";
import type { DoctorProfile } from "@/types/api";

export function DoctorAbout({ doctor }: { doctor: DoctorProfile }) {
  return (
    <div className="space-y-10">
      <section>
        <h2 className="text-2xl font-bold text-text-primary mb-4">About</h2>
        <div className="text-on-surface-variant leading-relaxed space-y-4">
          {doctor.bio ? (
            doctor.bio.split("\n").map((p, i) => <p key={i}>{p}</p>)
          ) : (
            <p className="italic">No biography information provided.</p>
          )}
        </div>
      </section>

      {doctor.consultationFocusAreas && (
        <section>
          <h3 className="text-xl font-bold text-text-primary mb-3">Focus Areas</h3>
          <div className="flex flex-wrap gap-2">
            {doctor.consultationFocusAreas.split(",").map((area, i) => (
              <span
                key={i}
                className="bg-surface-container px-3 py-1.5 rounded-md text-sm text-on-surface-variant"
              >
                {area.trim()}
              </span>
            ))}
          </div>
        </section>
      )}

      {doctor.languagesSpoken && doctor.languagesSpoken.length > 0 && (
        <section>
          <h3 className="text-xl font-bold text-text-primary mb-3">Languages</h3>
          <p className="text-on-surface-variant">
            {doctor.languagesSpoken.join(", ")}
          </p>
        </section>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `cd frontend && npx tsc --noEmit`
Expected: No errors mentioning `DoctorAbout.tsx`.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/doctors/DoctorAbout.tsx
git commit -m "feat(doctors): add shared DoctorAbout component"
```

---

### Task 3: DoctorBookingPanel component

**Files:**
- Create: `frontend/src/components/booking/doctor-booking-panel.tsx`

- [ ] **Step 1: Write the component**

Create `frontend/src/components/booking/doctor-booking-panel.tsx` with exactly:

```tsx
"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { apiRequest } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { CheckCircledIcon } from "@radix-ui/react-icons";
import { SlotPicker } from "@/components/booking/slot-picker";
import type { AvailabilitySlot } from "@/types/api";

export function DoctorBookingPanel({ slots }: { slots: AvailabilitySlot[] }) {
  const router = useRouter();
  const { data: session } = useSession();

  const [selectedSlot, setSelectedSlot] = useState<AvailabilitySlot | null>(null);
  const [reason, setReason] = useState("");
  const [isBooking, setIsBooking] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);

  async function handleBookAppointment(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedSlot || !reason.trim() || reason.trim().length < 5) return;
    try {
      setIsBooking(true);
      setBookingError(null);
      await apiRequest("/appointments", {
        method: "POST",
        token: session?.user?.accessToken,
        body: { slotId: selectedSlot.id, reasonForVisit: reason.trim() },
      });
      setBookingSuccess(true);
      setTimeout(() => router.push("/dashboard/appointments"), 1500);
    } catch (err: unknown) {
      setBookingError(
        err instanceof Error
          ? err.message
          : "Failed to book appointment. Please try again."
      );
    } finally {
      setIsBooking(false);
    }
  }

  return (
    <>
      {bookingSuccess && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-top-4 fade-in duration-300">
          <div className="bg-[#31a795] text-white px-6 py-3 rounded-xl shadow-lifted flex items-center gap-3">
            <CheckCircledIcon className="w-5 h-5" />
            <span className="font-medium">Appointment booked! Redirecting…</span>
          </div>
        </div>
      )}

      <div className="mb-6">
        <h4 className="text-xs font-semibold text-text-primary mb-3 uppercase tracking-wider">
          Available Slots
        </h4>
        <SlotPicker
          slots={slots}
          selectedSlot={selectedSlot}
          onSelectSlot={setSelectedSlot}
        />
      </div>

      {selectedSlot && (
        <div className="animate-in fade-in slide-in-from-top-4 duration-300">
          <hr className="border-outline-variant/30 my-4" />
          <form onSubmit={handleBookAppointment} className="space-y-4">
            <div>
              <label
                htmlFor="reason"
                className="block text-sm font-semibold text-text-primary mb-1"
              >
                Reason for Visit <span className="text-error">*</span>
              </label>
              <textarea
                id="reason"
                required
                minLength={5}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Briefly describe your symptoms or concern…"
                className="w-full rounded-lg border border-outline-variant px-3 py-2 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary bg-surface min-h-[80px]"
              />
            </div>
            {bookingError && <p className="text-xs text-error">{bookingError}</p>}
            <Button
              type="submit"
              className="w-full"
              disabled={isBooking || reason.trim().length < 5}
            >
              {isBooking ? "Confirming…" : "Confirm Booking"}
            </Button>
          </form>
        </div>
      )}
    </>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `cd frontend && npx tsc --noEmit`
Expected: No errors mentioning `doctor-booking-panel.tsx`.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/booking/doctor-booking-panel.tsx
git commit -m "feat(booking): add shared DoctorBookingPanel"
```

---

### Task 4: New dashboard doctor detail page + card link

**Files:**
- Create: `frontend/src/app/dashboard/find-doctors/[id]/page.tsx`
- Modify: `frontend/src/components/doctors/DoctorCardCompact.tsx` (the Book link href)

- [ ] **Step 1: Create the dashboard detail page**

Create `frontend/src/app/dashboard/find-doctors/[id]/page.tsx` with exactly:

```tsx
"use client";

import React, { use } from "react";
import Link from "next/link";
import {
  ArrowLeftIcon,
  CalendarIcon,
  ExclamationTriangleIcon,
} from "@radix-ui/react-icons";
import { Button } from "@/components/ui/button";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { DoctorAbout } from "@/components/doctors/DoctorAbout";
import { DoctorBookingPanel } from "@/components/booking/doctor-booking-panel";
import { useDoctorDetail } from "@/components/doctors/use-doctor-detail";

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function PageSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-4 w-32 bg-surface-container rounded mb-6" />
      <div className="bg-surface-white rounded-3xl border border-outline-variant/30 shadow-sm p-6 flex items-start gap-5 mb-8">
        <div className="w-24 h-24 rounded-full bg-surface-container shrink-0" />
        <div className="flex-1 space-y-3">
          <div className="h-7 bg-surface-container rounded w-1/2" />
          <div className="h-4 bg-surface-container rounded w-1/3" />
          <div className="flex gap-2">
            <div className="h-6 w-24 bg-surface-container rounded-full" />
            <div className="h-6 w-24 bg-surface-container rounded-full" />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          <div className="h-6 bg-surface-container rounded w-32" />
          <div className="h-4 bg-surface-container rounded w-full" />
          <div className="h-4 bg-surface-container rounded w-5/6" />
        </div>
        <div className="lg:col-span-1">
          <div className="h-64 bg-surface-white rounded-3xl border border-outline-variant/30" />
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardDoctorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { doctor, slots, loading, error } = useDoctorDetail(id);

  return (
    <DashboardLayout role="patient">
      <Link
        href="/dashboard/find-doctors"
        className="inline-flex items-center gap-2 text-sm text-on-surface-variant hover:text-primary transition-colors mb-6"
      >
        <ArrowLeftIcon className="w-4 h-4" />
        Back to Find Doctors
      </Link>

      {loading ? (
        <PageSkeleton />
      ) : error || !doctor ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="bg-surface-white rounded-3xl border border-outline-variant/30 shadow-sm p-8 max-w-md">
            <ExclamationTriangleIcon className="w-12 h-12 text-error mx-auto mb-4" />
            <h2 className="text-xl font-bold text-text-primary mb-2">
              Profile Unavailable
            </h2>
            <p className="text-on-surface-variant mb-6">
              {error || "Doctor not found."}
            </p>
            <Button asChild>
              <Link href="/dashboard/find-doctors">Back to Find Doctors</Link>
            </Button>
          </div>
        </div>
      ) : (
        <>
          {/* Header card */}
          <div className="bg-surface-white rounded-3xl border border-outline-variant/30 shadow-sm p-6 flex flex-col sm:flex-row items-start gap-5 mb-8">
            {doctor.profilePictureUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={doctor.profilePictureUrl}
                alt={`Profile of ${doctor.fullName}`}
                className="w-24 h-24 rounded-full object-cover ring-4 ring-surface-container-low shrink-0"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary-container to-primary flex items-center justify-center ring-4 ring-surface-container-low shrink-0">
                <span className="text-white font-bold text-3xl font-serif">
                  {doctor.fullName
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2)}
                </span>
              </div>
            )}

            <div className="flex-1">
              <h1 className="text-2xl sm:text-3xl font-bold text-text-primary font-serif tracking-tight">
                {doctor.professionalTitle ? `${doctor.professionalTitle} ` : ""}
                {doctor.fullName}
              </h1>
              <p className="text-primary font-semibold uppercase tracking-widest text-xs mt-1">
                {doctor.specialization}
              </p>
              <div className="flex flex-wrap gap-2 mt-4">
                {doctor.yearsOfExperience != null && (
                  <span className="bg-surface-container text-on-surface-variant text-sm px-3 py-1 rounded-full">
                    {doctor.yearsOfExperience}+ yrs experience
                  </span>
                )}
                {doctor.consultationFee != null && (
                  <span className="bg-primary/10 text-primary text-sm px-3 py-1 rounded-full font-semibold">
                    ₱{doctor.consultationFee.toLocaleString()} / session
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <DoctorAbout doctor={doctor} />
            </div>

            <div className="lg:col-span-1">
              <div className="bg-surface-white rounded-3xl shadow-sm border border-outline-variant/30 overflow-hidden sticky top-24">
                <div className="bg-gradient-to-r from-[#48cab6]/10 to-[#31a795]/10 px-6 py-4 border-b border-outline-variant/30">
                  <h3 className="text-lg font-bold text-text-primary flex items-center gap-2">
                    <CalendarIcon className="w-5 h-5 text-primary" />
                    Book Appointment
                  </h3>
                </div>
                <div className="p-6">
                  <DoctorBookingPanel slots={slots} />
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </DashboardLayout>
  );
}
```

- [ ] **Step 2: Point the dashboard card at the new route**

In `frontend/src/components/doctors/DoctorCardCompact.tsx`, change the Book link href.

Find:
```tsx
        <Link
          href={`/doctors/${doctor.id}`}
          aria-label={`Book appointment with ${doctor.fullName}`}
        >
```
Replace with:
```tsx
        <Link
          href={`/dashboard/find-doctors/${doctor.id}`}
          aria-label={`Book appointment with ${doctor.fullName}`}
        >
```

- [ ] **Step 3: Build**

Run: `cd frontend && npm run build`
Expected: Build succeeds, 0 TypeScript errors, route `/dashboard/find-doctors/[id]` compiles.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/app/dashboard/find-doctors/[id]/page.tsx frontend/src/components/doctors/DoctorCardCompact.tsx
git commit -m "feat(dashboard): add in-dashboard doctor detail page"
```

---

### Task 5: Refactor public doctor detail page onto shared units

**Files:**
- Modify: `frontend/src/app/doctors/[id]/page.tsx` (full overwrite)

- [ ] **Step 1: Overwrite the public page**

Overwrite `frontend/src/app/doctors/[id]/page.tsx` with exactly (keeps gradient hero, public skeleton, error chrome, back-link to `/doctors`, and anonymous/doctor/patient branching; replaces inline fetch with `useDoctorDetail`, inline About with `DoctorAbout`, and the patient booking branch with `DoctorBookingPanel`):

```tsx
"use client";

import React, { use } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import {
  ArrowLeftIcon,
  CalendarIcon,
  ExclamationTriangleIcon,
} from "@radix-ui/react-icons";
import { DoctorAbout } from "@/components/doctors/DoctorAbout";
import { DoctorBookingPanel } from "@/components/booking/doctor-booking-panel";
import { useDoctorDetail } from "@/components/doctors/use-doctor-detail";

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function PageSkeleton() {
  return (
    <div className="min-h-screen bg-surface">
      <div className="bg-gradient-to-br from-[#004d43] via-[#31a795] to-[#48cab6] py-10">
        <div className="max-w-5xl mx-auto px-4 animate-pulse">
          <div className="h-4 bg-white/20 w-24 rounded mb-8" />
          <div className="flex gap-6 items-start">
            <div className="w-24 h-24 rounded-full bg-white/20 shrink-0" />
            <div className="space-y-4 flex-1">
              <div className="h-8 bg-white/20 rounded w-1/3" />
              <div className="h-4 bg-white/20 rounded w-1/4" />
              <div className="flex gap-2">
                <div className="h-6 bg-white/20 rounded-full w-20" />
                <div className="h-6 bg-white/20 rounded-full w-24" />
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="max-w-5xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8 animate-pulse">
        <div className="lg:col-span-2 space-y-4">
          <div className="h-6 bg-surface-container rounded w-32 mb-4" />
          <div className="h-4 bg-surface-container rounded w-full" />
          <div className="h-4 bg-surface-container rounded w-5/6" />
          <div className="h-4 bg-surface-container rounded w-4/5" />
        </div>
        <div className="lg:col-span-1">
          <div className="h-64 bg-surface-white rounded-xl shadow-soft" />
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DoctorProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const id = resolvedParams.id;

  const { data: session } = useSession();
  const isDoctor = session?.user?.role === "DOCTOR";
  const isAuthenticated = !!session;

  const { doctor, slots, loading, error } = useDoctorDetail(id);

  if (loading) return <PageSkeleton />;

  if (error || !doctor) {
    return (
      <div className="min-h-screen bg-surface">
        <div className="bg-gradient-to-br from-[#004d43] via-[#31a795] to-[#48cab6] py-10">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <Link
              href="/doctors"
              className="inline-flex items-center gap-2 text-sm text-white/75 hover:text-white transition-colors"
            >
              <ArrowLeftIcon className="w-4 h-4" />
              Back to Doctors
            </Link>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center py-24 px-4">
          <div className="bg-surface-white rounded-xl shadow-soft p-8 text-center max-w-md">
            <ExclamationTriangleIcon className="w-12 h-12 text-error mx-auto mb-4" />
            <h2 className="text-xl font-bold text-text-primary mb-2">
              Profile Unavailable
            </h2>
            <p className="text-on-surface-variant mb-6">
              {error || "Doctor not found."}
            </p>
            <Button asChild>
              <Link href="/doctors">Return to Directory</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const initials = doctor.fullName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="min-h-screen bg-surface pb-12">
      {/* ── Gradient Hero ────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-br from-[#004d43] via-[#31a795] to-[#48cab6]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-10">
          <Link
            href="/doctors"
            className="inline-flex items-center gap-2 text-sm text-white/75 hover:text-white transition-colors mb-8"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            Back to Doctors
          </Link>

          <div className="flex flex-col sm:flex-row gap-6 items-start">
            <div className="shrink-0">
              {doctor.profilePictureUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={doctor.profilePictureUrl}
                  alt={`Profile of ${doctor.fullName}`}
                  className="w-24 h-24 sm:w-28 sm:h-28 rounded-full object-cover ring-4 ring-white/30 shadow-soft"
                />
              ) : (
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-white/20 border-4 border-white/30 flex items-center justify-center">
                  <span className="text-white font-bold text-3xl">
                    {initials}
                  </span>
                </div>
              )}
            </div>

            <div className="flex-1">
              <h1 className="text-3xl sm:text-4xl font-bold text-white mb-1">
                {doctor.professionalTitle ? `${doctor.professionalTitle} ` : ""}
                {doctor.fullName}
              </h1>
              <p className="text-white/75 text-base mb-4">
                {doctor.specialization}
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="bg-white/20 text-white text-sm px-3 py-1 rounded-full font-medium">
                  {doctor.specialization}
                </span>
                {doctor.yearsOfExperience && (
                  <span className="bg-white/20 text-white text-sm px-3 py-1 rounded-full">
                    {doctor.yearsOfExperience}+ yrs experience
                  </span>
                )}
                {doctor.consultationFee != null && (
                  <span className="bg-white/20 text-white text-sm px-3 py-1 rounded-full font-semibold">
                    ₱{doctor.consultationFee.toLocaleString()} / session
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Body ─────────────────────────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <DoctorAbout doctor={doctor} />
          </div>

          <div className="lg:col-span-1">
            <div className="bg-surface-white rounded-xl shadow-soft border border-outline-variant/30 overflow-hidden sticky top-24">
              <div className="bg-gradient-to-r from-[#48cab6]/10 to-[#31a795]/10 px-6 py-4 border-b border-outline-variant/30">
                <h3 className="text-lg font-bold text-text-primary flex items-center gap-2">
                  <CalendarIcon className="w-5 h-5 text-primary" />
                  Book Appointment
                </h3>
              </div>

              <div className="p-6">
                {!isAuthenticated ? (
                  <div className="text-center py-4">
                    <p className="text-on-surface-variant text-sm mb-4">
                      Sign in to a patient account to book an appointment.
                    </p>
                    <Button className="w-full" asChild>
                      <Link href="/login">Sign In to Book</Link>
                    </Button>
                  </div>
                ) : isDoctor ? (
                  <div className="text-center py-4 bg-surface rounded-lg p-4">
                    <p className="text-on-surface-variant text-sm">
                      You are logged in as a doctor. Switch to a patient
                      account to book consultations.
                    </p>
                  </div>
                ) : (
                  <DoctorBookingPanel slots={slots} />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Build**

Run: `cd frontend && npm run build`
Expected: Build succeeds, 0 TypeScript errors. Routes `/doctors/[id]` and `/dashboard/find-doctors/[id]` both compile.

- [ ] **Step 3: Manual browser check**

Run `npm run dev`:
- Logged in as patient: open `/dashboard/find-doctors`, click a doctor → lands on `/dashboard/find-doctors/[id]` inside the dashboard shell (sidebar, NO public login/signup header, no gradient hero). Header card shows avatar/name/specialization/experience/fee. Select a slot, enter reason ≥5 chars, Confirm → success toast → redirect to `/dashboard/appointments`.
- Public `/doctors/[id]` (logged out): gradient hero present, About/Focus/Languages render, booking panel shows "Sign In to Book".
- Public `/doctors/[id]` (logged in as patient): booking flow works (same as dashboard).
- Public `/doctors/[id]` (logged in as doctor): shows the "switch to patient account" notice.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/app/doctors/[id]/page.tsx
git commit -m "refactor(doctors): public detail page uses shared detail units"
```

---

## Self-Review

**Spec coverage:**
- `useDoctorDetail` hook → Task 1. ✓
- `DoctorAbout` → Task 2. ✓
- `DoctorBookingPanel` (patient booking + success toast + redirect) → Task 3. ✓ (props `{ slots }` only — documented deviation, `doctor` unused.)
- New `/dashboard/find-doctors/[id]` page (DashboardLayout, inner header, no hero, 2-col, sticky booking) → Task 4. ✓
- `DoctorCardCompact` link → dashboard route → Task 4 Step 2. ✓
- Public page refactor preserving hero + 3 auth states → Task 5. ✓
- Build passes / both routes compile → Task 4 Step 3, Task 5 Step 2. ✓

**Placeholder scan:** No TBD/TODO; all code blocks complete. ✓

**Type consistency:** `useDoctorDetail(id)` returns `{ doctor, slots, loading, error }` — consumed identically in Tasks 4 & 5. `DoctorBookingPanel` prop is `{ slots: AvailabilitySlot[] }`; both pages render `<DoctorBookingPanel slots={slots} />`. `DoctorAbout` prop `{ doctor: DoctorProfile }`; both pages render `<DoctorAbout doctor={doctor} />`. All field accesses (`fullName`, `professionalTitle`, `specialization`, `profilePictureUrl`, `bio`, `consultationFocusAreas`, `languagesSpoken`, `yearsOfExperience`, `consultationFee`, slot `id`/`status`/`startTime`) match those already used in the existing public page. ✓
