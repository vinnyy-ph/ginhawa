# Schema Improvement Tasks — Telehealth App (WC Launchpad 2026)

## Context & Current State

The application is **halfway through active development**. The frontend, backend, and database are all running against the existing `schema.prisma`. Your job is to improve the schema incrementally without breaking anything that already works.

**Existing working models (do not break):**
- `User` + `Role` enum
- `PatientProfile`
- `DoctorProfile`
- `AvailabilitySlot` + `SlotStatus` enum
- `Appointment` + `AppointmentStatus` enum
- `MedicalRecord`
- `Notification`
- `RecommendationLog`

---

## ⚠️ Pre-Flight: Clear All Existing Data First

> **Do this before running any migration or touching any code.** The database currently has seeded and populated data from the original schema. Some upcoming migrations (particularly the `NotificationType` enum cast and the `languagesSpoken` array conversion) will fail or produce corrupt data if existing rows are present. Starting from a clean database eliminates all of these risks entirely.

### Recommended: Full reset via Prisma (cleanest)

This drops the database, recreates it, and replays all existing migrations from scratch. It is the safest and fastest option for a dev environment.

```bash
npx prisma migrate reset
```

When prompted `"Are you sure you want to reset your database? All data will be lost."`, confirm with `y`.

After the reset completes, verify it worked:

```bash
npx prisma migrate status
# All migrations should show as "Applied"

npx prisma db pull
# Should return with no schema drift warnings
```

Then re-run your seed script if you have one:

```bash
npx prisma db seed
# or: npx ts-node prisma/seed.ts
```

---

### Alternative: Manual truncation (if you cannot reset)

If `prisma migrate reset` is unavailable (e.g., the migration history must be preserved), truncate all tables manually in the correct order to satisfy foreign key constraints. Run this SQL directly against your PostgreSQL database:

```sql
-- Truncate in leaf-to-root order (children before parents)
TRUNCATE TABLE
  medical_records,
  appointments,
  availability_slots,
  recommendation_logs,
  notifications,
  patient_profiles,
  doctor_profiles,
  users
RESTART IDENTITY CASCADE;
```

> `RESTART IDENTITY` resets all auto-increment sequences back to 1.
> `CASCADE` automatically handles any foreign key references that were missed in the ordering.

Verify all tables are empty before proceeding:

```sql
SELECT
  tablename,
  (SELECT COUNT(*) FROM information_schema.tables t
   WHERE t.table_name = pg_tables.tablename) AS row_count
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

Every table should return `0` rows before you move on.

---

### After clearing data — confirm the app still runs

Before touching the schema, confirm the application boots cleanly against the now-empty database:

```bash
# Backend should start without errors
npm run dev   # or your start command

