# Profile Pages ↔ Onboarding Field Parity — Design

**Date:** 2026-05-29
**Branch:** frontend/onboarding-new-schema
**Status:** Approved (ready for plan)

## Problem

The dashboard "My Profile" pages (patient + doctor) capture far fewer fields than
the updated onboarding flows. Onboarding is the reference. Profile editing must
reach parity so users can view/edit everything they entered during onboarding.

## Reference: onboarding fields

### Patient onboarding (6 steps)
- Step 1: `fullName`, `birthdate`, `contactDetails` (phone)
- Step 2: `address`, `city`, `region`, `philhealthId`, `hmoProvider`, `hmoCardNo`
- Step 3: `weightKg` (→ `weight`), `heightCm` (→ `height`) + live BMI
- Step 4 (medical history): `bloodType`, `allergies[]`, `chronicConditions[]`,
  `currentMedications[]`, `pastSurgeries`, `familyHistory`, `smokingStatus`
- Step 5: `profilePictureUrl`

### Doctor onboarding (5 steps)
- Step 1: `fullName`, `professionalTitle`, `profilePictureUrl`
- Step 2: `prcLicenseNo`, `prcLicenseExpiry`, `ptrNo`, `region`, `city`
- Step 3: `specialization`, `yearsOfExperience`, `languagesSpoken`
- Step 4: `bio`, `consultationFocusAreas`, `consultationFee`, `availabilitySummary`

## Current state of profile pages

### `frontend/src/app/dashboard/profile/page.tsx`
Has: `fullName`, `birthdate`, `weight`, `height`, `contactDetails`,
`medicalHistory` (legacy free-text).
Missing: photo, phone formatting, location (address/city/region), insurance
(philhealthId/hmoProvider/hmoCardNo), structured medical history.

### `frontend/src/app/doctor/profile/page.tsx`
Has: `fullName`, `professionalTitle`, `specialization` (free text), `bio`,
`yearsOfExperience`, `consultationFee`, `languagesSpoken`,
`consultationFocusAreas`, `availabilitySummary`.
Missing: photo, credentials (prcLicenseNo/prcLicenseExpiry/ptrNo), location
(region/city), specialization-as-dropdown.

## Backend state

Both PATCH DTOs already accept every required field — **no DTO changes**:
- `UpdatePatientDto` = `PartialType(CreatePatientDto)` → covers fullName,
  birthdate, weight, height, profilePictureUrl, contactDetails, address, city,
  region, philhealthId, hmoProvider, hmoCardNo.
- `UpdateMedicalHistoryDto` → bloodType, allergies, chronicConditions,
  currentMedications, pastSurgeries, familyHistory, smokingStatus.
- `UpdateDoctorDto` = `PartialType(CreateDoctorDto)` → covers all doctor fields
  incl. prcLicenseNo, prcLicenseExpiry, ptrNo, region, city.

Two real gaps:
1. `PatientsService.findByUserId` does NOT include the medical-history record,
   so `GET /patients/profile` cannot prefill structured medical fields.
2. `DoctorsService.update` does a raw `doctorProfile.update` and does NOT sync
   the `DoctorSpecialization` primary junction. Search filters on that junction,
   so editing specialization on the profile page would let search drift. Only
   `upsertProfile` (POST, used by onboarding) syncs it today.

## Decisions (approved)

1. **Layout:** sectioned single-page form, one Save button, reusing onboarding
   input components. Not the inline editable ID-card.
2. **Patient medical history:** structured fields only. Legacy free-text
   `medicalHistory` removed from the page (DB column left untouched).
3. **Doctor specialization:** dropdown fed by `GET /specializations`
   (`useSpecializations`), and `update()` syncs the primary junction on change.
4. **Validation:** mirror onboarding — optional fields validated only when
   non-empty (PhilHealth 12 digits, HMO 12 chars, PRC 7 digits, PTR 7–8 digits).
   Masked inputs use existing `lib/format.ts` helpers.
5. **Photo:** uploads immediately on file select via `/uploads/profile-picture`;
   returned URL saved with the form submit.

## Design

