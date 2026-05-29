# Doctor Detail Page + Calendar Booking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Surface all relevant doctor fields on `/doctors/[id]` and replace the pill-button slot picker with an inline calendar + time-list booking flow.

**Architecture:** Backend adds a public reviews-by-doctor endpoint, includes specializations in the doctor lookup, and stops leaking sensitive credential fields. Frontend extends shared types, fetches reviews, enriches the profile page, and swaps the flat slot grid for a `react-aria-components` `Calendar` that disables days with no openings and reveals that day's times.

**Tech Stack:** NestJS + Prisma + Jest (backend); Next.js 16 + React 19 + react-aria-components + @internationalized/date + date-fns (frontend). Frontend has no test runner — verify with `npm run build` and `npm run lint`.

---

## File Structure

**Backend**
- Modify: `backend/src/reviews/reviews.service.ts` — add `findByDoctor`.
- Modify: `backend/src/reviews/reviews.service.spec.ts` — tests for `findByDoctor`.
- Modify: `backend/src/reviews/reviews.controller.ts` — public `GET doctor/:doctorId`.
- Modify: `backend/src/doctors/doctors.service.ts` — include specializations in `findById`.
- Modify: `backend/src/doctors/dto/public-doctor.dto.ts` — strip sensitive fields, carry specializations.
- Create: `backend/src/doctors/dto/public-doctor.dto.spec.ts` — tests for `toPublicDoctorProfile`.

**Frontend**
- Modify: `frontend/src/types/api.ts` — extend `DoctorProfile`, add `DoctorReview`.
- Modify: `frontend/src/components/doctors/use-doctor-detail.ts` — fetch reviews.
- Modify: `frontend/src/app/doctors/[id]/page.tsx` — hero badge + location; pass reviews to `DoctorAbout`.
- Modify: `frontend/src/components/doctors/DoctorAbout.tsx` — restructure + review list.
- Create: `frontend/src/components/booking/booking-calendar.tsx` — inline RAC calendar.
- Modify: `frontend/src/components/booking/doctor-booking-panel.tsx` — calendar + time-list flow.
- Delete: `frontend/src/components/booking/slot-picker.tsx` — obsolete.

**Verification commands**
- Backend tests: `cd backend && npm test`
- Frontend build: `cd frontend && npm run build`
- Frontend lint: `cd frontend && npm run lint`

---

## Task 1: Reviews service — `findByDoctor`

**Files:**
- Modify: `backend/src/reviews/reviews.service.ts`
- Test: `backend/src/reviews/reviews.service.spec.ts`

- [ ] **Step 1: Add a `review.findMany` mock to the test harness**

In `reviews.service.spec.ts`, extend the `prisma` mock type and object so `review` includes `findMany`:

```ts
  let prisma: {
    patientProfile: { findUnique: jest.Mock };
    appointment: { findUnique: jest.Mock };
    review: { findUnique: jest.Mock; create: jest.Mock; findMany: jest.Mock };
  };
```

and in `beforeEach`:

```ts
    prisma = {
      patientProfile: { findUnique: jest.fn() },
      appointment: { findUnique: jest.fn() },
      review: { findUnique: jest.fn(), create: jest.fn(), findMany: jest.fn() },
    };
```

- [ ] **Step 2: Write the failing test**

Add this `describe` block inside the top-level `describe('ReviewsService', …)`, after the `create` block:

```ts
  describe('findByDoctor', () => {
    it('returns visible reviews newest-first with patient name', async () => {
      const rows = [
        {
          id: 'review-1',
          rating: 5,
          comment: 'Great',
          createdAt: new Date('2026-05-20T00:00:00Z'),
          patient: { fullName: 'Juan Dela Cruz', profilePictureUrl: null },
        },
      ];
      prisma.review.findMany.mockResolvedValue(rows);

      const result = await service.findByDoctor('doctor-1');

      expect(result).toBe(rows);
      expect(prisma.review.findMany).toHaveBeenCalledWith({
        where: { doctorId: 'doctor-1', isVisible: true },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          rating: true,
          comment: true,
          createdAt: true,
          patient: { select: { fullName: true, profilePictureUrl: true } },
        },
      });
    });
  });
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd backend && npm test -- reviews.service`
Expected: FAIL — `service.findByDoctor is not a function`.