# Prisma client should generate without errors
npx prisma generate
```

If the app starts cleanly, proceed to Phase 1.

---

## Non-Negotiable Safety Rules

Before touching anything, read and follow these rules exactly:

1. **Never drop an existing column.** Only add new columns. If a field needs to be replaced, add the new one first, migrate data, then deprecate the old one in a later pass — not now.
2. **Never rename an existing column or model.** Renaming breaks every API, service, and frontend reference. Use `@map` / `@@map` for DB-level naming if needed, but keep Prisma field names identical.
3. **Never change an existing enum by removing values.** Only add new enum values.
4. **Never change a required field to a different type directly.** Use a two-step: add new optional field → backfill → make required (only if truly needed).
5. **Run one migration per phase.** Do not batch all phases into one migration. Each phase gets its own `prisma migrate dev --name <descriptive-name>` call.
6. **After every migration, verify the app still compiles and the existing API endpoints still respond correctly before moving to the next phase.**
7. **All new fields must be optional (`?`) unless specified otherwise.** This prevents breaking existing `create` mutations that don't pass the new fields yet.
8. **Do not modify any existing `@relation`, `onDelete`, or `@@index` directives** unless explicitly instructed below.

---

## Execution Order

Work through phases in order. Do not skip ahead.

```
Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5
(safe adds)  (new models) (array fix) (refactor) (bonus)
```

---

## Phase 1 — Pure Additive Field Changes (Safest)

These are new **optional** fields added to existing models. They cannot break anything.

### 1.1 — `PatientProfile`: Structured contact and location fields

**Why:** `contactDetails String?` cannot be used for SMS push notifications or location-based doctor filtering. Split it into queryable fields. Keep `contactDetails` as-is so existing code doesn't break.

**Add to `PatientProfile`** (after the existing `contactDetails` field):
```prisma
phoneNumber     String?  @map("phone_number")
address         String?
city            String?
region          String?
philhealthId    String?  @map("philhealth_id")
hmoProvider     String?  @map("hmo_provider")
hmoCardNo       String?  @map("hmo_card_no")
```

**Do NOT remove `contactDetails`.** It stays for backward compatibility.

**Migration command:**
```bash
npx prisma migrate dev --name add_patient_contact_location_fields
```

**Code to update after migration:**
- Patient registration form/DTO: add optional fields for `phoneNumber`, `city`, `region`, `philhealthId`, `hmoProvider`, `hmoCardNo`
- Patient profile update endpoint: allow updating these new fields
- `PatientProfile` TypeScript types/interfaces: add the new optional fields

---

### 1.2 — `DoctorProfile`: PRC license, verification, location, and status fields

**Why:** PRC license number is a mandatory trust signal for Philippine healthcare. `isVerified` and `isActive` are needed to gate doctor visibility. `region`/`city` enables location-based search.

**Add to `DoctorProfile`** (after the existing `consultationFee` field):
```prisma
prcLicenseNo      String?   @map("prc_license_no")
prcLicenseExpiry  DateTime? @map("prc_license_expiry")
ptrNo             String?   @map("ptr_no")
region            String?
city              String?
isVerified        Boolean   @default(false) @map("is_verified")
isActive          Boolean   @default(true)  @map("is_active")
verifiedAt        DateTime? @map("verified_at")
```

**Migration command:**
```bash
npx prisma migrate dev --name add_doctor_verification_and_location_fields
```

**Code to update after migration:**
- Doctor registration form/DTO: add optional fields for `prcLicenseNo`, `prcLicenseExpiry`, `ptrNo`, `region`, `city`
- Doctor profile update endpoint: allow updating these fields
- Doctor discovery/search endpoint: add filter by `isVerified: true` and `isActive: true` — unverified doctors should not appear in patient-facing search results
- `DoctorProfile` TypeScript types/interfaces: add the new optional fields

---

### 1.3 — `Appointment`: Rescheduling audit trail

**Why:** The spec requires reschedule/cancel support. `AppointmentStatus.RESCHEDULED` exists but there is no link between the old and new appointment, and no cancel reason. Without this, the patient's appointment history is misleading.

**Add to the `Appointment` model** (after `bookedAt`):
```prisma
cancelledAt       DateTime? @map("cancelled_at")
cancelReason      String?   @map("cancel_reason")
rescheduledFromId String?   @map("rescheduled_from_id")
```

**Add the self-relation** on `Appointment` (add these two relation fields alongside the above):
```prisma
rescheduledFrom   Appointment?  @relation("RescheduledAppointments", fields: [rescheduledFromId], references: [id], onDelete: SetNull)
rescheduledTo     Appointment?  @relation("RescheduledAppointments")
```

**Migration command:**
```bash
npx prisma migrate dev --name add_appointment_reschedule_audit
```

**Code to update after migration:**
- Cancel appointment endpoint: set `cancelledAt = now()` and `cancelReason`
- Reschedule appointment endpoint: when creating the new appointment, set `rescheduledFromId` to the old appointment's id, then set the old appointment's status to `RESCHEDULED`
- Patient appointment history view: show reschedule chain if `rescheduledFromId` is present

---

### 1.4 — `NotificationType` enum + update `Notification`

**Why:** `Notification.type` is a plain `String`, so any value can be stored. An enum enforces consistency across backend services and frontend handlers.

**Add the enum** (place it near the top of the schema, after the existing `SlotStatus` enum):
```prisma
enum NotificationType {
  APPOINTMENT_BOOKED
  APPOINTMENT_REMINDER
  APPOINTMENT_CANCELLED
  APPOINTMENT_RESCHEDULED
  PRESCRIPTION_READY
  GENERAL
}
```

**Update the `Notification` model** — change the `type` field:

> ⚠️ This is the one slightly risky change in Phase 1. The `type` field currently stores arbitrary strings. Before running this migration, search your entire codebase for every place `type` is set on a Notification and confirm every value maps to one of the enum values above. If any value doesn't map, add it to the enum first.

Replace:
```prisma
type      String
```
With:
```prisma
type      NotificationType
```

**Migration command:**
```bash
npx prisma migrate dev --name add_notification_type_enum
```

> If the migration fails with a cast error (existing rows have values not in the enum), run this raw SQL first to normalize existing data, then re-run the migration:
> ```sql
> UPDATE notifications SET type = 'GENERAL' WHERE type NOT IN (
>   'APPOINTMENT_BOOKED','APPOINTMENT_REMINDER','APPOINTMENT_CANCELLED',
>   'APPOINTMENT_RESCHEDULED','PRESCRIPTION_READY','GENERAL'
> );
> ```

**Code to update after migration:**
- Every service/controller that creates a `Notification`: update the `type` value to use the enum (e.g., `NotificationType.APPOINTMENT_BOOKED`)
- Frontend notification handler: update any switch/if blocks to use the new enum string values

---

## Phase 2 — New Models (Safe — New Tables Only)

New models create new tables. They do not touch existing tables. Existing code will be unaffected until you actively use the new models.

### 2.1 — `Specialization` model + junction table

**Why:** `DoctorProfile.specialization` is a free-text string. The AI recommendation feature and Doctor Discovery filtering both require a clean, queryable specialization list.

**Add to `schema.prisma`:**
```prisma
model Specialization {
  id          String   @id @default(cuid())
  name        String   @unique
  description String?
  createdAt   DateTime @default(now()) @map("created_at")

  doctors     DoctorSpecialization[]

  @@map("specializations")
}

