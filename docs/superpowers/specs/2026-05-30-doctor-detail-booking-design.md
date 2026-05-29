# Doctor Detail Page + Calendar Booking — Design

Date: 2026-05-30
Branch: features/improvements

## Problem

1. The individual doctor detail page (`/doctors/[id]`) does not surface several
   fields that now exist in `schema.prisma`: location (city/region), verification
   status, PRC license number, multiple specializations, and individual patient
   reviews. The public API also leaks sensitive fields.
2. Booking uses a flat grid of pill buttons (one per slot, each showing full
   date + time). It is hard to scan. We want a calendar picker: pick an
   available day, then pick a time, then book — all inline.

## Decisions (confirmed)

- **Slot display:** Available only. Days with zero open future slots are
  disabled in the calendar. Booked/blocked slots are not shown.
- **Credentials on public profile:** "Verified" badge (`isVerified`) + PRC
  license number (`prcLicenseNo`). Hide `ptrNo` and `prcLicenseExpiry`.
- **Reviews:** Show an individual review list on the profile, keeping the
  average-rating summary at the top.
- **Calendar tech:** `react-aria-components` `Calendar` (already a dependency)
  inline, plus a custom time-list. No new dependency. `@internationalized/date`
  for date values. No react-day-picker.

## Current State (verified)

- `GET /doctors/:id` → `DoctorsService.findById` includes only
  `availabilitySlots`; controller wraps result with `toPublicDoctorProfile` +
  `avgRating`/`reviewCount`.
- `toPublicDoctorProfile` only omits `userId`, `createdAt`, `updatedAt` — so it
  currently leaks `ptrNo`, `prcLicenseExpiry`, `isActive`, `verifiedAt`.
- `GET /doctors/:id/slots` → `SlotsService.findAllByDoctorProfileId` returns ALL
  slots (every status), ordered by `startTime`. Frontend `use-doctor-detail`
  filters to `AVAILABLE` + future.
- Reviews: `ReviewsController` is class-guarded (`JwtAuthGuard`, `RolesGuard`);
  `ReviewsService` has only `create`. No public list endpoint exists.
- Both guards honor `@Public()` via `IS_PUBLIC_KEY` reflector check at
  handler + class level, so a `@Public()` method on the guarded controller
  bypasses auth. (Confirmed in `jwt-auth.guard.ts` and `roles.guard.ts`.)
- Frontend `DoctorProfile` type (`types/api.ts`) is missing city, region,
  isVerified, prcLicenseNo, specializations.
- Calendar styling tokens already exist in `components/ui/calendar.tsx`
  (`data-[disabled]`, `data-[selected]`, etc.) and can be mirrored.

## Changes

### Backend

1. **`reviews.service.ts`** — add `findByDoctor(doctorId: string)`:
   ```ts
   return this.prisma.review.findMany({
     where: { doctorId, isVisible: true },
     orderBy: { createdAt: 'desc' },
     select: {
       id: true,
       rating: true,
       comment: true,
       createdAt: true,
       patient: { select: { fullName: true, profilePictureUrl: true } },
     },
   });
   ```

2. **`reviews.controller.ts`** — add public list route:
   ```ts
   @Public()
   @Get('doctor/:doctorId')
   findByDoctor(@Param('doctorId') doctorId: string) {
     return this.reviewsService.findByDoctor(doctorId);
   }
   ```
   Add the needed imports (`Get`, `Param`, `Public`).

3. **`doctors.service.ts` `findById`** — add specializations to the include:
   ```ts
   include: {
     availabilitySlots: true,
     specializations: { include: { specialization: true } },
   },
   ```

4. **`public-doctor.dto.ts`** — strip sensitive fields, carry specializations:
   - Extend the `Omit` to also drop `ptrNo`, `prcLicenseExpiry`, `isActive`,
     `verifiedAt`.
   - Add an optional `specializations` field to `PublicDoctorProfile`
     (`{ isPrimary: boolean; specialization: { id: string; name: string } }[]`)
     and destructure the sensitive keys out in `toPublicDoctorProfile` while
     passing `specializations` through.
   - Keep `prcLicenseNo`, `isVerified`, `city`, `region`.