### Shared frontend units (reuse existing; one new)
- Reuse: `PhoneInput`, `Chip`, `FormField`, `useSpecializations`,
  `onboardingInputClass`/`onboardingTextareaClass`, and `lib/format.ts`
  (`formatPhone`, `formatPhilHealth`, `formatHmoCard`, `formatPrc`, `formatPtr`,
  `isValidPhilHealth`, `isValidHmoCard`, `isValidPrc`, `isValidPtr`).
- **New:** `ProfilePhotoField` (`frontend/src/components/ui/profile-photo-field.tsx`)
  — avatar preview + "Change photo" button + immediate upload to
  `/uploads/profile-picture`. Props: `value` (url), `onChange(url)`, token from
  session. Used by both profile pages. Reuses the file-type/size guards already
  duplicated in onboarding (5MB; jpeg/png/webp).
- **New (presentational):** `ProfileSection` (`.../ui/profile-section.tsx`) —
  a titled card section wrapper (heading + body) so both pages render consistent
  section blocks. Small; keeps page files focused.

### Patient profile page — sections
- **Personal:** photo (`ProfilePhotoField`), `fullName`, `birthdate` (date),
  `contactDetails` (`PhoneInput` + `formatPhone`), `weight`/`height` (numeric,
  optional) with the live BMI readout reused from onboarding step 3 logic.
- **Location & Insurance:** `address`, `city`, `region`, `philhealthId`
  (masked + validated when non-empty), `hmoProvider`, `hmoCardNo` (masked +
  validated when non-empty).
- **Medical History:** `bloodType` (select), `smokingStatus` (select),
  `allergies` / `chronicConditions` / `currentMedications` (Chip suggestions +
  comma-separated input, same lists as onboarding step 4), `pastSurgeries`,
  `familyHistory` (textareas).

Load: `GET /patients/profile` (now includes `medicalHistoryRecord`). Flatten the
nested record into form state; arrays → comma strings for the inputs.

Save (one button → two sequential calls):
1. `PATCH /patients/profile` with personal + location + insurance fields.
2. `PATCH /patients/medical-history` with structured fields (arrays parsed from
   comma strings; empty → `undefined` so a blank field never clobbers data,
   reusing the onboarding `optList` pattern).

Both must succeed for the success toast. If step 1 fails, do not call step 2.

### Doctor profile page — sections
- **Personal:** photo (`ProfilePhotoField`), `fullName`, `professionalTitle`.
- **Credentials:** `prcLicenseNo` (masked + validated when non-empty),
  `prcLicenseExpiry` (date, min today), `ptrNo` (masked + validated when
  non-empty), `region`, `city`.
- **Practice:** `specialization` (dropdown via `useSpecializations`, with the
  same "keep current value if not in fetched list" + free-text fallback logic as
  onboarding step 3), `yearsOfExperience`, `languagesSpoken` (Chip suggestions +
  comma input), `bio`, `consultationFocusAreas`, `consultationFee`,
  `availabilitySummary`.

Load: `GET /doctors/profile`. `languagesSpoken` (array) → comma string for input.
Save: one `PATCH /doctors/profile` with all fields; `languagesSpoken` split back
to an array; empty optional fields sent as `undefined`.

### Backend changes
1. `PatientsService.findByUserId` — add
   `include: { medicalHistoryRecord: true }`. Verify existing callers
   (appointments, medical-records, recommendations, anything calling
   `findByUserId`) tolerate the extra nested field (they read named scalar
   fields, so additive include is safe).
2. `DoctorsService.update` — wrap in a transaction: update the profile, then if
   `data.specialization` is present call the existing
   `syncPrimarySpecialization(tx, profile.id, data.specialization)`. Refactor so
   the method is callable from both `upsertProfile` and `update`.

No DTO changes. No Prisma schema/migration changes.

## Out of scope
- Editing `isVerified` / `verifiedAt` / `isActive` (admin-controlled, not user).
- Multi-specialization editing (only primary, matching onboarding).
- Availability-slot management (separate feature).
- Removing the legacy `medicalHistory` DB column (left untouched for now).

## Success criteria
- Patient profile page shows + edits every onboarding field; structured medical
  history prefills from `GET /patients/profile` and saves via
  `PATCH /patients/medical-history`.
- Doctor profile page shows + edits every onboarding field; specialization is a
  dropdown and saving a new specialization updates the junction (search reflects
  it).
- Masked/validated fields behave identically to onboarding.
- `npm run build` (frontend) clean; backend `npm test` green; no TS errors.