model DoctorSpecialization {
  doctorId         String        @map("doctor_id")
  doctor           DoctorProfile @relation(fields: [doctorId], references: [id], onDelete: Cascade)
  specializationId String        @map("specialization_id")
  specialization   Specialization @relation(fields: [specializationId], references: [id], onDelete: Cascade)
  isPrimary        Boolean       @default(false) @map("is_primary")

  @@id([doctorId, specializationId])
  @@map("doctor_specializations")
}
```

**Add back-relations to `DoctorProfile`** (inside the existing `DoctorProfile` model, after existing relations):
```prisma
specializations  DoctorSpecialization[]
```

**Add back-relation to `Specialization`** (already included above in the new model).

**Important:** Do NOT remove `DoctorProfile.specialization String` yet. Keep it. The old field is the fallback until you seed the `Specialization` table and migrate existing doctor data to the new junction table.

**Migration command:**
```bash
npx prisma migrate dev --name add_specialization_model
```

**Code to add after migration:**
- Seed script: populate the `Specialization` table with standard Philippine medical specializations (General Practice, Internal Medicine, Pediatrics, OB-GYN, Dermatology, Cardiology, Orthopedics, ENT, Psychiatry, Neurology, Ophthalmology, Radiology, Surgery, Family Medicine, Rehabilitation Medicine)
- Doctor registration/onboarding: allow selecting one or more specializations from the seeded list instead of (or in addition to) the free-text field
- Doctor Discovery endpoint: support `?specialization=cardiology` query param using the new junction table

---

### 2.2 — `Payment` model (MVP scope — no real gateway integration)

**Why:** `consultationFee` exists on `DoctorProfile` but there is no record of whether a payment was acknowledged for a booking. For this MVP, **no real payment gateway is needed** — no GCash API, no Maya webhook, no credit card processing. The model exists only to track a fee amount and a simple status that the app can update manually.

> **MVP boundary:** Do not integrate any payment gateway. Do not implement webhooks or callbacks. The payment flow is: show the fee to the patient at booking → patient acknowledges → backend marks payment as `PAID` automatically. This is sufficient for a demo and keeps the scope realistic.

**Add to `schema.prisma`:**
```prisma
enum PaymentStatus {
  PENDING
  PAID
  WAIVED
}