- [ ] **Step 4: Implement `findByDoctor`**

In `reviews.service.ts`, add this method to the `ReviewsService` class (after `create`):

```ts
  findByDoctor(doctorId: string) {
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
  }
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd backend && npm test -- reviews.service`
Expected: PASS (all ReviewsService tests).

- [ ] **Step 6: Commit**

```bash
git add backend/src/reviews/reviews.service.ts backend/src/reviews/reviews.service.spec.ts
git commit -m "feat(reviews): add findByDoctor service method"
```

---

## Task 2: Reviews controller — public list route

**Files:**
- Modify: `backend/src/reviews/reviews.controller.ts`

- [ ] **Step 1: Add the public route**

Replace the imports and add the method. The full file becomes:

```ts
import { Controller, Post, Get, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';

@Controller('reviews')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post()
  @Roles('PATIENT')
  create(
    @Request() req: { user: { id: string } },
    @Body() createReviewDto: CreateReviewDto,
  ) {
    return this.reviewsService.create(req.user.id, createReviewDto);
  }

  @Public()
  @Get('doctor/:doctorId')
  findByDoctor(@Param('doctorId') doctorId: string) {
    return this.reviewsService.findByDoctor(doctorId);
  }
}
```

Note: both `JwtAuthGuard` and `RolesGuard` honor `@Public()` via the `IS_PUBLIC_KEY` reflector (verified in the guards), so this route is reachable without auth.

- [ ] **Step 2: Verify build + existing tests pass**

Run: `cd backend && npm run build && npm test -- reviews`
Expected: build succeeds; reviews tests PASS.

- [ ] **Step 3: Commit**

```bash
git add backend/src/reviews/reviews.controller.ts
git commit -m "feat(reviews): expose public GET /reviews/doctor/:doctorId"
```

---

## Task 3: Doctors service — include specializations in `findById`

**Files:**
- Modify: `backend/src/doctors/doctors.service.ts:180-192`

- [ ] **Step 1: Add specializations to the include**

In `findById`, change the `findUnique` include from:

```ts
      include: {
        availabilitySlots: true,
      },
```

to:

```ts
      include: {
        availabilitySlots: true,
        specializations: { include: { specialization: true } },
      },
```

- [ ] **Step 2: Verify build + tests**

Run: `cd backend && npm run build && npm test -- doctors`
Expected: build succeeds; doctors tests PASS.

- [ ] **Step 3: Commit**

```bash
git add backend/src/doctors/doctors.service.ts
git commit -m "feat(doctors): include specializations in findById"
```

---

## Task 4: Public DTO — strip sensitive fields, carry specializations

**Files:**
- Modify: `backend/src/doctors/dto/public-doctor.dto.ts`
- Test: `backend/src/doctors/dto/public-doctor.dto.spec.ts` (create)

- [ ] **Step 1: Write the failing test**

Create `backend/src/doctors/dto/public-doctor.dto.spec.ts`:

```ts
import { toPublicDoctorProfile } from './public-doctor.dto';

describe('toPublicDoctorProfile', () => {
  const base = {
    id: 'doc-1',
    userId: 'user-1',
    fullName: 'Dr. Ana Reyes',
    professionalTitle: 'MD',
    bio: null,
    specialization: 'Cardiology',
    profilePictureUrl: null,
    availabilitySummary: null,
    yearsOfExperience: 10,
    languagesSpoken: ['English'],
    consultationFocusAreas: null,
    consultationFee: 500,
    prcLicenseNo: '0012345',
    prcLicenseExpiry: new Date('2027-01-01'),
    ptrNo: 'PTR-999',
    region: 'NCR',
    city: 'Makati',
    isVerified: true,
    isActive: true,
    verifiedAt: new Date('2026-01-01'),
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  it('omits sensitive and internal fields', () => {
    const result = toPublicDoctorProfile({ ...base } as never);
    expect(result).not.toHaveProperty('userId');
    expect(result).not.toHaveProperty('createdAt');
    expect(result).not.toHaveProperty('updatedAt');
    expect(result).not.toHaveProperty('ptrNo');
    expect(result).not.toHaveProperty('prcLicenseExpiry');
    expect(result).not.toHaveProperty('isActive');
    expect(result).not.toHaveProperty('verifiedAt');
  });

  it('keeps public fields and passes through specializations', () => {
    const specializations = [
      { isPrimary: true, specialization: { id: 's1', name: 'Cardiology' } },
    ];
    const result = toPublicDoctorProfile({ ...base, specializations } as never);
    expect(result.prcLicenseNo).toBe('0012345');
    expect(result.isVerified).toBe(true);
    expect(result.city).toBe('Makati');
    expect(result.region).toBe('NCR');
    expect(result.specializations).toEqual(specializations);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && npm test -- public-doctor.dto`
