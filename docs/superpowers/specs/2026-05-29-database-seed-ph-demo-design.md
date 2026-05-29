# Database Seed — PH Demo Dataset

**Date:** 2026-05-29
**Status:** Approved for implementation

## Goal

Rewrite `backend/prisma/seed.ts` to populate every field in the current schema
with Philippines-authentic data, producing a dense demo dataset: 30 doctors and
30 patients plus realistic transactional data (appointments, medical records,
prescriptions, payments, reviews, notifications).

The existing seed is stale: 20 doctors / 15 patients, foreign faker names, and
missing every field added in the schema redesign (location, PRC license,
PhilHealth, HMO, medical-history records, specialization junctions, payments,
reviews, prescriptions).

## Scope

**Full demo dataset.** Beyond profiles, generate transactional data so every
dashboard, history view, and rating surface is populated.

In scope (single-file rewrite of `seed.ts`):

- 15 Specializations (with descriptions)
- 30 Doctors — all `DoctorProfile` fields + 1–2 `DoctorSpecialization` junctions
  + future `AvailabilitySlot`s
- 30 Patients — all `PatientProfile` fields + linked `PatientMedicalHistory`
- ~90 Appointments across all statuses, each with its own slot
- MedicalRecord + Prescriptions + Payment + Review + Notification tied to
  appointments as appropriate

Out of scope: `RecommendationLog` seeding (generated at runtime by the AI flow),
schema changes, app/test changes.

## Decisions

- **PH data source:** curated constant arrays in the seed file + faker for
  generic fields (bio, dates, numbers). No new dependencies, no external
  fixture file, no `fil_PH` locale (coverage too thin for real regions / ID
  formats).
- **Credentials:** keep `doctor{n}@example.com` / `patient{n}@example.com`,
  password `123123123` (bcrypt-hashed once).
- **Reproducible:** fixed `faker.seed(...)` so reruns are deterministic.
- **Idempotent:** full DB reset via ordered `deleteMany` at start of each run.

## PH Constants Block

Declared at top of file:

- **Names:** Filipino first names (male/female pools) + surname pool → doctor and
  patient `fullName`.
- **Geography:** region → cities map. At minimum:
  - NCR — Manila, Quezon City, Makati, Pasig, Taguig
  - Region VII (Central Visayas) — Cebu City, Mandaue
  - Region XI (Davao Region) — Davao City
  - Region III (Central Luzon), Region IV-A (CALABARZON)
  - A picked city always pairs with its correct region on both profiles.
- **HMO providers:** Maxicare, Intellicare, PhilCare, Medicard, Insular Health
  Care, Cocolife.
- **Specializations (15):** General Practice, Internal Medicine, Pediatrics,
  OB-GYN, Dermatology, Cardiology, Orthopedics, ENT, Psychiatry, Neurology,
  Ophthalmology, Radiology, Surgery, Family Medicine, Rehabilitation Medicine —
  each with a one-line description.
- **Languages:** English, Filipino, Cebuano, Ilocano, Hiligaynon.
- **Professional titles:** e.g. "MD", "MD, FPCP", "MD, DPPS", "Consultant".
- **Medical pools:** blood types (A+/O+/B+/AB+/...), allergies, chronic
  conditions, current medications, past surgeries, family history snippets,
  smoking status (Never / Former / Current).
- **Drug list:** for prescriptions (drug name + plausible dosage/frequency).
- **Review comments:** short PH-flavored patient feedback lines.
- **Consultation focus areas:** short phrases per specialization area.

## Format Helpers

- `genPhone()` → `+63 9XX XXX XXXX`
- `genPhilHealth()` → `XX-XXXXXXXXX-X` (12 digits grouped)
- `genPRC()` → 7-digit license number
- `genPTR()` → PTR receipt number
- `pickCity()` → `{ city, region }` pair
- Fixed `faker.seed(<constant>)` set once before generation.

## Seed Flow (sequential)