model Payment {
  id            String        @id @default(cuid())
  appointmentId String        @unique @map("appointment_id")
  appointment   Appointment   @relation(fields: [appointmentId], references: [id], onDelete: Cascade)
  amount        Float
  currency      String        @default("PHP")
  status        PaymentStatus @default(PENDING)
  createdAt     DateTime      @default(now()) @map("created_at")
  updatedAt     DateTime      @updatedAt @map("updated_at")

  @@index([appointmentId])
  @@map("payments")
}
```

**Add back-relation to `Appointment`** (inside existing `Appointment` model, after `medicalRecord`):
```prisma
payment      Payment?
```

**Migration command:**
```bash
npx prisma migrate dev --name add_payment_model
```

**Code to add after migration:**
- Booking flow: when an appointment is created, auto-create a `Payment` record with `amount = doctor.consultationFee` and `status = PAID`. No confirmation step needed for the MVP.
- If `consultationFee` is null or zero, set `status = WAIVED`.
- Appointment detail view: display the consultation fee and status as a read-only badge. No payment action button needed.
- Do not build any payment form, redirect, or external API call.

---

### 2.3 — `Review` model

**Why:** Doctor Discovery requires a way for patients to compare doctors. A ratings system is the most intuitive signal and a highly visible differentiating feature.

**Add to `schema.prisma`:**
```prisma
model Review {
  id            String         @id @default(cuid())
  appointmentId String         @unique @map("appointment_id")
  appointment   Appointment    @relation(fields: [appointmentId], references: [id], onDelete: Cascade)
  patientId     String         @map("patient_id")
  patient       PatientProfile @relation(fields: [patientId], references: [id], onDelete: Cascade)
  doctorId      String         @map("doctor_id")
  doctor        DoctorProfile  @relation(fields: [doctorId], references: [id], onDelete: Cascade)
  rating        Int
  comment       String?
  isVisible     Boolean        @default(true) @map("is_visible")
  createdAt     DateTime       @default(now()) @map("created_at")

  @@index([doctorId])
  @@index([patientId])
  @@map("reviews")
}
```

**Add back-relations** to existing models:

Inside `Appointment` model (after `payment`):
```prisma
review        Review?
```

Inside `PatientProfile` model (after `recommendationLogs`):
```prisma
reviews       Review[]
```

Inside `DoctorProfile` model (after `medicalRecords`):
```prisma
reviews       Review[]
```

**Migration command:**
```bash
npx prisma migrate dev --name add_review_model
```

**Code to add after migration:**
- Post-consultation flow: after an appointment is marked `COMPLETED`, prompt the patient to leave a review
- Doctor card component: display average rating (compute via `_avg` in Prisma aggregation query on `Review.rating` filtered by `doctorId`)
- Doctor profile page: display review list with patient comments (`isVisible: true` only)
- Doctor Discovery endpoint: add optional `?sortBy=rating` support

---

### 2.4 — `PatientMedicalHistory` model

**Why:** The existing `medicalHistory String?` blob cannot be queried or used by the AI recommendation engine. Structured fields allow the AI to match patient conditions to doctor specializations.

**Add to `schema.prisma`:**
```prisma
model PatientMedicalHistory {
  id                  String         @id @default(cuid())
  patientId           String         @unique @map("patient_id")
  patient             PatientProfile @relation(fields: [patientId], references: [id], onDelete: Cascade)
  bloodType           String?        @map("blood_type")
  allergies           String[]
  chronicConditions   String[]       @map("chronic_conditions")
  currentMedications  String[]       @map("current_medications")
  pastSurgeries       String?        @map("past_surgeries")
  familyHistory       String?        @map("family_history")
  smokingStatus       String?        @map("smoking_status")
  updatedAt           DateTime       @updatedAt @map("updated_at")

  @@map("patient_medical_histories")
}
```

**Add back-relation to `PatientProfile`** (inside the existing `PatientProfile` model, after `recommendationLogs`):
```prisma
medicalHistoryRecord PatientMedicalHistory?
```

**Do NOT remove `medicalHistory String?`** from `PatientProfile`. Keep it for backward compatibility with any existing code that reads it.

**Migration command:**
```bash
npx prisma migrate dev --name add_patient_medical_history_model
```

**Code to add after migration:**
- Patient onboarding/profile form: add structured health history section (blood type dropdown, allergies multi-input, etc.)
- AI recommendation service: update the symptom-matching logic to also read `allergies`, `chronicConditions`, and `currentMedications` from the new model when generating doctor suggestions
- Medical history is created alongside `PatientProfile` — auto-create an empty `PatientMedicalHistory` record when a new patient registers (use Prisma nested `create`)

---

## Phase 3 — Type Change: `languagesSpoken` to Array

This is the only direct field type change. It affects `DoctorProfile.languagesSpoken`.

### 3.1 — `DoctorProfile.languagesSpoken`: `String?` → `String[]`

**Why:** A plain string like `"Filipino, English, Cebuano"` cannot be filtered with `array contains`. In PostgreSQL + Prisma, `String[]` allows `{ has: "Cebuano" }` queries.

**Check before proceeding:** Search your entire codebase for every read and write of `languagesSpoken`. For each write, confirm it passes an array (e.g., `["Filipino", "English"]`) rather than a string.

**In `schema.prisma`**, update `DoctorProfile`:

Replace:
```prisma
languagesSpoken     String?  @map("languages_spoken")
```
With:
```prisma
languagesSpoken     String[] @map("languages_spoken")
```

> ⚠️ If there is existing data in the `doctor_profiles.languages_spoken` column, run this raw SQL migration **before** running `prisma migrate dev` to convert comma-separated strings to PostgreSQL arrays:
> ```sql
> ALTER TABLE doctor_profiles
>   ALTER COLUMN languages_spoken TYPE TEXT[]
>   USING string_to_array(languages_spoken, ', ');
> ```
> If the column is empty or the table has no rows yet, skip the raw SQL and run the Prisma migration directly.

**Migration command:**
```bash
npx prisma migrate dev --name change_languages_spoken_to_array
```

**Code to update after migration:**
- Doctor profile update DTO: ensure `languagesSpoken` accepts `string[]`, not `string`
- Doctor registration form: use a multi-select or tag input, not a plain text field
- Doctor Discovery filter: update to use `{ languagesSpoken: { has: selectedLanguage } }`

---

## Phase 4 — Structural Refactor: Specialization Relation

Only run this phase after Phase 2.1 is complete **and** the `Specialization` table has been seeded.

### 4.1 — Migrate existing doctor specialization data to the junction table

**Before touching the schema**, run a one-time data migration script:

```typescript
// scripts/migrate-specializations.ts
// Run with: npx ts-node scripts/migrate-specializations.ts

