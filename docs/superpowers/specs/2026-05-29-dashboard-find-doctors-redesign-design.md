# Dashboard Find Doctors Redesign

**Date:** 2026-05-29
**Scope:** Patient dashboard only (`/dashboard/find-doctors`). Public `/doctors` page and onboarding flows are out of scope and must not be modified.

## Problem

`/dashboard/find-doctors` renders the shared `DoctorCard` (a wide horizontal card: 32px avatar left, bio + scattered 3-column meta + large button right) inside a `grid lg:grid-cols-3` layout. The wide cards are crushed into narrow columns, producing a broken "columns and rows" look. The public `/doctors` page renders the same card in a single stacked `flex flex-col` column, which looks correct — confirming the dashboard grid is the fault.

## Goal

A compact, dashboard-appropriate layout: purpose-built vertical cards in a 2-column grid, with a polished inner-page header (no hero banner). Reuse all existing data and state logic.

## Approach

Add a new `DoctorCardCompact` component for the dashboard instead of editing the shared `DoctorCard`. This keeps the public `/doctors` page and any other consumers untouched.

### Files

- **New:** `frontend/src/components/doctors/DoctorCardCompact.tsx`
- **Edit:** `frontend/src/app/dashboard/find-doctors/page.tsx` (grid wrapper, card swap, header polish, skeleton)
- **Untouched:** `DoctorCard.tsx`, `/doctors/page.tsx`, onboarding files

## Component: DoctorCardCompact

Props: `{ doctor: DoctorProfile }` (always patient context → always "Book Appointment"; no `isPatient` prop needed).

Structure — vertical, equal-height (`flex flex-col h-full`), `bg-surface-white rounded-3xl border border-outline-variant/30 shadow-sm hover:shadow-md transition`:

1. **Header row:** avatar (56px, `rounded-full`, image or gradient initials fallback) on the left; name + professional title beside it; availability badge top-right.
2. **Specialization:** primary color, uppercase, tracking-wide, ~11px.
3. **Bio:** `line-clamp-2`, muted, omitted if absent.
4. **Focus chips:** parsed from `consultationFocusAreas` (comma-separated), max 2 shown + `+N` overflow chip; omitted if none.
5. **Divider** (`border-t border-outline-variant/20`).
6. **Meta row:** Experience (`{yearsOfExperience}+ yrs`) and Consultation Fee (`₱{fee}`, emphasized in primary). Each omitted if its value is null/undefined.
7. **Action:** full-width primary `Button`, "Book Appointment", wrapped in `Link href={/doctors/${doctor.id}}`, pinned to bottom via `mt-auto`.

Availability badge logic is ported from the existing `DoctorCard` (Available Today / Available Soon / Fully Booked, computed from `availabilitySlots`).

Languages are intentionally dropped from the card to reduce clutter; they remain searchable and filterable.

## Page changes (`find-doctors/page.tsx`)

- Keep `h1 "Find a Doctor"` + subtitle.
- Wrap the search bar and the filter/sort/result-count row in a light panel (`bg-surface-container-lowest rounded-2xl border border-outline-variant/30 p-4`), inner-dashboard styling — no hero/gradient banner.
- Replace the results grid: `grid grid-cols-1 lg:grid-cols-2 gap-5`, cards stretch to equal height.
- Render `DoctorCardCompact` instead of `DoctorCard`.
- Rewrite `SkeletonCard` to match the compact vertical card shape; render 4 in the same 2-col grid.
- Reuse `EmptyState` and `ErrorState` unchanged.
- Keep the existing active-filter indicator block.

## Data / State

No changes. Continues to use `useDoctorDiscovery` and the `DoctorProfile` / `AvailabilitySlot` types from `@/types/api`.

## Out of Scope

- Shared `DoctorCard` and public `/doctors` page.
- Onboarding files (another agent is active there).
- Filter/sort logic, search behavior, backend, data shape.

## Success Criteria

- Dashboard find-doctors shows compact vertical cards, 2 per row on `lg`, 1 on mobile, equal height.
- Header reads as a dashboard inner page (no hero).
- Public `/doctors` page renders identically to before.
- `npm run build` passes, 0 TypeScript errors.
