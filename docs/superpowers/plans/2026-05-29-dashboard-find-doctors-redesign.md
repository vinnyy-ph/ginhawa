# Dashboard Find Doctors Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the broken 3-column grid of wide horizontal cards on `/dashboard/find-doctors` with a new compact vertical card in a 2-column grid, plus an inner-dashboard header polish.

**Architecture:** Add a new `DoctorCardCompact` component (dashboard-only) so the shared `DoctorCard` and public `/doctors` page stay untouched. Edit only the dashboard page to swap the card, restyle the header into a light panel, and rework the grid + skeleton.

**Tech Stack:** Next.js (App Router), React, TypeScript, Tailwind CSS, Radix icons. Existing `useDoctorDiscovery` hook and `DoctorProfile`/`AvailabilitySlot` types.

**Testing note:** The frontend has no unit-test harness (no jest/vitest/testing-library, zero test files). Per project CLAUDE.md (simplicity, surgical changes, YAGNI), this plan verifies via `npm run build` (0 TS errors) and manual browser check rather than introducing a test framework.

---

### Task 1: Create DoctorCardCompact component

**Files:**
- Create: `frontend/src/components/doctors/DoctorCardCompact.tsx`

- [ ] **Step 1: Write the component**

Create `frontend/src/components/doctors/DoctorCardCompact.tsx` with exactly this content:

```tsx
import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { DoctorProfile, AvailabilitySlot } from "@/types/api";

interface DoctorCardCompactProps {
  doctor: DoctorProfile;
}

export function DoctorCardCompact({ doctor }: DoctorCardCompactProps) {
  const initials = doctor.fullName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const focusAreas = doctor.consultationFocusAreas
    ? doctor.consultationFocusAreas.split(",").map((s) => s.trim()).filter(Boolean)
    : [];

  // Availability status (ported from DoctorCard)
  let availabilityStatus = "Fully Booked";
  let badgeColor =
    "bg-surface-container text-on-surface-variant border-outline-variant";

  const now = new Date();
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  if (doctor.availabilitySlots && doctor.availabilitySlots.length > 0) {
    const availableSlots = doctor.availabilitySlots.filter(
      (slot: AvailabilitySlot) =>
        slot.status === "AVAILABLE" && new Date(slot.startTime) > now
    );

    if (availableSlots.length > 0) {
      const hasToday = availableSlots.some(
        (slot) => new Date(slot.startTime) <= todayEnd
      );
      if (hasToday) {
        availabilityStatus = "Available Today";
        badgeColor = "bg-primary/10 text-primary border-primary/20";
      } else {
        availabilityStatus = "Available Soon";
        badgeColor =
          "bg-secondary-container/30 text-on-secondary-container border-secondary-container/50";
      }
    }
  }

  return (
    <div className="bg-surface-white rounded-3xl border border-outline-variant/30 shadow-sm hover:shadow-md transition-all duration-300 p-6 flex flex-col h-full group">
      {/* Header: avatar + name + availability badge */}
      <div className="flex items-start gap-4">
        {doctor.profilePictureUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={doctor.profilePictureUrl}
            alt={`Profile photo of ${doctor.fullName}`}
            className="w-14 h-14 rounded-full object-cover ring-2 ring-surface-container-low shrink-0"
          />
        ) : (
          <div
            className="w-14 h-14 rounded-full bg-gradient-to-br from-primary-container to-primary flex items-center justify-center ring-2 ring-surface-container-low shrink-0"
            aria-label={`Avatar for ${doctor.fullName}`}
          >
            <span className="text-white font-bold text-lg font-serif">
              {initials}
            </span>
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-bold text-lg text-text-primary leading-tight font-serif tracking-tight truncate group-hover:text-primary transition-colors">
              {doctor.professionalTitle
                ? `${doctor.professionalTitle} ${doctor.fullName}`
                : doctor.fullName}
            </h3>
            <span
              className={cn(
                "px-2.5 py-1 text-[10px] font-bold tracking-wide uppercase rounded-full border whitespace-nowrap shrink-0",
                badgeColor
              )}
            >
              {availabilityStatus}
            </span>
          </div>
          <span className="text-primary font-semibold uppercase tracking-widest text-[11px] block mt-1 truncate">
            {doctor.specialization}
          </span>
        </div>
      </div>

      {/* Bio */}
      {doctor.bio && (
        <p className="mt-4 text-on-surface-variant text-sm leading-relaxed line-clamp-2">
          {doctor.bio}
        </p>
      )}

      {/* Focus areas */}
      {focusAreas.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {focusAreas.slice(0, 2).map((area, idx) => (
            <span
              key={idx}
              className="bg-surface-container-lowest text-on-surface-variant text-xs px-2.5 py-1 rounded-md border border-outline-variant/40 font-medium"
            >
              {area}
            </span>
          ))}
          {focusAreas.length > 2 && (
            <span className="bg-surface-container-low text-on-surface-variant text-xs px-2.5 py-1 rounded-md font-medium">
              +{focusAreas.length - 2} more
            </span>
          )}
        </div>
      )}

      {/* Meta + action, pinned to bottom */}
      <div className="mt-auto pt-5">
        <div className="flex items-center gap-6 pt-4 border-t border-outline-variant/20 mb-4">
          {doctor.yearsOfExperience !== undefined &&
            doctor.yearsOfExperience !== null && (
              <div className="flex flex-col">
                <span className="text-on-surface-variant font-semibold uppercase tracking-wider text-[10px]">
                  Experience
                </span>
                <span className="text-text-primary font-bold mt-0.5 text-sm">
                  {doctor.yearsOfExperience}+ yrs
                </span>
              </div>
            )}

          {doctor.consultationFee !== undefined &&
            doctor.consultationFee !== null && (
              <div className="flex flex-col">
                <span className="text-on-surface-variant font-semibold uppercase tracking-wider text-[10px]">
                  Fee
                </span>
                <span className="text-primary font-bold mt-0.5 font-mono text-sm">
                  ₱{doctor.consultationFee.toLocaleString()}
                </span>
              </div>
            )}
        </div>

        <Link
          href={`/doctors/${doctor.id}`}
          aria-label={`Book appointment with ${doctor.fullName}`}
        >
          <Button className="w-full rounded-2xl py-6 font-semibold bg-primary hover:bg-primary/90 text-white shadow-soft">
            Book Appointment
          </Button>
        </Link>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck the new file compiles**

Run: `cd frontend && npx tsc --noEmit`
Expected: No new errors referencing `DoctorCardCompact.tsx`. (Pre-existing errors elsewhere, if any, are unrelated — confirm none mention this file.)

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/doctors/DoctorCardCompact.tsx
git commit -m "feat(dashboard): add DoctorCardCompact for find-doctors"
```

