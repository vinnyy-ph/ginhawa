# Onboarding — New Schema Fields (Patient + Doctor)

Date: 2026-05-29
Branch: `frontend/onboarding-new-schema`

## Goal

Wire the additive schema fields the backend already accepts into the patient and
doctor signup/onboarding flows. No backend changes — every DTO and endpoint
below already exists and validates these fields.

Source of truth for fields:
- `backend/src/patients/dto/create-patient.dto.ts`
- `backend/src/patients/dto/update-medical-history.dto.ts`
- `backend/src/doctors/dto/create-doctor-profile.dto.ts`

## Patient flow: 5 steps → 6 steps, step 3 restructured

| # | Step | Fields | Change |
|---|------|--------|--------|
| 1 | Personal | fullName, birthdate, contactDetails | unchanged |
| 2 | Location & Insurance | address, city, region, philhealthId, hmoProvider, hmoCardNo (all optional) | **new** |
| 3 | Metrics | weightKg, heightCm | was step 2 |
| 4 | Medical History | bloodType, allergies, chronicConditions, currentMedications, pastSurgeries, familyHistory, smokingStatus | **restructured** (was free-text step 3) |
| 5 | Photo | profilePictureUrl | was step 4 |
| 6 | Review + submit | — | was step 5 |

### Input details
- Lists (`allergies`, `chronicConditions`, `currentMedications`): single comma
  text input, stored as a string in context, split to `string[]` on submit:
  `value.split(',').map((s) => s.trim()).filter(Boolean)`. Matches the existing
  doctor `languagesSpoken` pattern.
- `bloodType`: select — A+, A−, B+, B−, AB+, AB−, O+, O−, Unknown. Optional.
- `smokingStatus`: select — Never, Former, Current, Unknown. Optional.
- `pastSurgeries`, `familyHistory`: textareas. Optional.
- All step-2 (location/insurance) and step-4 (medical) fields optional.

### Submit (step 6) — strictly sequential
1. `POST /patients/profile` with: fullName, birthdate, contactDetails, weight,
   height, profilePictureUrl, address, city, region, philhealthId, hmoProvider,
   hmoCardNo. The old free-text `medicalHistory` blob is **dropped** (replaced by
   structured history).
2. **Then** `PATCH /patients/medical-history` with: bloodType, allergies[],
   chronicConditions[], currentMedications[], pastSurgeries, familyHistory,
   smokingStatus.

Must not parallelize: backend `updateMedicalHistory` calls `findByUserId`
first and throws `NotFound` if no profile exists yet.

Retry safety: profile `POST` 409 → fall back to `PATCH /patients/profile`
(existing pattern); medical-history endpoint is an upsert, so a re-run is
idempotent. A retry re-runs the whole sequence.

## Doctor flow: 4 steps → 5 steps

| # | Step | Fields | Change |
|---|------|--------|--------|
| 1 | Identity | photo, fullName, professionalTitle | unchanged |
| 2 | Credentials | prcLicenseNo **(required)**, prcLicenseExpiry **(required)**, ptrNo, region, city | **new** |
| 3 | Specialization & Experience | specialization, yearsOfExperience, languagesSpoken | was step 2 |
| 4 | Practice Details | bio, consultationFocusAreas, consultationFee, availabilitySummary | was step 3 |
| 5 | Review + submit | — | was step 4 |

### Input details
- `prcLicenseExpiry`: `<input type="date">` with `min={today}`. Zod refinement
  requires `expiry >= today` (a license expiring today is still valid — use
  `>=`, not `>`).
- `ptrNo`, `region`, `city`: optional text inputs.
- Submit unchanged in shape — step 5 already spreads `...data`, so the 5 new
  fields flow into the existing `POST /doctors/profile` body automatically.
  `languagesSpoken` comma→array split stays as-is.

## Review pages — conditional rendering
- Patient review: render the Location/Insurance summary block only if at least
  one of those fields is non-empty (all optional). Render the structured
  medical-history block only if at least one field is non-empty.
- Doctor review: add a Credentials card. PRC fields are required so it always
  renders; ptr/region/city lines shown only when present.
- Never show an empty card for skipped optional sections.

## Files touched (frontend only)

- **Patient routes** — renumber `onboarding/{2→3,3→4,4→5,5→6}`, add new
  `onboarding/2` (Location & Insurance). Update each page's `router.push`
  targets, `ProgressIndicator totalSteps` 5→6, and the review-page edit hrefs.
- **Doctor routes** — renumber `onboarding/doctor/{2→3,3→4,4→5}`, add new
  `onboarding/doctor/2` (Credentials). Update `router.push` targets,
  `ProgressIndicator totalSteps` 4→5, the `/onboarding/doctor` index redirect,
  and the review-page display blocks.
- `frontend/src/types/patient.ts` — extend `OnboardingData` (+location/insurance,
  restructure medical fields: drop `conditions`/`medications`, keep/repurpose
  `allergies`, add bloodType/chronicConditions/currentMedications/pastSurgeries/
  familyHistory/smokingStatus), update `ONBOARDING_DEFAULTS`, extend
  `CreatePatientProfileBody` (+location/insurance, −medicalHistory), add
  `UpdateMedicalHistoryBody` type.
- `frontend/src/types/doctor-onboarding.ts` — add prcLicenseNo, prcLicenseExpiry,
  ptrNo, region, city to data + defaults.
- `frontend/src/lib/schemas/onboarding.schemas.ts` — new/updated step schemas:
  location+insurance (all optional), restructured medical (all optional),
  doctor credentials (PRC no + expiry required, expiry `>= today`).

## Assumptions (locked)
- Use existing required `contactDetails` for phone; ignore the redundant
  `phoneNumber` DTO field.
- Doctor `languagesSpoken` stays a comma text input.
- address/city/region/ptr = plain text inputs (no region picker) — simplicity.
- No backend changes.

## Out of scope
- Doctor verification UI (`isVerified`/`isActive`/`verifiedAt` are
  script/seed-managed; no ADMIN role exists).
- Editing structured medical history post-onboarding (dashboard profile).
- Tag/chip input component (comma text chosen instead).
