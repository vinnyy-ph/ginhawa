# Doctors Discovery & Profile Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Full visual redesign of `/doctors` (listing) and `/doctors/[id]` (profile + booking) using the Ginhawa design system, wrapped in a shared navigation layout, with all backend wiring and booking logic preserved.

**Architecture:** A new `layout.tsx` in `app/doctors/` provides the `<Header>` / `<Footer>` shell for both pages automatically. The two page files are fully replaced with redesigned versions that keep all existing state, fetch, filter, and booking logic intact — only markup and styles change. The main site header gets one new nav link.

**Tech Stack:** Next.js 16 App Router, `"use client"` pages, next-auth session, Tailwind CSS (Ginhawa tokens), Radix UI icons, existing `apiRequest`, `SlotPicker`, `Badge`, `Button` components.

---

## File Map

| File | Action |
|---|---|
| `frontend/src/app/doctors/layout.tsx` | **Create** — shared Header + Footer shell |
| `frontend/src/components/layout/header.tsx` | **Modify** — add "Find a Doctor" nav link |
| `frontend/src/app/doctors/page.tsx` | **Replace** — listing page full redesign |
| `frontend/src/app/doctors/[id]/page.tsx` | **Replace** — profile + booking page full redesign |

---

## Task 1: Create the shared doctors layout

**Files:**
- Create: `frontend/src/app/doctors/layout.tsx`

- [ ] **Step 1: Create the layout file**

```tsx
// frontend/src/app/doctors/layout.tsx
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";

export default function DoctorsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Header />
      <main>{children}</main>
      <Footer />
    </>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/doctors/layout.tsx
git commit -m "feat(doctors): add shared layout with Header and Footer"
```

---

## Task 2: Add "Find a Doctor" to the site header

**Files:**
- Modify: `frontend/src/components/layout/header.tsx`

Current nav (lines 17–29):
```tsx
<nav className="hidden md:flex items-center gap-6">
  <Link
    href="#features"
    className="text-sm font-medium text-on-surface-variant hover:text-primary transition-colors"
  >
    Features
  </Link>
  <Link
    href="/for-doctors"
    className="text-sm font-medium text-on-surface-variant hover:text-primary transition-colors"
  >
    For Doctors
  </Link>
</nav>
```

- [ ] **Step 1: Add the "Find a Doctor" link between "Features" and "For Doctors"**

Replace the `<nav>` block with:
```tsx
<nav className="hidden md:flex items-center gap-6">
  <Link
    href="#features"
    className="text-sm font-medium text-on-surface-variant hover:text-primary transition-colors"
  >
    Features
  </Link>
  <Link
    href="/doctors"
    className="text-sm font-medium text-on-surface-variant hover:text-primary transition-colors"
  >
    Find a Doctor
  </Link>
  <Link
    href="/for-doctors"
    className="text-sm font-medium text-on-surface-variant hover:text-primary transition-colors"
  >
    For Doctors
  </Link>
</nav>
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/layout/header.tsx
git commit -m "feat(header): add Find a Doctor nav link"
```

---

## Task 3: Rewrite the doctors listing page

**Files:**
- Replace: `frontend/src/app/doctors/page.tsx`

Fully replaces the file. All fetch/filter/session logic is preserved verbatim. Only the JSX markup and class names change.

- [ ] **Step 1: Replace `frontend/src/app/doctors/page.tsx` with the redesigned version**