### Frontend

5. **`types/api.ts`** — extend `DoctorProfile` with: `city?`, `region?`,
   `isVerified?`, `prcLicenseNo?`,
   `specializations?: { isPrimary: boolean; specialization: { id: string; name: string } }[]`.
   Add a `DoctorReview` interface:
   ```ts
   export interface DoctorReview {
     id: string;
     rating: number;
     comment?: string | null;
     createdAt: string;
     patient: { fullName: string; profilePictureUrl?: string | null };
   }
   ```

6. **`use-doctor-detail.ts`** — also fetch `GET /reviews/doctor/:id` in the
   existing `Promise.all`; return `reviews: DoctorReview[]` alongside
   doctor/slots/loading/error. Keep the existing AVAILABLE+future slot filter.

7. **Doctor page hero (`doctors/[id]/page.tsx`)** — add a "Verified" badge pill
   when `doctor.isVerified`, and a location line (`city · region`) when present.
   Fee / years / specialization pills stay.

8. **`DoctorAbout.tsx`** — restructure into ordered sections:
   About → Specializations (chips from `specializations`, primary marked) →
   Focus Areas (existing) → Languages (existing) → Credentials & Location
   (PRC No. + Verified, city/region) → Patient Reviews (keep `StarRating`
   summary, then list each review: avatar/initials, name, stars, comment,
   relative date via `formatRelativeTime`). Empty-state when no reviews.
   `DoctorAbout` takes `reviews` as a prop.

9. **New `components/booking/booking-calendar.tsx`** — inline RAC `Calendar`:
   - Props: `slots: AvailabilitySlot[]`, `selectedDateKey: string | null`,
     `onSelectDate(dateKey: string)`.
   - Build a `Set<string>` of available PH date keys (`YYYY-MM-DD`) from slots,
     using an `en-CA` `Intl.DateTimeFormat` pinned to `Asia/Manila` (matches
     `CalendarDate.toString()` format).
   - `minValue = today('Asia/Manila')`; `isDateUnavailable = (d) => !set.has(d.toString())`.
   - Controlled `value` from `selectedDateKey` (parse via `parseDate`).
   - Mirror styling/tokens from `components/ui/calendar.tsx`.

10. **`doctor-booking-panel.tsx`** — rewrite flow:
    - Group filtered AVAILABLE slots by PH date key.
    - Render `BookingCalendar`; on day select, show that day's available times as
      buttons (`formatPHTime`). Selecting a time sets `selectedSlot`.
    - Then show reason textarea + Confirm. Reuse existing POST `/appointments`
      (`{ slotId, reasonForVisit }`), success toast, and redirect to
      `/appointments`. Keep the min-5-char reason validation.

11. **Delete `components/booking/slot-picker.tsx`** — obsolete after the rewrite
    (only consumer was `doctor-booking-panel.tsx`).

## Out of Scope

- No DB migration (all fields already exist in `schema.prisma`).
- No change to slot status filtering (booked/blocked stay hidden).
- No reschedule-dialog change.

## Success Criteria

- Doctor detail page shows: verified badge (when verified), location,
  specializations, focus areas, languages, PRC license no., and an individual
  review list with the average summary.
- Public API for `GET /doctors/:id` no longer returns `ptrNo`,
  `prcLicenseExpiry`, `isActive`, `verifiedAt`.
- `GET /reviews/doctor/:id` returns visible reviews publicly.
- Booking: a calendar with non-available days disabled; selecting an available
  day reveals that day's open times; selecting a time + entering a reason books
  the appointment and redirects.
- Backend `npm test` and frontend `npm run build` pass; `npm run lint` clean for
  touched files.
