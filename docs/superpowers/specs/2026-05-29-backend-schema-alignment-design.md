# Backend Schema Alignment — Design

**Date:** 2026-05-29
**Branch:** `database/schema-redesign`
**Source task:** `docs/tasks/BACKEND_ALIGNMENT_NEW_SCHEMA.md`

## Context

12 phases of additive, non-breaking Prisma schema improvements landed on `database/schema-redesign` (16 migrations, 55/55 backend tests passing, builds clean, nothing pushed). The new schema capabilities are mostly unwired. This design aligns existing code to the structured replacements and builds the schema-ready features the user selected.

No new migration is required — every model and enum value referenced here already exists in `prisma/schema.prisma`.

## Audit gap list (verified against code)

### Group A — align existing code (mandated by task doc)
- **A1 Recommendations** — `recommendations.service.ts` builds patient context from `RecommendationLog` only; ignores `PatientMedicalHistory` arrays.
- **A2 Doctor junction** — `doctors.service.ts` `upsertProfile`/`create` write the deprecated `specialization` string only; no `DoctorSpecialization` rows, so new doctors are invisible to the discovery filter (which queries the junction).
- **A3 Reschedule** — no reschedule endpoint exists (only `PATCH :id/status`); `rescheduledFromId` is never set.

### Group B — build new (schema-ready, zero code)
- **B4 Review** — model exists, zero code.
- **B5 PatientMedicalHistory** — auto-created empty on register, no update endpoint.
- **B6 Prescription** — structured model, zero code; records write `prescription String?` blob only.
- **B7 Verification** — `isVerified/isActive/verifiedAt` fields exist, no caller.
- **B8 Payment read** — auto-created in booking, never returned on appointment reads.
- **B9 Follow-up link** — `MedicalRecord.followUpAppointmentId` self-relation exists, unused.

## Decisions

- **Scope:** all of Group A + Group B items B4, B5, B6, B8, B9.
- **B7 Verification deferred to script.** `Role` enum has only `PATIENT`/`DOCTOR`; adding `ADMIN` is auth surface not justified for the MVP. Verification stays a seed/admin-script concern (seed already sets `isVerified: true`). No endpoint this round.
- **A1 scope correction:** `recommendations.service.ts` has no doctor query — it logs and returns a specialization string; doctor matching already flows through `doctors.searchAll` (junction). The task line "switch matching to junction" has no code to change here. A1 is therefore **medical-history context only**. `VALID_SPECIALIZATIONS` stays — it is the AI output taxonomy, not a doctor query.

## Design

### A1 — Recommendations: medical-history context
In `createStream`, when a `patientId` resolves, also fetch `PatientMedicalHistory` (`allergies`, `chronicConditions`, `currentMedications`). Extend `patientContext` and `buildPrompt` to include a brief medical-history block. No change to the output schema or fallback logic.

### A2 — Doctor junction writes
In `upsertProfile` and `create`: keep writing the deprecated `specialization` string. After the profile write, within a transaction, `connectOrCreate` a `Specialization` by `name` (= the profile's specialization string), then upsert one `DoctorSpecialization` (`isPrimary: true`). On update, reconcile: delete the prior primary junction row for the doctor and recreate from the new string. Seeded behaviour (verified + junction-linked doctors) is preserved.

### A3 — Reschedule endpoint
`POST /appointments/:id/reschedule`, roles `PATIENT`/`DOCTOR`, caller must own the appointment. Body `{ newSlotId: string }`. Transaction:
1. Load old appt; require status `PENDING` or `CONFIRMED`.
2. Validate new slot is `AVAILABLE` and not in the past; mark it `BOOKED`.
3. Free the old slot (`AVAILABLE`); set old appt `status: RESCHEDULED`.
4. Create new appt: same patient/doctor, `slotId: newSlotId`, copy `reasonForVisit`, `rescheduledFromId: oldId`, status `PENDING`.
5. Create a `Payment` for the new appt (reuse booking fee logic: `PAID` if fee > 0 else `WAIVED`).

Notify the other party (reschedule notification, `GENERAL` type unless a dedicated value already exists). Return the new appointment.

### B4 — Review system
New `reviews` module (controller + service + DTO + spec).
- `POST /reviews`, role `PATIENT`, body `{ appointmentId, rating (1–5), comment? }`. Guards: appointment owned by caller, status `COMPLETED`, no existing review (unique `appointmentId`). Derive `doctorId`/`patientId` from the appointment.
- Discovery aggregation: `searchAll` and `findById` return `avgRating` and `reviewCount`, computed on read via `prisma.review.aggregate`/`groupBy`, counting only `isVisible: true`. No denormalized field on `DoctorProfile`.
- `searchAll` accepts `?sortBy=rating` → order by computed average (descending). Default ordering unchanged.

### B5 — PatientMedicalHistory update
`PATCH /patients/medical-history`, role `PATIENT`. Body: any of `bloodType, allergies[], chronicConditions[], currentMedications[], pastSurgeries, familyHistory, smokingStatus`. Updates the auto-created `PatientMedicalHistory` row for the caller's patient profile.

### B6 — Structured Prescription
Extend `CreateMedicalRecordDto` with `prescriptions?: PrescriptionDto[]` where `PrescriptionDto = { drugName, dosage, frequency, durationDays?, instructions? }`. In medical-record create, create `Prescription` rows in the same transaction. Keep `prescription String?` blob optional (transition). Record reads include `prescriptions`.

### B8 — Payment read
Add `payment` to the `include` in appointment `findOne`, `findAllForPatient`, `findAllForDoctor`. No new endpoint.

### B9 — Follow-up linking
Extend `CreateMedicalRecordDto` with `followUpAppointmentId?: string`. Validate the referenced appointment belongs to the same patient; link via the `FollowUpAppointment` relation. Keep `followUpAdvice` text.

## Cross-cutting

- **TDD** per project CLAUDE.md. Keep 55/55 green; new logic gets mocked-Prisma Jest specs first.
- **No migration** — all models/enum values already exist. Do not run `prisma migrate`.
- **Surgical changes** — B4 is a new module; everything else edits existing services/DTOs/controllers. Write both old + new fields during the specialization transition.
- **Run from `backend/`**; `npm test` after each item.

## Build order

A1 → A2 → A3 → B5 (feeds A1 context) → B6 + B9 (same DTO) → B8 → B4 (largest).