### 0. Reset
Extend the ordered `deleteMany` to cover all current models. Delete order
(children → parents):
`review` → `payment` → `prescription` → `medicalRecord` → `appointment` →
`availabilitySlot` → `doctorSpecialization` → `recommendationLog` →
`notification` → `patientMedicalHistory` → `patientProfile` →
`doctorProfile` → `specialization` → `user`.

### 1. Specializations
Upsert the 15 specializations with descriptions; keep references by name for
junction wiring.

### 2. Doctors (30)
For each: create `User` (DOCTOR) + `DoctorProfile` populating **all** fields —
`fullName`, `professionalTitle`, `bio`, `specialization` (primary name, kept for
the deprecated column), `profilePictureUrl` (faker avatar), `availabilitySummary`,
`yearsOfExperience`, `languagesSpoken` (1–3), `consultationFocusAreas`,
`consultationFee` (₱500–3000), `prcLicenseNo`, `prcLicenseExpiry` (future),
`ptrNo`, `region`, `city`, `isVerified: true`, `verifiedAt`, `isActive: true`.

- Attach 1–2 `DoctorSpecialization` rows (one `isPrimary: true`).
- Generate future `AvailabilitySlot`s: weekdays over the next 14 days, ~6 slots
  per active day, default `AVAILABLE` (some flipped to `BOOKED` later when an
  appointment claims them).

### 3. Patients (30)
For each: create `User` (PATIENT) + `PatientProfile` populating **all** fields —
`fullName`, `birthdate` (18–80), `weight`, `height`, `profilePictureUrl`,
`contactDetails`, `phoneNumber`, `address`, `city`, `region`, `philhealthId`,
`hmoProvider`, `hmoCardNo`, `medicalHistory` (free-text summary).

- Create linked `PatientMedicalHistory`: `bloodType`, `allergies[]`,
  `chronicConditions[]`, `currentMedications[]`, `pastSurgeries`,
  `familyHistory`, `smokingStatus`.

### 4. Appointments (~2–4 per patient, ~90 total)
Each appointment gets its own dedicated `AvailabilitySlot` (status `BOOKED` for
active appointments). Distribute statuses:

- **COMPLETED** (~40%, past slot): MedicalRecord (notes, recommendations,
  followUpAdvice) + 1–3 `Prescription` rows + Payment `PAID` + ~70% a `Review`
  (rating 3–5, comment) → drives doctor ratings.
- **CONFIRMED** (~25%, future slot): Payment `PAID` or `PENDING`.
- **PENDING** (~20%, future slot): Payment `PENDING`.
- **CANCELLED** (~15%): `cancelledAt` + `cancelReason`; slot released to
  `AVAILABLE` (no payment, or `WAIVED`).

Each appointment event creates a matching `Notification` for the relevant user
(booked / confirmed / completed / cancelled), with correct `NotificationType`.

## Error Handling

- Deterministic seed (fixed faker seed) → reproducible runs.
- Sequential creates (no race conditions); `main()` wrapped in
  `.catch(e => { console.error(e); process.exit(1); })` + `$disconnect()` in
  `finally`.
- Full reset each run makes the seed safely re-runnable.
- Console progress logs per phase (specializations / doctors / patients /
  appointments) with final counts.

## Verification

- Run seed (`npx prisma db seed` / configured runner) against the dev DB.
- Assert counts: 30 doctors, 30 patients, 15 specializations, ~90 appointments,
  reviews present, slots present.
- `seed.ts` is not imported by application code → existing 55 backend tests are
  unaffected; run them to confirm green.
- Confirm backend build / `tsc` clean.

## Success Criteria

- 30 doctor + 30 patient users created with **every** profile field populated
  with PH-authentic data.
- All linked models populated: medical histories, specialization junctions,
  slots, appointments (all statuses), records, prescriptions, payments, reviews,
  notifications.
- Seed is deterministic and re-runnable.
- Build green, existing tests pass.