```tsx
"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { apiRequest } from "@/lib/api-client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  MagnifyingGlassIcon,
  PersonIcon,
  ResetIcon,
} from "@radix-ui/react-icons";
import { cn } from "@/lib/utils";
import type { DoctorProfile } from "@/types/api";

// ─── Skeleton Card ────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="animate-pulse bg-surface-white rounded-xl shadow-soft overflow-hidden">
      <div className="h-1.5 bg-gradient-to-r from-[#48cab6]/30 to-[#31a795]/30" />
      <div className="p-5 space-y-3">
        <div className="flex gap-3 items-center">
          <div className="w-14 h-14 rounded-full bg-surface-container shrink-0" />
          <div className="space-y-2 flex-1">
            <div className="h-4 bg-surface-container rounded w-3/4" />
            <div className="h-3 bg-surface-container rounded w-1/2" />
          </div>
        </div>
        <div className="h-5 bg-surface-container rounded-full w-1/3" />
        <div className="h-3 bg-surface-container rounded" />
        <div className="h-3 bg-surface-container rounded w-5/6" />
        <div className="flex justify-between pt-2 border-t border-surface-container">
          <div className="h-3 bg-surface-container rounded w-1/3" />
          <div className="h-3 bg-surface-container rounded w-1/4" />
        </div>
        <div className="h-9 bg-surface-container rounded-lg w-full" />
      </div>
    </div>
  );
}

// ─── Doctor Card ──────────────────────────────────────────────────────────────

function DoctorCard({
  doctor,
  isPatient,
}: {
  doctor: DoctorProfile;
  isPatient: boolean;
}) {
  const initials = doctor.fullName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="bg-surface-white rounded-xl shadow-soft overflow-hidden flex flex-col hover:-translate-y-0.5 hover:shadow-lifted transition-all duration-200 border border-transparent hover:border-primary/10 group">
      <div className="h-1.5 bg-gradient-to-r from-[#48cab6] to-[#31a795]" />
      <div className="p-5 flex flex-col flex-1">
        <div className="flex gap-4 items-start mb-3">
          <div className="shrink-0">
            {doctor.profilePictureUrl ? (
              <img
                src={doctor.profilePictureUrl}
                alt={`Profile photo of ${doctor.fullName}`}
                className="w-14 h-14 rounded-full object-cover ring-2 ring-primary/20"
              />
            ) : (
              <div
                className="w-14 h-14 rounded-full bg-gradient-to-br from-[#48cab6] to-[#31a795] flex items-center justify-center ring-2 ring-primary/10"
                aria-label={`Avatar for ${doctor.fullName}`}
              >
                <span className="text-white font-bold text-lg">{initials}</span>
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-base text-text-primary leading-tight group-hover:text-primary transition-colors truncate">
              {doctor.professionalTitle
                ? `${doctor.professionalTitle} ${doctor.fullName}`
                : doctor.fullName}
            </h3>
            <p className="text-sm text-on-surface-variant mt-0.5 truncate">
              {doctor.professionalTitle || "General Practitioner"}
            </p>
          </div>
        </div>

        <div className="mb-3">
          <Badge
            variant="outline"
            className="text-xs border-primary/40 text-primary font-medium"
          >
            {doctor.specialization}
          </Badge>
        </div>

        {(doctor.yearsOfExperience || doctor.consultationFee != null) && (
          <div className="flex items-center gap-4 mb-3 text-xs text-on-surface-variant">
            {doctor.yearsOfExperience && (
              <span>
                <span className="font-bold text-text-primary">
                  {doctor.yearsOfExperience}+
                </span>{" "}
                yrs exp
              </span>
            )}
            {doctor.consultationFee != null && (
              <span className="ml-auto">
                <span className="font-bold text-primary">
                  ₱{doctor.consultationFee.toLocaleString()}
                </span>{" "}
                / session
              </span>
            )}
          </div>
        )}

        <p className="text-sm text-on-surface-variant line-clamp-2 flex-1 mb-4">
          {doctor.bio || "No biography available for this doctor."}
        </p>

        <Link
          href={`/doctors/${doctor.id}`}
          className="block mt-auto"
          aria-label={`${isPatient ? "Book appointment with" : "View profile of"} ${doctor.fullName}`}
        >
          <Button className="w-full" variant={isPatient ? "default" : "outline"}>
            {isPatient ? "Book Now" : "View Profile"}
          </Button>
        </Link>
      </div>
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({ onClearFilters }: { onClearFilters: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-20 h-20 rounded-full bg-surface-container flex items-center justify-center mb-5">
        <PersonIcon className="w-10 h-10 text-on-surface-variant/50" />
      </div>
      <h3 className="font-bold text-xl text-text-primary mb-2">No doctors found</h3>
      <p className="text-on-surface-variant text-sm max-w-xs mb-6">
        We couldn't find any doctors matching your search or filter. Try a
        different keyword or specialization.
      </p>
      <Button variant="outline" onClick={onClearFilters} className="gap-2">
        <ResetIcon className="w-4 h-4" />
        Clear Filters
      </Button>
    </div>
  );
}

// ─── Error State ──────────────────────────────────────────────────────────────

function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center mb-5">
        <svg
          className="w-10 h-10 text-red-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
          />
        </svg>
      </div>
      <h3 className="font-bold text-xl text-text-primary mb-2">
        Something went wrong
      </h3>
      <p className="text-on-surface-variant text-sm max-w-xs mb-6">{message}</p>
      <Button onClick={onRetry}>Try Again</Button>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DoctorsDiscoveryPage() {
  const { data: session } = useSession();
  const isPatient = session?.user?.role === "PATIENT";
  const searchParams = useSearchParams();

  const [doctors, setDoctors] = useState<DoctorProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSpecialization, setSelectedSpecialization] = useState(
    () => searchParams.get("specialization") ?? ""
  );

  async function fetchDoctors() {
    try {
      setLoading(true);
      setError(null);
      const data = await apiRequest<DoctorProfile[]>("/doctors");
      setDoctors(data);
    } catch (err: any) {
      setError(err.message || "Failed to load doctors. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchDoctors();
  }, []);

  const specializations = useMemo(() => {
    const specs = new Set(doctors.map((d) => d.specialization));
    return Array.from(specs).filter(Boolean).sort();
  }, [doctors]);

  const filteredDoctors = useMemo(() => {
    return doctors.filter((doctor) => {
      const term = searchTerm.toLowerCase();
      const matchesSearch =
        doctor.fullName.toLowerCase().includes(term) ||
        doctor.specialization.toLowerCase().includes(term) ||
        (doctor.bio?.toLowerCase().includes(term) ?? false);
      const matchesSpec =
        !selectedSpecialization ||
        doctor.specialization === selectedSpecialization;
      return matchesSearch && matchesSpec;
    });
  }, [doctors, searchTerm, selectedSpecialization]);

  function clearFilters() {
    setSearchTerm("");
    setSelectedSpecialization("");
  }

  return (
    <div className="min-h-screen bg-surface">
      {/* ── Gradient Hero ───────────────────────────────────────────────── */}
      <div className="bg-gradient-to-br from-[#006b5e] via-[#31a795] to-[#48cab6]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 mb-3">
                <div className="h-px w-8 bg-white/40" />
                <span className="text-xs font-semibold text-white/70 uppercase tracking-widest">
                  Ginhawa Telehealth
                </span>
              </div>
              <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight">
                Find a Doctor
              </h1>
              <p className="mt-2 text-white/75 text-lg">
                Search and book consultations with top medical professionals —
                from the comfort of your home.
              </p>
            </div>
            {!loading && !error && doctors.length > 0 && (
              <div className="shrink-0 text-right">
                <p className="text-white/70 text-sm">
                  <span className="font-bold text-white text-2xl">
                    {doctors.length}
                  </span>{" "}
                  doctors available
                </p>
              </div>
            )}
          </div>

          {/* Search bar inside hero */}
          <div className="relative mt-8">
            <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
              <MagnifyingGlassIcon
                className="w-5 h-5 text-on-surface-variant"
                aria-hidden="true"
              />
            </div>
            <input
              id="doctor-search"
              type="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, specialization, or keyword…"
              className="w-full pl-11 pr-4 py-3.5 rounded-xl border-0 bg-white text-on-surface placeholder:text-on-surface-variant/60 text-sm shadow-lg focus:outline-none focus:ring-2 focus:ring-white/60"
              aria-label="Search doctors"
            />
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ── Specialization Filter Pills ────────────────────────────────── */}
        {!loading && specializations.length > 0 && (
          <div
            className="bg-surface-white rounded-xl shadow-soft p-4 mb-8 flex flex-wrap gap-2"
            role="group"
            aria-label="Filter by specialization"
          >
            <button
              onClick={() => setSelectedSpecialization("")}
              aria-pressed={selectedSpecialization === ""}
              className={cn(
                "px-4 py-1.5 rounded-full text-xs font-semibold border transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-primary/40",
                selectedSpecialization === ""
                  ? "bg-primary text-white border-primary shadow-sm"
                  : "bg-transparent text-on-surface-variant border-outline-variant hover:border-primary/50 hover:text-primary"
              )}
            >
              All
            </button>
            {specializations.map((spec) => (
              <button
                key={spec}
                onClick={() =>
                  setSelectedSpecialization(
                    spec === selectedSpecialization ? "" : spec
                  )
                }
                aria-pressed={selectedSpecialization === spec}
                className={cn(
                  "px-4 py-1.5 rounded-full text-xs font-semibold border transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-primary/40",
                  selectedSpecialization === spec
                    ? "bg-primary text-white border-primary shadow-sm"
                    : "bg-transparent text-on-surface-variant border-outline-variant hover:border-primary/50 hover:text-primary"
                )}
              >
                {spec}
              </button>
            ))}
          </div>
        )}

        {/* ── Active filter indicator ────────────────────────────────────── */}
        {(searchTerm || selectedSpecialization) && !loading && (
          <div className="flex items-center gap-2 mb-5 text-sm text-on-surface-variant">
            <span>
              Showing{" "}
              <strong className="text-text-primary">
                {filteredDoctors.length}
              </strong>{" "}
              result{filteredDoctors.length !== 1 ? "s" : ""}
            </span>
            <button
              onClick={clearFilters}
              className="text-primary hover:underline font-medium ml-1 focus:outline-none focus:ring-2 focus:ring-primary/40 rounded"
            >
              Clear all
            </button>
          </div>
        )}

        {/* ── Grid / States ──────────────────────────────────────────────── */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : error ? (
          <ErrorState message={error} onRetry={fetchDoctors} />
        ) : filteredDoctors.length === 0 ? (
          <EmptyState onClearFilters={clearFilters} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDoctors.map((doctor) => (
              <DoctorCard key={doctor.id} doctor={doctor} isPatient={isPatient} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/doctors/page.tsx
git commit -m "feat(doctors): redesign listing page with gradient hero and refined cards"
```