import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const doctors = await prisma.doctorProfile.findMany({
    select: { id: true, specialization: true }
  })

  for (const doctor of doctors) {
    if (!doctor.specialization) continue

    // Find or create the specialization
    const spec = await prisma.specialization.upsert({
      where: { name: doctor.specialization },
      update: {},
      create: { name: doctor.specialization }
    })

    // Link via junction table, marking it as primary
    await prisma.doctorSpecialization.upsert({
      where: {
        doctorId_specializationId: {
          doctorId: doctor.id,
          specializationId: spec.id
        }
      },
      update: {},
      create: {
        doctorId: doctor.id,
        specializationId: spec.id,
        isPrimary: true
      }
    })
  }

  console.log(`Migrated ${doctors.length} doctor specializations.`)
}

main().catch(console.error).finally(() => prisma.$disconnect())
```

**Run the script:**
```bash
npx ts-node scripts/migrate-specializations.ts
```

**Verify in your database** that `doctor_specializations` has the expected rows before continuing.

### 4.2 — Mark `DoctorProfile.specialization` as deprecated

Do NOT remove it yet. Add a comment above it in the schema so future developers know:

```prisma
// @deprecated — use DoctorSpecialization relation instead. Do not remove until all
// API consumers are confirmed to use the new specializations relation.
specialization      String
```

**No migration needed for this step** — it is a schema comment only.

### 4.3 — Update application code

- Doctor creation endpoint: write to both `specialization` (old field, keep for now) and create a `DoctorSpecialization` record (new relation)
- Doctor Discovery filter: switch from `where: { specialization: { contains: q } }` to `where: { specializations: { some: { specialization: { name: { contains: q } } } } }`
- AI recommendation service: update to query by `Specialization.name` via the junction table
- Doctor profile page: read from `specializations` relation instead of `specialization` string

---

## Phase 5 — Bonus: Structured Prescriptions + Follow-up Linking

Only implement this after all previous phases are complete and stable. These are differentiating features, not blockers.

### 5.1 — `Prescription` model

**Why:** `MedicalRecord.prescription String?` is a text blob. A structured model enables proper e-prescription display, and positions the app for DOH e-prescription compliance.

**Add to `schema.prisma`:**
```prisma
model Prescription {
  id              String        @id @default(cuid())
  medicalRecordId String        @map("medical_record_id")
  medicalRecord   MedicalRecord @relation(fields: [medicalRecordId], references: [id], onDelete: Cascade)
  drugName        String        @map("drug_name")
  dosage          String
  frequency       String
  durationDays    Int?          @map("duration_days")
  instructions    String?
  issuedAt        DateTime      @default(now()) @map("issued_at")

  @@index([medicalRecordId])
  @@map("prescriptions")
}
```

**Add back-relation to `MedicalRecord`** (after existing fields):
```prisma
prescriptions   Prescription[]
```

**Keep `MedicalRecord.prescription String?`** for backward compatibility.

**Migration command:**
```bash
npx prisma migrate dev --name add_prescription_model
```

---

### 5.2 — Follow-up appointment link on `MedicalRecord`

**Why:** `followUpAdvice String?` is advice text. Linking it to an actual booked appointment closes the care loop and enables follow-up reminders.

**Add to `MedicalRecord`** (after `followUpAdvice`):
```prisma
followUpAppointmentId String?      @map("follow_up_appointment_id")
followUpAppointment   Appointment? @relation("FollowUpAppointment", fields: [followUpAppointmentId], references: [id], onDelete: SetNull)
```

**Add back-relation to `Appointment`**:
```prisma
followUpFor   MedicalRecord? @relation("FollowUpAppointment")
```

**Migration command:**
```bash
npx prisma migrate dev --name add_followup_appointment_link
```

---

## Final Checklist

After all phases are complete, verify the following:

- [ ] `prisma generate` runs with zero errors
- [ ] `prisma migrate status` shows no pending migrations
- [ ] All existing API endpoints (patient registration, doctor registration, booking, slot management, medical records, notifications) still return correct responses
- [ ] New optional fields appear in Prisma types (check generated `node_modules/.prisma/client`)
- [ ] Doctor Discovery endpoint filters correctly by `isActive: true` and `isVerified: true`
- [ ] AI recommendation service reads from `PatientMedicalHistory` for richer context
- [ ] Specialization seeding script has been run and the `specializations` table is populated
- [ ] Data migration script for specializations has been run and verified
- [ ] No `console.error` or TypeScript type errors in backend services related to changed fields

---

## Summary of All Migrations (in order)

| Phase | Migration Name | Risk |
|---|---|---|
| 1.1 | `add_patient_contact_location_fields` | None |
| 1.2 | `add_doctor_verification_and_location_fields` | None |
| 1.3 | `add_appointment_reschedule_audit` | None |
| 1.4 | `add_notification_type_enum` | Low — check existing type values first |
| 2.1 | `add_specialization_model` | None |
| 2.2 | `add_payment_model` | None — no gateway integration, auto-mark as PAID |
| 2.3 | `add_review_model` | None |
| 2.4 | `add_patient_medical_history_model` | None |
| 3.1 | `change_languages_spoken_to_array` | Medium — check existing data first |
| 4.x | *(no migration — data script + code update only)* | Low |
| 5.1 | `add_prescription_model` | None |
| 5.2 | `add_followup_appointment_link` | None |