---

### Task 2: Swap card, polish header, rework grid in the dashboard page

**Files:**
- Modify: `frontend/src/app/dashboard/find-doctors/page.tsx`

- [ ] **Step 1: Replace the full file content**

Overwrite `frontend/src/app/dashboard/find-doctors/page.tsx` with exactly this content (changes: import `DoctorCardCompact` instead of `DoctorCard`; compact vertical `SkeletonCard`; search + filter/sort wrapped in a light panel; results/loading grids are `grid-cols-1 lg:grid-cols-2 gap-5`; renders `DoctorCardCompact`; `EmptyState`/`ErrorState`/active-filter block unchanged):

```tsx
"use client";

import React from "react";
import {
  MagnifyingGlassIcon,
  PersonIcon,
  ResetIcon,
} from "@radix-ui/react-icons";
import { Button } from "@/components/ui/button";
import { DashboardLayout } from "@/components/layout/dashboard-layout";

import { DoctorCardCompact } from "@/components/doctors/DoctorCardCompact";
import { DoctorFilters } from "@/components/doctors/DoctorFilters";
import { DoctorSort } from "@/components/doctors/DoctorSort";
import { useDoctorDiscovery } from "@/components/doctors/use-doctor-discovery";

// ─── Skeleton Card ────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="animate-pulse bg-surface-white rounded-3xl border border-outline-variant/30 shadow-sm p-6 flex flex-col h-full">
      <div className="flex items-start gap-4">
        <div className="w-14 h-14 rounded-full bg-surface-container shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-surface-container rounded w-3/4" />
          <div className="h-3 bg-surface-container rounded w-1/2" />
        </div>
      </div>
      <div className="mt-4 space-y-2">
        <div className="h-3 bg-surface-container rounded" />
        <div className="h-3 bg-surface-container rounded w-5/6" />
      </div>
      <div className="mt-auto pt-5">
        <div className="pt-4 border-t border-outline-variant/20 flex gap-6 mb-4">
          <div className="h-8 w-16 bg-surface-container rounded" />
          <div className="h-8 w-16 bg-surface-container rounded" />
        </div>
        <div className="h-12 bg-surface-container rounded-2xl w-full" />
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
        We couldn&apos;t find any doctors matching your search or filters. Try a
        different keyword or clear your filters.
      </p>
      <Button variant="outline" onClick={onClearFilters} className="gap-2 border-primary text-primary hover:bg-primary/5">
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

export default function DashboardFindDoctorsPage() {
  const {
    filteredDoctors,
    loading,
    error,
    fetchDoctors,
    searchTerm,
    setSearchTerm,
    filters,
    setFilters,
    sort,
    setSort,
    availableSpecializations,
    availableLanguages,
    clearFilters,
  } = useDoctorDiscovery();

  return (
    <DashboardLayout role="patient">
      {/* ── Page Heading ──────────────────────────────────────────────────── */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-text-primary">Find a Doctor</h1>
        <p className="text-on-surface-variant text-base mt-2 max-w-2xl">
          Search and book consultations with top medical professionals — from
          the comfort of your home.
        </p>
      </div>

      {/* ── Search + Filter Panel ─────────────────────────────────────────── */}
      <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 p-4 mb-6 space-y-4">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
            <MagnifyingGlassIcon
              className="w-5 h-5 text-on-surface-variant"
              aria-hidden="true"
            />
          </div>
          <input
            id="dashboard-doctor-search"
            type="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name, specialization, or keyword…"
            className="w-full pl-11 pr-4 py-3.5 rounded-xl border border-outline-variant bg-surface-white text-on-surface placeholder:text-on-surface-variant/60 text-sm shadow-soft focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition-all"
            aria-label="Search doctors"
          />
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <DoctorFilters
              filters={filters}
              onFiltersChange={setFilters}
              availableSpecializations={availableSpecializations}
              availableLanguages={availableLanguages}
            />

            {/* Live Summary */}
            {!loading && (
              <span className="text-sm text-on-surface-variant">
                Showing <strong className="text-text-primary">{filteredDoctors.length}</strong> result{filteredDoctors.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>

          <div className="flex items-center">
            <DoctorSort value={sort} onChange={setSort} />
          </div>
        </div>
      </div>

      {/* ── Active filter indicator ──────────────────────────────────────── */}
      {(searchTerm || Object.values(filters).some(v => Array.isArray(v) ? v.length > 0 : v !== "" && v !== "any")) && !loading && (
        <div className="flex flex-wrap items-center gap-2 mb-6 text-sm">
          <span className="text-on-surface-variant font-medium">Active filters:</span>
          {searchTerm && (
            <span className="bg-surface-container-low px-3 py-1 rounded-full border border-outline-variant/30 text-xs text-text-primary font-medium">
              Search: &quot;{searchTerm}&quot;
            </span>
          )}
          <button
            onClick={clearFilters}
            className="text-primary hover:underline font-medium text-xs focus:outline-none focus:ring-2 focus:ring-primary/40 rounded px-1"
          >
            Clear all
          </button>
        </div>
      )}

      {/* ── Grid / States ────────────────────────────────────────────────── */}
      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={fetchDoctors} />
      ) : filteredDoctors.length === 0 ? (
        <EmptyState onClearFilters={clearFilters} />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {filteredDoctors.map((doctor) => (
            <DoctorCardCompact key={doctor.id} doctor={doctor} />
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
```

