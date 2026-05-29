# Demo-Readiness Fixes — Design

**Date:** 2026-05-30
**Branch:** frontend/onboarding-new-schema
**Source:** UX/flow code review (11 issues). #4 (notification deep-links) and #8 (doctor schedule bulk/recurring) already shipped — excluded. This spec covers the 9 remaining actionable issues.

## Goal

Make the patient → doctor → consultation → record demo path credible end-to-end. Fix the booking 404, dead reschedule button, ungated join, misleading copy, fragile consult exit, and the smaller naming/nav/deep-link gaps.

## Locked Decisions

| Topic | Decision |
|-------|----------|
| Reschedule (#2) | Both patient and doctor roles |
| Join window (#3) | Real time gate `[start − 15min, end]`, render-time only (no poll) |
| Consult exit (#6) | Patient lands on `/appointments` |
| Record link (#7) | Query param `/records?appointment=<id>` highlight (no new route) |

## Backend Facts (no backend changes needed)

- `POST /appointments/:id/reschedule` body `{ newSlotId }` — exists, tested. Role-aware ownership; only PENDING/CONFIRMED reschedulable; new slot must belong to same doctor, be `AVAILABLE`, not past. Creates a **new PENDING** appointment linked via `rescheduledFromId`, frees old slot, books new, marks old `RESCHEDULED`, notifies the counterpart.
- `GET /doctors/:doctorId/slots` returns all slots (filter `AVAILABLE` + future client-side).
- `MedicalRecord.appointmentId` exists → param match is direct.
- `Appointment.doctorId` exists; `AvailabilitySlot` has `status`/`startTime`/`endTime`; `SlotPicker` props are `{ slots, selectedSlot, onSelectSlot }` — reusable as-is.

---

## A. Booking happy-path — `components/booking/doctor-booking-panel.tsx`

- **#1** Redirect target `/dashboard/appointments` → `/appointments` (line 34). The route `/dashboard/*` does not exist; `/appointments` does.
- **#5** Booking POST creates status `PENDING`, not a locked booking. Success copy "Appointment booked!" → **"Request sent — your doctor will confirm shortly."** (toast at line 52 + the redirecting label). Sets correct expectation against the doctor "Confirm Request" step.

## B. Appointment-card actions — `components/appointment-card.tsx`

### #2 Reschedule (both roles)
- Replace the hardcoded-disabled button (line 121) with a live trigger opening a new **`RescheduleDialog`** component.
- Dialog flow: fetch `GET /doctors/{appt.doctorId}/slots` → filter `status === "AVAILABLE"` && `startTime` in future → render via reused `SlotPicker` → on confirm `POST /appointments/{appt.id}/reschedule { newSlotId }`.
- Success: toast "Rescheduled — awaiting confirmation"; parent list refetches. Resulting appointment is PENDING (re-confirm by doctor); old slot freed automatically.
- Wire the same dialog into the doctor card branch (doctor reschedules to another of their own AVAILABLE slots).
- Parent wiring: `appointments/page.tsx` and `doctor/appointments/page.tsx` own data + refetch; pass an `onRescheduled` / refetch callback into the card (mirrors existing `onUpdateStatus` pattern). Cards stay presentational.

### #3 Join window
- Implement `isWithinJoinWindow(appt)` (lines 25-30): return `true` only when `appt.slot` exists and `now >= start − 15*60*1000 && now <= end`. Replaces the `return true` stub.
- Computed at render. No live ticking / no poll (MVP). A slot becoming joinable surfaces on the next page load/refetch — accepted trade-off.
- Gates the Join button on both patient (line 151) and doctor (line 287) branches.

### #9 Action ordering
- Doctor "Complete & Document" (line 292) renders only when `now >= slot.start`. Before the consult start time it is hidden, preventing AI summarization of empty notes pre-consult. (Join still governed by #3 window.)

## C. Consultation exit — `app/consultation/[appointmentId]/page.tsx`

- **#6** Add a patient-side `participant-left` listener (fires when the doctor leaves via the native Daily leave button or any disconnect) alongside the existing `call-ended` app-message handler. **Both route the patient to `/appointments`** (changed from `/records`).
- Rationale: the medical record is not published until the doctor completes finalize, so `/records` could be empty/stale (original bug). `/appointments` reflects the appointment (it flips to COMPLETED after finalize); the patient opens the record from there when ready (see #7).
- Doctor `handleEndAndFinalize` unchanged: still sends `call-ended`, then navigates to `/doctor/finalize/{id}`.
- Listener registration/cleanup follows the existing `useEffect` add/remove pattern; both handlers removed on unmount.

## D. Record deep-link — `components/appointment-card.tsx` + `app/records/page.tsx`

- **#7** Patient COMPLETED card link (line 163) `/records` → `/records?appointment={appt.id}`.
- Records page: read `useSearchParams`, locate the record whose `appointmentId` matches, scroll it into view and apply a temporary highlight ring. If no match (record not yet published / unknown id), render the normal full timeline — no error.
- This Next version may require a Suspense boundary around the `useSearchParams` consumer; add a minimal wrapper if the build requires it. (Verify against `node_modules/next/dist/docs/` per frontend AGENTS.md.)

## E. Naming + nav

- **#10** `app/patient-home.tsx:152` "AI Recommendation" → **"AI Symptom Checker"** to match `header.tsx:38` and the dominant naming (recommendations page, inline widget, CTAs). Single canonical user-facing name.
- **#11** `components/layout/header.tsx` logged-out auth area (lines 85-86): add a secondary **"Sign up as a doctor"** link → `/signup/doctor` beside the patient "Sign up". (The center-nav "For Doctors" entry remains; this adds an explicit signup affordance.)

---

## Components Touched

| File | Change |
|------|--------|
| `components/booking/doctor-booking-panel.tsx` | #1 redirect, #5 copy |
| `components/appointment-card.tsx` | #2 trigger, #3 window, #7 link, #9 ordering |
| `components/booking/reschedule-dialog.tsx` (new) | #2 reschedule UI, reuses `SlotPicker` |
| `app/appointments/page.tsx` | #2 pass refetch callback to card |
| `app/doctor/appointments/page.tsx` | #2 pass refetch callback to card |
| `app/consultation/[appointmentId]/page.tsx` | #6 participant-left + landing |
| `app/records/page.tsx` | #7 param highlight |
| `app/patient-home.tsx` | #10 rename |
| `components/layout/header.tsx` | #11 doctor signup link |

## Verification

- `npm run build` clean (0 errors) + `npm run lint` clean.
- Manual demo walkthrough: book → "request sent" copy → doctor confirms → join only inside window → consult → doctor leaves (native button) → patient lands on `/appointments` → after finalize, COMPLETED card → "View Medical Record" deep-links + highlights the right record.
- No frontend unit tests: the frontend has no test runner (scripts are dev/build/start/lint only); adding jest/vitest is out of scope for this batch. `isWithinJoinWindow` is verified by build + manual walkthrough.
- Backend reschedule already has unit tests — no new backend tests.

## Reschedule Modal Primitive

`@radix-ui/react-dialog` is already a dependency. `reschedule-dialog.tsx` uses Radix Dialog primitives directly (`Dialog.Root/Trigger/Portal/Overlay/Content`) — accessible focus trap + escape, no new shared `ui/dialog` wrapper.

## Out of Scope

- #4, #8 (already shipped).
- Live-ticking/polling for join availability.
- Recurring-schedule changes, payments UI, reviews.
