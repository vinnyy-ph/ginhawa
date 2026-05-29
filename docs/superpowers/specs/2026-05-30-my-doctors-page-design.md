# My Doctors Page — Design Spec

**Date:** 2026-05-30  
**Branch:** features/improvements

## Overview

Add a "My Doctors" page to the patient portal showing every doctor the patient has had an appointment with, including aggregate visit stats and quick actions to view their profile or book again.

---

## Backend

### New endpoint

`GET /appointments/patient/doctors` — PATIENT role only.

**Service method:** `findDoctorsForPatient(userId: string)`

**Logic:**
1. Resolve `PatientProfile` from `userId`
2. Fetch all appointments where `patientId = patientProfile.id`, including `doctor` (id, userId, fullName, professionalTitle, specialization, profilePictureUrl) and `slot` (startTime)
3. Group by `doctorId`, compute aggregates:
   - `totalVisits`: count of all appointments
   - `upcomingCount`: appointments where status is PENDING or CONFIRMED and slot.startTime >= now
   - `lastVisit`: ISO string of the most recent past slot.startTime (null if none)
4. Return array sorted by `lastVisit` descending (most recent doctor first)

**Controller:** Add `@Get('patient/doctors')` with `@Roles('PATIENT')` guard, calling the new service method.

### New response type (frontend `types/api.ts`)

```ts
// GET /appointments/patient/doctors
export interface PatientDoctorSummary {
  doctor: {
    id: string; // DoctorProfile.id — use for /doctors/[id] links
    fullName: string;
    professionalTitle: string;
    specialization: string;
    profilePictureUrl?: string | null;
  };
  totalVisits: number;
  upcomingCount: number;
  lastVisit: string | null;
}
```

---

## Frontend

### New page: `/my-doctors/page.tsx`

- `"use client"` — fetches via `apiRequest`
- Wrapped in `DashboardLayout role="patient"`
- Calls `GET /appointments/patient/doctors` on mount using session token

**Header:**
- Title: "My Doctors" (`text-3xl font-serif font-bold text-text-primary`)
- Subtitle: "Everyone you've had an appointment with" (`text-on-surface-variant`)

**Search bar** (max-w-sm):
- Client-side filter on `doctor.fullName` and `doctor.specialization`
- Same style as `/doctor/patients` search input (rounded-xl, outline/40 border, MagnifyingGlassIcon)

**List layout (horizontal rows):**

Each row is a `bg-surface-white rounded-xl shadow-soft` card with `flex items-center gap-4 p-4`:

| Zone | Content |
|------|---------|
| Left (avatar) | 40×40 rounded-full, teal gradient background (`from-primary-container to-primary`), white initials initial — or `<img>` if `profilePictureUrl` set |
| Center (info) | `fullName` bold + `professionalTitle` muted small + `specialization` in primary color |
| Center-right (stats) | `X visits · Last: MMM YYYY` in on-surface-variant; upcoming `<Badge>` if `upcomingCount > 0` |
| Right (actions) | "View Profile" outline button + "Book Again" filled button — both link to `/doctors/[doctor.id]` |

**Empty state** (no doctors, or no search match):
- PersonIcon in surface-container circle
- "No doctors yet" heading / "No doctors match your search"
- Body: "Patients appear here once you've had an appointment" / "Try a different name or specialty"
- When no doctors at all: link button → `/doctors` ("Find a Doctor")

**States:** loading → `<Spinner />` centered; error → surface-white card with message.

---

## Nav update

`frontend/src/components/layout/dashboard-layout.tsx`

Add to `patientNav` array after the "Find a Doctor" entry:

```ts
{ href: '/my-doctors', label: 'My Doctors', icon: <PersonIcon className="w-4 h-4" /> }
```

`patientMobileNav` is unchanged (stays 5 items).

---

## Files changed

| File | Change |
|------|--------|
| `backend/src/appointments/appointments.service.ts` | Add `findDoctorsForPatient` method |
| `backend/src/appointments/appointments.controller.ts` | Add `GET patient/doctors` route |
| `frontend/src/types/api.ts` | Add `PatientDoctorSummary` interface |
| `frontend/src/app/my-doctors/page.tsx` | New page (create) |
| `frontend/src/components/layout/dashboard-layout.tsx` | Add nav item |

---

## Out of scope

- Dedicated per-doctor history view (patient can navigate to public profile for rebooking)
- Pagination (patients typically have few doctors; full list is fine)
- Mobile nav changes