- [ ] **Step 2: Verify the build**

Run: `cd frontend && npm run build`
Expected: Build succeeds, 0 TypeScript errors. The `find-doctors` route compiles.

- [ ] **Step 3: Manual browser check**

Run `npm run dev`, log in as a patient, open `/dashboard/find-doctors`. Confirm:
- Cards are compact and vertical, 2 per row on desktop, 1 on mobile, equal height.
- Each card shows avatar, name + title, specialization, availability badge, fee, Experience, and a full-width "Book Appointment" button that links to `/doctors/{id}`.
- Search, filters, sort, and result count work inside the panel.
- Loading shows the compact skeleton grid; empty/error states still render.

- [ ] **Step 4: Confirm public page untouched**

Open `/doctors` (public). Confirm it still renders the original wide stacked cards exactly as before (no visual change).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/dashboard/find-doctors/page.tsx
git commit -m "feat(dashboard): redesign find-doctors with compact 2-col card grid"
```

---

## Self-Review

**Spec coverage:**
- New `DoctorCardCompact` (dashboard-only), shared `DoctorCard` untouched → Task 1 + Task 2 Step 4. ✓
- Compact card anatomy (avatar/name/badge/specialization/bio/chips/meta/button) → Task 1 Step 1. ✓
- Header polish (light panel, no hero), 2-col grid, compact skeleton, reused empty/error → Task 2 Step 1. ✓
- No data/state changes → uses `useDoctorDiscovery`, no hook edits. ✓
- Success criteria (2-col equal-height, inner-page header, public page unchanged, build passes) → Task 2 Steps 2–4. ✓

**Placeholder scan:** No TBD/TODO; all code blocks complete. ✓

**Type consistency:** `DoctorCardCompact` prop is `{ doctor: DoctorProfile }`; page renders `<DoctorCardCompact key={doctor.id} doctor={doctor} />` — matches. Fields used (`fullName`, `professionalTitle`, `specialization`, `profilePictureUrl`, `bio`, `consultationFocusAreas`, `languagesSpoken` not used, `yearsOfExperience`, `consultationFee`, `availabilitySlots`, `id`) are the same ones the existing `DoctorCard` reads from `DoctorProfile`. ✓