---

## Task 4: Rewrite the doctor profile page

**Files:**
- Replace: `frontend/src/app/doctors/[id]/page.tsx`

All fetch, slot filtering, booking POST, and redirect logic preserved. Only markup and styles change. Adds "Languages" section in the left column. Hero becomes the teal gradient with glass pill badges.

- [ ] **Step 1: Replace `frontend/src/app/doctors/[id]/page.tsx` with the redesigned version**

```tsx
"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { apiRequest } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import {
  ArrowLeftIcon,
  CalendarIcon,
  CheckCircledIcon,
  ExclamationTriangleIcon,
} from "@radix-ui/react-icons";
import { SlotPicker } from "@/components/booking/slot-picker";
import type { DoctorProfile, AvailabilitySlot } from "@/types/api";

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function PageSkeleton() {
  return (
    <div className="min-h-screen bg-surface">
      <div className="bg-gradient-to-br from-[#006b5e] via-[#31a795] to-[#48cab6] py-10">
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

export default function DoctorProfilePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const { data: session } = useSession();
  const isPatient = session?.user?.role === "PATIENT";
  const isDoctor = session?.user?.role === "DOCTOR";
  const isAuthenticated = !!session;

  const [doctor, setDoctor] = useState<DoctorProfile | null>(null);
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedSlot, setSelectedSlot] = useState<AvailabilitySlot | null>(null);
  const [reason, setReason] = useState("");
  const [isBooking, setIsBooking] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);

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
          .filter(
            (s) => s.status === "AVAILABLE" && new Date(s.startTime) > now
          )
          .sort(
            (a, b) =>
              new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
          );
        setSlots(availableSlots);
      } catch (err: any) {
        setError(
          "Failed to load doctor profile. They may not exist or are unavailable."
        );
      } finally {
        setLoading(false);
      }
    }
    if (id) fetchDoctorAndSlots();
  }, [id]);

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
    } catch (err: any) {
      setBookingError(
        err.message || "Failed to book appointment. Please try again."
      );
    } finally {
      setIsBooking(false);
    }
  }

  if (loading) return <PageSkeleton />;

  if (error || !doctor) {
    return (
      <div className="min-h-screen bg-surface">
        <div className="bg-gradient-to-br from-[#006b5e] via-[#31a795] to-[#48cab6] py-10">
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
      {/* ── Success Toast ────────────────────────────────────────────────── */}
      {bookingSuccess && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-top-4 fade-in duration-300">
          <div className="bg-[#31a795] text-white px-6 py-3 rounded-xl shadow-lifted flex items-center gap-3">
            <CheckCircledIcon className="w-5 h-5" />
            <span className="font-medium">
              Appointment booked! Redirecting…
            </span>
          </div>
        </div>
      )}

      {/* ── Gradient Hero ────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-br from-[#006b5e] via-[#31a795] to-[#48cab6]">
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
                {doctor.professionalTitle
                  ? `${doctor.professionalTitle} `
                  : ""}
                {doctor.fullName}
              </h1>
              <p className="text-white/75 text-base mb-4">
                {doctor.professionalTitle || "General Practitioner"}
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
          {/* Left: About + details */}
          <div className="lg:col-span-2 space-y-10">
            <section>
              <h2 className="text-2xl font-bold text-text-primary mb-4">
                About
              </h2>
              <div className="text-on-surface-variant leading-relaxed space-y-4">
                {doctor.bio ? (
                  doctor.bio
                    .split("\n")
                    .map((p, i) => <p key={i}>{p}</p>)
                ) : (
                  <p className="italic">
                    No biography information provided.
                  </p>
                )}
              </div>
            </section>

            {doctor.consultationFocusAreas && (
              <section>
                <h3 className="text-xl font-bold text-text-primary mb-3">
                  Focus Areas
                </h3>
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

            {doctor.languagesSpoken && (
              <section>
                <h3 className="text-xl font-bold text-text-primary mb-3">
                  Languages
                </h3>
                <p className="text-on-surface-variant">
                  {doctor.languagesSpoken}
                </p>
              </section>
            )}
          </div>

          {/* Right: Booking panel */}
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
                  <>
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
                        <form
                          onSubmit={handleBookAppointment}
                          className="space-y-4"
                        >
                          <div>
                            <label
                              htmlFor="reason"
                              className="block text-sm font-semibold text-text-primary mb-1"
                            >
                              Reason for Visit{" "}
                              <span className="text-error">*</span>
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
                          {bookingError && (
                            <p className="text-xs text-error">{bookingError}</p>
                          )}
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

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/doctors/[id]/page.tsx
git commit -m "feat(doctors): redesign profile page with gradient hero and languages section"
```