Expected: FAIL — result still has `ptrNo` / `isActive` / `verifiedAt` / `prcLicenseExpiry`.

- [ ] **Step 3: Rewrite the DTO**

Replace the entire contents of `public-doctor.dto.ts` with:

```ts
import { DoctorProfile, AvailabilitySlot } from '@prisma/client';

export interface PublicDoctorSpecialization {
  isPrimary: boolean;
  specialization: { id: string; name: string };
}

export type PublicDoctorProfile = Omit<
  DoctorProfile,
  | 'userId'
  | 'createdAt'
  | 'updatedAt'
  | 'ptrNo'
  | 'prcLicenseExpiry'
  | 'isActive'
  | 'verifiedAt'
> & {
  availabilitySlots?: AvailabilitySlot[];
  specializations?: PublicDoctorSpecialization[];
};

export function toPublicDoctorProfile(
  profile: DoctorProfile & {
    availabilitySlots?: AvailabilitySlot[];
    specializations?: PublicDoctorSpecialization[];
  },
): PublicDoctorProfile {
  const {
    userId: _userId,
    createdAt: _createdAt,
    updatedAt: _updatedAt,
    ptrNo: _ptrNo,
    prcLicenseExpiry: _prcLicenseExpiry,
    isActive: _isActive,
    verifiedAt: _verifiedAt,
    ...publicFields
  } = profile;

  void _userId;
  void _createdAt;
  void _updatedAt;
  void _ptrNo;
  void _prcLicenseExpiry;
  void _isActive;
  void _verifiedAt;

  return publicFields;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && npm test -- public-doctor.dto`
Expected: PASS.

- [ ] **Step 5: Verify whole backend suite + build**

Run: `cd backend && npm run build && npm test`
Expected: build succeeds; all tests PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/src/doctors/dto/public-doctor.dto.ts backend/src/doctors/dto/public-doctor.dto.spec.ts
git commit -m "fix(doctors): stop leaking ptrNo/expiry/isActive/verifiedAt; carry specializations"
```

---

## Task 5: Frontend types — extend `DoctorProfile`, add `DoctorReview`

**Files:**
- Modify: `frontend/src/types/api.ts:15-31`

- [ ] **Step 1: Extend `DoctorProfile`**

Replace the `DoctorProfile` interface (lines 15-31) with:

```ts
export interface DoctorSpecializationLink {
  isPrimary: boolean;
  specialization: { id: string; name: string };
}

export interface DoctorProfile {
  id: string;
  userId?: string;
  fullName: string;
  professionalTitle: string;
  specialization: string;
  bio?: string;
  profilePictureUrl?: string;
  availabilitySummary?: string;
  yearsOfExperience?: number;
  languagesSpoken?: string[];
  consultationFee?: number;
  consultationFocusAreas?: string;
  city?: string;
  region?: string;
  isVerified?: boolean;
  prcLicenseNo?: string;
  specializations?: DoctorSpecializationLink[];
  availabilitySlots?: AvailabilitySlot[];
  avgRating?: number;
  reviewCount?: number;
}
```

- [ ] **Step 2: Add `DoctorReview` interface**

Directly after the `DoctorProfile` interface, add:

```ts
export interface DoctorReview {
  id: string;
  rating: number;
  comment?: string | null;
  createdAt: string;
  patient: { fullName: string; profilePictureUrl?: string | null };
}
```

- [ ] **Step 3: Verify build**

Run: `cd frontend && npm run build`
Expected: build succeeds (no type errors).

- [ ] **Step 4: Commit**

```bash
git add frontend/src/types/api.ts
git commit -m "feat(types): add doctor location/verification/specializations + DoctorReview"
```

---

## Task 6: `use-doctor-detail` — fetch reviews

**Files:**
- Modify: `frontend/src/components/doctors/use-doctor-detail.ts`

- [ ] **Step 1: Replace the hook body**

Replace the entire file with:

```ts
import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api-client";
import type { DoctorProfile, AvailabilitySlot, DoctorReview } from "@/types/api";

