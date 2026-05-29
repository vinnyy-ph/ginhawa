# Dashboard Doctor Detail Page

**Date:** 2026-05-29
**Scope:** Add an in-dashboard doctor detail page for logged-in patients, and extract the shared logic it overlaps with the public detail page.

## Problem

Logged-in patients and anonymous visitors both land on the public `/doctors/[id]` page, which renders under the public layout (with login/signup header) and a marketing gradient hero. A logged-in patient should view doctor details inside their dashboard shell — sidebar nav, no public auth header — not on the public marketing page.

## Goal

A new patient dashboard route `/dashboard/find-doctors/[id]` that shows the doctor's profile and lets the patient book, styled to match the dashboard's inner pages (consistent with the find-doctors redesign — no gradient hero). The booking flow and data fetching are extracted into shared units used by both the new page and the refactored public page, so there is one booking codepath.

## Architecture

Extract three shared units, then build the new page and refactor the public page to consume them.

### Shared units (new files)

**1. `frontend/src/components/doctors/use-doctor-detail.ts`**
- Export `useDoctorDetail(id: string)`.
- Fetches doctor + slots in parallel via `apiRequest`:
  - `apiRequest<DoctorProfile>(\`/doctors/${id}\`)`
  - `apiRequest<AvailabilitySlot[]>(\`/doctors/${id}/slots\`)`
- Filters slots to `status === "AVAILABLE" && startTime > now`, sorted ascending by `startTime` (ported verbatim from the current public page).
- Returns `{ doctor, slots, loading, error }` where `doctor: DoctorProfile | null`, `slots: AvailabilitySlot[]`, `loading: boolean`, `error: string | null`.
- Error message on failure: `"Failed to load doctor profile. They may not exist or are unavailable."`

**2. `frontend/src/components/doctors/DoctorAbout.tsx`**
- Export `DoctorAbout({ doctor }: { doctor: DoctorProfile })`.
- Renders the left-column content currently inline in the public page:
  - **About** section: `doctor.bio` split on `\n` into paragraphs, or an italic "No biography information provided." when absent.
  - **Focus Areas** section (only if `doctor.consultationFocusAreas`): comma-split chips.
  - **Languages** section (only if `doctor.languagesSpoken?.length`): joined with ", ".
- Pure presentational, no state.

**3. `frontend/src/components/booking/doctor-booking-panel.tsx`**
- Export `DoctorBookingPanel({ doctor, slots }: { doctor: DoctorProfile; slots: AvailabilitySlot[] })`.
- Owns the patient booking flow (ported from the public page's patient branch):
  - State: `selectedSlot`, `reason`, `isBooking`, `bookingSuccess`, `bookingError`.
  - Renders `SlotPicker` (slots/selectedSlot/onSelectSlot), and when a slot is selected, the reason `<textarea>` (required, `minLength={5}`) + "Confirm Booking" button (disabled while booking or reason < 5 chars).
  - `handleBookAppointment`: `POST /appointments` with `token: session?.user?.accessToken`, body `{ slotId, reasonForVisit }`; on success sets `bookingSuccess`, then `setTimeout(() => router.push("/dashboard/appointments"), 1500)`.
  - Renders the fixed success toast ("Appointment booked! Redirecting…") itself, so both pages get it.
- Uses `useSession` (token) and `useRouter` (redirect) internally.
- Does NOT render the surrounding sticky card or the "Book Appointment" title bar — that chrome stays in each page, so each page controls auth branching and card styling.

### Pages

**New: `frontend/src/app/dashboard/find-doctors/[id]/page.tsx`**
- `"use client"`, resolves `params: Promise<{ id: string }>` via `use()`.
- Wrapped in `<DashboardLayout role="patient">`.
- Calls `useDoctorDetail(id)`.
- Loading → dashboard-styled skeleton (header card + 2-col body placeholders). Error/`!doctor` → dashboard-styled error card with a "Back to Find Doctors" link to `/dashboard/find-doctors`.
- On success:
  - Back link → `/dashboard/find-doctors`.
  - **Header card** (inner-dashboard style, `bg-surface-white rounded-3xl border border-outline-variant/30 shadow-sm p-6`): avatar (image or gradient-initials fallback), name with `professionalTitle`, specialization, and stat chips for experience (`{years}+ yrs`) and fee (`₱{fee}`) when present.
  - **Body** `grid grid-cols-1 lg:grid-cols-3 gap-8`: `DoctorAbout` in `lg:col-span-2`; right `lg:col-span-1` a sticky card (`sticky top-24`) with a "Book Appointment" title bar + `<DoctorBookingPanel doctor={doctor} slots={slots} />`. Patient-only — no unauth/doctor branches.

**Refactor: `frontend/src/app/doctors/[id]/page.tsx`**
- Keep the gradient hero, public back-link (`/doctors`), public skeleton, and error chrome unchanged.
- Replace the inline fetch/state effect with `useDoctorDetail(id)`.
- Replace the inline About/Focus/Languages markup with `<DoctorAbout doctor={doctor} />`.
- Keep the auth branching in the booking card: unauthenticated → "Sign In to Book" link; doctor → "switch to patient" notice; patient → `<DoctorBookingPanel doctor={doctor} slots={slots} />` (replacing the inline `SlotPicker` + form). Remove the now-unused booking state/handler from this file.
- No behavior change for any of the three states.

### Routing change

- `frontend/src/components/doctors/DoctorCardCompact.tsx`: change the Book link `href` from `/doctors/${doctor.id}` to `/dashboard/find-doctors/${doctor.id}`. (This component is dashboard-only; the public list uses `DoctorCard`, which keeps `/doctors/${id}`.)

## Data / Types

No backend or type changes. Uses existing `apiRequest`, `DoctorProfile`, `AvailabilitySlot` from `@/types/api`, and `SlotPicker`.

## Out of Scope

- Booking API, `SlotPicker` internals, public layout/header, onboarding files (another agent active there).
- Doctor-role and anonymous experiences on the public page (preserved as-is).

## Success Criteria

- `/dashboard/find-doctors/[id]` renders inside the dashboard shell (sidebar, no public header), inner-style header (no gradient hero), and a working booking flow that redirects to `/dashboard/appointments`.
- `DoctorCardCompact` navigates to the dashboard detail page.
- Public `/doctors/[id]` still renders all three states (anonymous / doctor / patient) with identical behavior, now backed by the shared units.
- One booking codepath (`DoctorBookingPanel`) and one fetch codepath (`useDoctorDetail`) shared by both pages.
- `npm run build` passes, 0 TypeScript errors.
