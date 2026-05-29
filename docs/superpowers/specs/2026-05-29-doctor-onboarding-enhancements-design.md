# Doctor Onboarding Enhancements — Design

Date: 2026-05-29
Branch: `frontend/onboarding-new-schema`

## Goal

Polish the doctor onboarding flow: validated/formatted PRC & PTR numbers, a
specialization dropdown sourced from the DB, quick-pick pills for languages and
focus areas, and inline per-field editing (incl. photo) on the review step —
mirroring the patient onboarding patterns already shipped.

## Backend — `GET /specializations` (public)

- New `SpecializationsModule` under `backend/src/specializations/`:
  - `specializations.service.ts` → `findAll()` returns
    `prisma.specialization.findMany({ orderBy: { name: 'asc' } })`.
  - `specializations.controller.ts` → `@Public()` `@Get()` calls `findAll()`.
    Returns `{ id, name, description }[]`.
  - `specializations.module.ts` registered in `app.module.ts`.
- Minimal Jest spec (service, mocked Prisma) so the suite stays green.
- No schema change. The 15 canonical names are already seeded.

## Shared frontend

- `frontend/src/lib/format.ts` — add:
  - `formatPrc(v)`: strip non-digits, slice to 7.
  - `isValidPrc(v)`: digit-length === 7.
  - `formatPtr(v)`: strip non-digits, slice to 8.
  - `isValidPtr(v)`: digit-length === 0 (empty allowed, optional) or 7 or 8.
- Extract `frontend/src/components/ui/chip.tsx` — the `Chip` button currently
  local to patient step 4. Refactor patient step 4 (`onboarding/4`) to import it.
- Extract `frontend/src/components/ui/editable-row.tsx` — the generic
  `EditableRow<T extends Record<string, unknown>>` (+ exported `editInputClass`)
  currently local to patient step 6. Refactor patient step 6 (`onboarding/6`) to
  import it. Keep behavior identical (snapshot draft on edit, validate→error,
  SAVE/CANCEL).
- New `frontend/src/hooks/use-specializations.ts`:
  - `useSpecializations()` → fetches `GET /specializations` once via
    `apiRequest<{ id: string; name: string }[]>('/specializations', { method: 'GET' })`,
    returns `{ specializations: string[]; loading: boolean }` (names only).
    On error, returns `[]` (the select still preserves the current value).
  - Used by doctor step 3 and step 5.

## Doctor step 2 — Credentials (`onboarding/doctor/2`)

- `prcLicenseNo` input: `inputMode="numeric"`, `onChange` runs `formatPrc`.
- `ptrNo` input: `inputMode="numeric"`, `onChange` runs `formatPtr`.
- `doctorCredentialsSchema` (in `onboarding.schemas.ts`):
  - `prcLicenseNo`: `.min(1, 'PRC license number is required').refine(isValidPrc, 'PRC license number must be 7 digits')`.
  - `ptrNo`: `.optional().refine((v) => isValidPtr(v ?? ''), 'PTR number must be 7–8 digits')`.

## Doctor step 3 — Specialization & Experience (`onboarding/doctor/3`)

- Primary specialization → `<select>`:
  - Options from `useSpecializations()`. While `loading`, show a disabled
    "Loading…" option. Always include the current `data.specialization` as an
    option if it is non-empty and not already in the fetched list (preserves a
    value chosen earlier).
  - Required validation unchanged (must be non-empty).
- Languages spoken → `Chip` row (4 common) + existing comma input:
  - `COMMON_LANGUAGES = ['English', 'Tagalog', 'Cebuano', 'Ilocano']`.
  - Clicking a chip toggles the value in the `languagesSpoken` comma string
    (add if absent, remove if present), same logic as patient list pills.

## Doctor step 4 — Practice Details (`onboarding/doctor/4`)

- Focus areas → `Chip` row (4 common) + existing textarea:
  - `COMMON_FOCUS = ['Preventive Care', 'Chronic Disease Management', 'Lifestyle & Nutrition', 'Mental Health']`.
  - Toggle on the `consultationFocusAreas` comma string.

## Doctor step 5 — Review (`onboarding/doctor/5`)

- Replace static detail rows with inline-editable `EditableRow`s writing to
  doctor onboarding context via `update`. Fields:
  - fullName (text), professionalTitle (text)
  - specialization (select via `useSpecializations`), yearsOfExperience (number),
    languagesSpoken (text)
  - prcLicenseNo (formatPrc + `isValidPrc` validate), prcLicenseExpiry (date),
    ptrNo (formatPtr + `isValidPtr` validate), region (text), city (text)
  - bio (textarea), consultationFocusAreas (text), consultationFee (number),
    availabilitySummary (text)
- Inline photo upload: button overlay on the avatar triggers a hidden file input
  → `apiUpload<{ url: string }>('/uploads/profile-picture', 'file', file, token)`
  → `update({ profilePictureUrl: url })`. JPEG/PNG/WebP, < 5 MB; spinner while
  uploading; inline error on failure. Mirrors patient step 6.
- Submit unchanged: still `POST /doctors/profile` spreading `...data` with the
  `languagesSpoken` comma→array split and `prcLicenseExpiry: ... || undefined`.

## Out of scope
- No changes to patient flow behavior (only the two extractions + imports).
- No doctor verification UI. No backend changes beyond the specializations read
  endpoint.
- Required-vs-optional rules unchanged except the new PRC/PTR format refinements.