export function useDoctorDetail(id: string) {
  const [doctor, setDoctor] = useState<DoctorProfile | null>(null);
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [reviews, setReviews] = useState<DoctorReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDoctorAndSlots() {
      try {
        setLoading(true);
        setError(null);
        const [doctorData, slotsData, reviewsData] = await Promise.all([
          apiRequest<DoctorProfile>(`/doctors/${id}`),
          apiRequest<AvailabilitySlot[]>(`/doctors/${id}/slots`),
          apiRequest<DoctorReview[]>(`/reviews/doctor/${id}`),
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
        setReviews(reviewsData);
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

  return { doctor, slots, reviews, loading, error };
}
```

- [ ] **Step 2: Verify build**

Run: `cd frontend && npm run build`
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/doctors/use-doctor-detail.ts
git commit -m "feat(doctors): fetch doctor reviews in use-doctor-detail"
```

---

## Task 7: Doctor page hero — verified badge + location; pass reviews

**Files:**
- Modify: `frontend/src/app/doctors/[id]/page.tsx`

- [ ] **Step 1: Add the verified badge import**

In the `@radix-ui/react-icons` import block (lines 7-11), add `CheckCircledIcon`:

```ts
import {
  ArrowLeftIcon,
  CalendarIcon,
  CheckCircledIcon,
  ExclamationTriangleIcon,
} from "@radix-ui/react-icons";
```

- [ ] **Step 2: Add badge + location into the hero pill row**

Inside the hero `<div className="flex flex-wrap gap-2">` (after the existing
specialization / years / fee pills, before the closing `</div>` of that row),
add:

```tsx
                {doctor.isVerified && (
                  <span className="inline-flex items-center gap-1 bg-white/20 text-white text-sm px-3 py-1 rounded-full font-medium">
                    <CheckCircledIcon className="w-4 h-4" />
                    Verified
                  </span>
                )}
                {(doctor.city || doctor.region) && (
                  <span className="bg-white/20 text-white text-sm px-3 py-1 rounded-full">
                    {[doctor.city, doctor.region].filter(Boolean).join(" · ")}
                  </span>
                )}
```

- [ ] **Step 3: Read `reviews` from the hook and pass to `DoctorAbout`**

Change the hook destructure (line 62) from:

```tsx
  const { doctor, slots, loading, error } = useDoctorDetail(id);
```

to:

```tsx
  const { doctor, slots, reviews, loading, error } = useDoctorDetail(id);
```

Change the `DoctorAbout` usage (line 165) from:

```tsx
            <DoctorAbout doctor={doctor} />
```

to:

```tsx
            <DoctorAbout doctor={doctor} reviews={reviews} />
```

- [ ] **Step 4: Verify build + lint**

Run: `cd frontend && npm run build && npm run lint`
Expected: build succeeds; lint clean.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/doctors/[id]/page.tsx
git commit -m "feat(doctors): show verified badge + location in profile hero"
```

---

## Task 8: `DoctorAbout` — restructure + review list

**Files:**
- Modify: `frontend/src/components/doctors/DoctorAbout.tsx`

- [ ] **Step 1: Rewrite the component**

Replace the entire file with:

```tsx
import React from "react";
import type { DoctorProfile, DoctorReview } from "@/types/api";
import { StarRating } from "@/components/ui/star-rating";
import { StarFilledIcon } from "@radix-ui/react-icons";
import { formatRelativeTime } from "@/lib/datetime";

function initialsOf(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function DoctorAbout({
  doctor,
  reviews,
}: {
  doctor: DoctorProfile;
  reviews: DoctorReview[];
}) {
  const specializations = doctor.specializations ?? [];
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

      {specializations.length > 0 && (
        <section>
          <h3 className="text-xl font-bold text-text-primary mb-3">
            Specializations
          </h3>
          <div className="flex flex-wrap gap-2">
            {specializations.map((s) => (
              <span
                key={s.specialization.id}
                className={
                  s.isPrimary
                    ? "bg-primary/10 text-primary px-3 py-1.5 rounded-md text-sm font-medium"
                    : "bg-surface-container px-3 py-1.5 rounded-md text-sm text-on-surface-variant"
                }
              >
                {s.specialization.name}
                {s.isPrimary ? " · Primary" : ""}
              </span>
            ))}
          </div>
        </section>
      )}

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

      {(doctor.prcLicenseNo || doctor.isVerified || doctor.city || doctor.region) && (
        <section>
          <h3 className="text-xl font-bold text-text-primary mb-3">
            Credentials &amp; Location
          </h3>
          <dl className="text-sm text-on-surface-variant space-y-1">
            {doctor.prcLicenseNo && (
              <div className="flex gap-2">
                <dt className="font-medium text-text-primary">PRC License No.</dt>
                <dd>
                  {doctor.prcLicenseNo}
                  {doctor.isVerified ? " (Verified)" : ""}
                </dd>
              </div>
            )}
            {(doctor.city || doctor.region) && (
              <div className="flex gap-2">
                <dt className="font-medium text-text-primary">Location</dt>
                <dd>{[doctor.city, doctor.region].filter(Boolean).join(", ")}</dd>
              </div>
            )}
          </dl>
        </section>
      )}

      <section>
        <h2 className="text-2xl font-bold text-text-primary mb-3">
          Patient Reviews
        </h2>
        <StarRating rating={doctor.avgRating ?? 0} count={doctor.reviewCount ?? 0} />
        {reviews.length > 0 ? (
          <ul className="mt-6 space-y-6">
            {reviews.map((r) => (
              <li key={r.id} className="flex gap-3">
                <div className="w-10 h-10 shrink-0 rounded-full bg-surface-container flex items-center justify-center text-sm font-semibold text-on-surface-variant">
                  {initialsOf(r.patient.fullName)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-text-primary">
                      {r.patient.fullName}
                    </p>
                    <span className="text-xs text-on-surface-variant">
                      {formatRelativeTime(r.createdAt)}
                    </span>
                  </div>
                  <div
                    className="flex items-center gap-0.5 my-1"
                    aria-label={`Rated ${r.rating} out of 5`}
                  >
                    {[1, 2, 3, 4, 5].map((i) => (
                      <StarFilledIcon
                        key={i}
                        className={
                          i <= r.rating
                            ? "w-3.5 h-3.5 text-warning"
                            : "w-3.5 h-3.5 text-outline-variant"
                        }
                      />
                    ))}
                  </div>
                  {r.comment && (
                    <p className="text-sm text-on-surface-variant leading-relaxed">
                      {r.comment}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-on-surface-variant italic">
            No written reviews yet.
          </p>
        )}
      </section>
    </div>
  );
}
```

- [ ] **Step 2: Verify build + lint**

Run: `cd frontend && npm run build && npm run lint`
Expected: build succeeds; lint clean.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/doctors/DoctorAbout.tsx
git commit -m "feat(doctors): restructure About + render specializations, credentials, review list"
```

---

## Task 9: New `booking-calendar.tsx`

**Files:**
- Create: `frontend/src/components/booking/booking-calendar.tsx`

- [ ] **Step 1: Create the component**

Create `frontend/src/components/booking/booking-calendar.tsx`:

```tsx
"use client";

import React, { useMemo } from "react";
import {
  Calendar,
  CalendarGrid,
  CalendarGridBody,
  CalendarGridHeader,
  CalendarHeaderCell,
  CalendarCell,
  CalendarHeading,
  Button,
} from "react-aria-components";
import { ChevronLeftIcon, ChevronRightIcon } from "@radix-ui/react-icons";
import { today, parseDate, type DateValue } from "@internationalized/date";
import { cn } from "@/lib/utils";
import type { AvailabilitySlot } from "@/types/api";

const PH_TZ = "Asia/Manila";
// en-CA yields YYYY-MM-DD, matching CalendarDate.toString().
const keyFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: PH_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** PH-local date key (YYYY-MM-DD) for an ISO timestamp. */
export function phDateKey(iso: string): string {
  return keyFmt.format(new Date(iso));
}

interface BookingCalendarProps {
  slots: AvailabilitySlot[];
  selectedDateKey: string | null;
  onSelectDate: (dateKey: string) => void;
}

export function BookingCalendar({
  slots,
  selectedDateKey,
  onSelectDate,
}: BookingCalendarProps) {
  const availableKeys = useMemo(
    () => new Set(slots.map((s) => phDateKey(s.startTime))),
    [slots]
  );

  const value = selectedDateKey ? parseDate(selectedDateKey) : null;

  return (
    <Calendar
      aria-label="Choose appointment date"
      className="w-fit mx-auto"
      minValue={today(PH_TZ)}
      value={value}
      onChange={(d: DateValue) => onSelectDate(d.toString())}
      isDateUnavailable={(d) => !availableKeys.has(d.toString())}
    >
      <header className="flex items-center justify-between gap-1 px-1 pb-3">
        <Button
          slot="previous"
          aria-label="Previous month"
          className="flex h-8 w-8 items-center justify-center rounded-md text-on-surface-variant outline-none hover:bg-surface-container data-[disabled]:opacity-30"
        >
          <ChevronLeftIcon className="h-4 w-4" />
        </Button>
        <CalendarHeading className="flex-1 text-center text-sm font-semibold text-text-primary" />
        <Button
          slot="next"
          aria-label="Next month"
          className="flex h-8 w-8 items-center justify-center rounded-md text-on-surface-variant outline-none hover:bg-surface-container data-[disabled]:opacity-30"
        >
          <ChevronRightIcon className="h-4 w-4" />
        </Button>
      </header>
      <CalendarGrid className="border-collapse">
        <CalendarGridHeader>
          {(day) => (
            <CalendarHeaderCell className="w-10 pb-1 text-[0.7rem] font-normal text-on-surface-variant">
              {day}
            </CalendarHeaderCell>
          )}
        </CalendarGridHeader>
        <CalendarGridBody>
          {(date) => (
            <CalendarCell
              date={date}
              className={cn(
                "flex h-10 w-10 cursor-pointer items-center justify-center rounded-md text-sm outline-none transition-colors",
                "data-[hovered]:bg-primary/10 data-[hovered]:text-primary",
                "data-[selected]:bg-primary data-[selected]:text-white data-[selected]:hover:bg-primary",
                "data-[focus-visible]:ring-2 data-[focus-visible]:ring-primary",
                "data-[disabled]:cursor-default data-[disabled]:text-on-surface-variant/30 data-[disabled]:hover:bg-transparent",
                "data-[unavailable]:cursor-default data-[unavailable]:text-on-surface-variant/20 data-[unavailable]:line-through data-[unavailable]:hover:bg-transparent",
                "data-[outside-month]:text-on-surface-variant/30"
              )}
            />
          )}
        </CalendarGridBody>
      </CalendarGrid>
    </Calendar>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `cd frontend && npm run build`
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/booking/booking-calendar.tsx
git commit -m "feat(booking): add inline calendar with availability-aware day disabling"
```

---

## Task 10: Rewrite `doctor-booking-panel.tsx` + delete `slot-picker.tsx`

**Files:**
- Modify: `frontend/src/components/booking/doctor-booking-panel.tsx`
- Delete: `frontend/src/components/booking/slot-picker.tsx`

- [ ] **Step 1: Rewrite the panel**

Replace the entire contents of `doctor-booking-panel.tsx` with:

```tsx
"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { apiRequest } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { CheckCircledIcon } from "@radix-ui/react-icons";
import { BookingCalendar, phDateKey } from "@/components/booking/booking-calendar";
import { formatPHTime } from "@/lib/datetime";
import { cn } from "@/lib/utils";
import type { AvailabilitySlot } from "@/types/api";

export function DoctorBookingPanel({ slots }: { slots: AvailabilitySlot[] }) {
  const router = useRouter();
  const { data: session } = useSession();

  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<AvailabilitySlot | null>(null);
  const [reason, setReason] = useState("");
  const [isBooking, setIsBooking] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);

  const slotsForDay = useMemo(() => {
    if (!selectedDateKey) return [];
    return slots
      .filter((s) => phDateKey(s.startTime) === selectedDateKey)
      .sort(
        (a, b) =>
          new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
      );
  }, [slots, selectedDateKey]);

  function handleSelectDate(dateKey: string) {
    setSelectedDateKey(dateKey);
    setSelectedSlot(null);
  }

  async function handleBookAppointment(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedSlot || reason.trim().length < 5) return;
    try {
      setIsBooking(true);
      setBookingError(null);
      await apiRequest("/appointments", {
        method: "POST",
        token: session?.user?.accessToken,
        body: { slotId: selectedSlot.id, reasonForVisit: reason.trim() },
      });
      setBookingSuccess(true);
      setTimeout(() => router.push("/appointments"), 1500);
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

  if (slots.length === 0) {
    return (
      <div className="bg-surface py-6 px-4 rounded-lg text-center">
        <p className="text-on-surface-variant text-sm">
          No available slots at the moment.
        </p>
      </div>
    );
  }

  return (
    <>
      {bookingSuccess && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-top-4 fade-in duration-300">
          <div className="bg-brand text-white px-6 py-3 rounded-xl shadow-lifted flex items-center gap-3">
            <CheckCircledIcon className="w-5 h-5" />
            <span className="font-medium">
              Request sent — your doctor will confirm shortly.
            </span>
          </div>
        </div>
      )}

      <BookingCalendar
        slots={slots}
        selectedDateKey={selectedDateKey}
        onSelectDate={handleSelectDate}
      />

      {selectedDateKey && (
        <div className="mt-4">
          <h4 className="text-xs font-semibold text-text-primary mb-3 uppercase tracking-wider">
            Available Times
          </h4>
          {slotsForDay.length === 0 ? (
            <p className="text-sm text-on-surface-variant">
              No times left for this day.
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {slotsForDay.map((slot) => {
                const isSelected = selectedSlot?.id === slot.id;
                return (
                  <button
                    type="button"
                    key={slot.id}
                    onClick={() => setSelectedSlot(slot)}
                    className={cn(
                      "py-2 px-1 text-xs font-medium rounded-md transition-all border text-center",
                      isSelected
                        ? "bg-primary text-white border-primary shadow-sm"
                        : "bg-surface hover:border-primary/50 text-on-surface-variant border-outline-variant hover:text-primary"
                    )}
                  >
                    {formatPHTime(slot.startTime)}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

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
            {reason.trim().length < 5 && (
              <p className="mt-2 text-xs text-on-surface-variant">
                Add a brief reason for your visit (at least 5 characters) to
                continue.
              </p>
            )}
          </form>
        </div>
      )}
    </>
  );
}
```

- [ ] **Step 2: Delete the obsolete slot picker**

Run: `git rm frontend/src/components/booking/slot-picker.tsx`

- [ ] **Step 3: Verify no remaining references to slot-picker**

Run: `cd frontend && grep -rn "slot-picker\|SlotPicker" src/ || echo "no references"`
Expected: `no references`.

- [ ] **Step 4: Verify build + lint**

Run: `cd frontend && npm run build && npm run lint`
Expected: build succeeds; lint clean.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/booking/doctor-booking-panel.tsx frontend/src/components/booking/slot-picker.tsx
git commit -m "feat(booking): calendar + time-list booking flow, remove slot-picker"
```

---

## Final Verification

- [ ] **Backend:** `cd backend && npm run build && npm test` — build OK, all tests pass.
- [ ] **Frontend:** `cd frontend && npm run build && npm run lint` — build OK, lint clean.
- [ ] **Manual smoke (optional, requires running app):**
  - Open `/doctors/<id>`: verified badge (if verified), location, specializations, focus areas, languages, PRC no., and review list all render.
  - Booking: days without open slots are struck-through/disabled; pick an open day → times appear → pick a time → enter reason → Confirm → success toast → redirect to `/appointments`.
  - Confirm `GET /doctors/<id>` JSON no longer contains `ptrNo`, `prcLicenseExpiry`, `isActive`, `verifiedAt`.
```