---

## Task 5: Visual verification in the browser

**Files:** None — verification only.

- [ ] **Step 1: Start the backend**

```bash
cd backend && npm run start:dev
```

Expected: NestJS running on `http://localhost:3001`

- [ ] **Step 2: Start the frontend**

```bash
cd frontend && npm run dev
```

Expected: Next.js running on `http://localhost:3000`

- [ ] **Step 3: Check the listing page (unauthenticated)**

Open `http://localhost:3000/doctors` in an incognito window (no session).

Verify:
- Ginhawa `<Header>` appears at the top with "Find a Doctor" nav link
- Gradient teal hero with "Find a Doctor" headline and search bar
- Doctor cards load from the database with accent bars, avatars, badges, fee/exp stats
- Filter pills appear (derived from loaded doctors)
- Cards show "View Profile" CTA (not "Book Now") for unauthenticated users
- `<Footer>` appears at the bottom

- [ ] **Step 4: Check search and filter**

- Type a doctor name or specialty into the search bar → results filter instantly
- Click a specialization pill → grid narrows to that specialty
- Click "All" → full grid restores
- Clear all search text + pill → full grid restores

- [ ] **Step 5: Check the doctor profile page (unauthenticated)**

Click any doctor card → `/doctors/:id`

Verify:
- Gradient hero with doctor name, specialty/exp/fee glass pills, "Back to Doctors" link
- About section with bio paragraphs
- Focus Areas chips (if present in seeded data)
- Languages section (if present)
- Booking panel shows "Sign In to Book" button

- [ ] **Step 6: Check the doctor profile page (authenticated patient)**

Log in as a patient account, navigate to any `/doctors/:id`.

Verify:
- Booking panel shows `SlotPicker` with available slots
- Selecting a slot reveals the reason textarea
- Submitting with a reason ≥ 5 chars shows "Confirming…" then success toast → redirects to `/dashboard/appointments`

- [ ] **Step 7: Final commit (if any cleanup needed)**

```bash
git add -p  # stage only intentional changes
git commit -m "fix(doctors): visual verification cleanup"
```
