# React Aria Date & Time Picker Migration — Design

Date: 2026-05-29
Branch: frontend/onboarding-new-schema
Status: Approved

## Problem

The custom `react-day-picker` birthday picker (`onboarding/1`) renders poorly — a
caption/nav layout overlap plus a hand-rolled segmented MM/DD/YYYY input. Across the app,
date entry is inconsistent: a custom `BirthdateInput`, raw native `<input type="date">`,
and a `DatePicker` component all coexist. Time entry uses raw native `<input type="time">`.

We are standardizing every picker on **React Aria Components** (Adobe) for
healthcare-grade accessibility, Tailwind-native styling, and primitives that scale to
future appointment-slot / availability UIs.

## Goals

- One date-picker primitive and one time-field primitive used everywhere.
- Gold-standard accessibility and keyboard/typeable entry (type "1990" for a birth year).
- **Preserve the existing string interface** so no zod schema, react-hook-form
  registration, or onboarding context changes are required.

## Non-Goals

- No scheduler/agenda view (Schedule-X / FullCalendar) — separate future concern.
- No change to display formatting in schedule/cards (`date-fns` stays for that).
- No change to the booking `slot-picker` (renders existing slots as buttons, not an input).

## Libraries

- **Add:** `react-aria-components`, `@internationalized/date`.
- **Remove:** `react-day-picker` (v10.0.1) once no longer imported.
- **Keep:** `date-fns` (display formatting elsewhere), `@radix-ui/react-popover`
  is no longer needed by these pickers but stays if other components use it.
- Tailwind v4 — style via RAC data-attribute variants (`data-[selected]`,
  `data-[disabled]`, `data-[unavailable]`) and render-prop `className`. No extra plugin.

## Interface Contract (the invariant)

Every consumer today reads/writes plain strings. New components keep this exactly:

- Date: `value?: string` in `"YYYY-MM-DD"`, `onChange(value: string)` (empty string when cleared).
- Time: `value?: string` in `"HH:mm"` (24h), `onChange(value: string)`.

Internally components convert with `@internationalized/date`:
- `parseDate("YYYY-MM-DD")` → `CalendarDate`; `date.toString()` → `"YYYY-MM-DD"`.
- `parseTime("HH:mm")` → `Time`; format back to `"HH:mm"` (zero-padded).
- Invalid/empty string → `null` value passed to RAC; `onChange("")` on clear.

This invariant is why zod schemas, RHF, and contexts are untouched.

## Components

All under `frontend/src/components/ui/`. All `'use client'`.

### `calendar.tsx` (rewrite)
- Wraps RAC `Calendar`. Styled with existing design tokens (`primary`, `surface`,
  `surface-container`, `outline-variant`, `on-surface-variant`).
- Fixes the caption/nav overlap: header is a flex row — prev button, month+year
  heading, next button — no absolute positioning.
- Props pass through `minValue` / `maxValue` (as `CalendarDate`).
- Internal to `DatePicker`; not used directly by pages.

### `date-picker.tsx` (rewrite)
- Wraps RAC `DatePicker` = typeable `DateField` (segmented) + popover `Calendar`.
- Public props: `value?: string`, `onChange(value: string)`, `placeholder?`,
  `disabled?`, `minDate?: string`, `maxDate?: string`, `className?`, `id?`,
  `aria-label?` / label support consistent with `FormField`.
- Birthday config at call site: `maxDate = today`. Expiry/schedule: `minDate = today`.
- Replaces both the old `DatePicker` (Date-object interface) and `BirthdateInput`.

### `time-field.tsx` (new)
- Wraps RAC `TimeField`. Public props: `value?: string` (`"HH:mm"`),
  `onChange(value: string)`, `disabled?`, `className?`, `id?`, `aria-label?`.
- `hourCycle={24}`, minute granularity.

### Removed
- `birthdate-input.tsx` — superseded by `DatePicker` (typeable `DateField` replaces
  the manual MM/DD/YYYY segments).

## Consumer Changes (9 surfaces)

Date (→ new `DatePicker`):
1. `app/onboarding/1/page.tsx` — birthday (replace `BirthdateInput`, `maxDate=today`).
2. `app/onboarding/6/page.tsx` — review-edit birthday (replace native input).
3. `app/dashboard/profile/page.tsx` — birthday (replace native input).
4. `app/onboarding/doctor/2/page.tsx` — PRC expiry (replace native input, `minDate=today`).
5. `app/onboarding/doctor/5/page.tsx` — review-edit expiry (replace native input).
6. `app/doctor/profile/page.tsx` — PRC expiry (replace native input).
7. `app/doctor/schedule/page.tsx` — add-slot date (replace old `DatePicker`; now passes
   string directly, dropping the `parseISO`/`format` Date round-trip).

Time (→ new `TimeField`):
8. `app/doctor/schedule/page.tsx` — start time (replace native `type="time"`).
9. `app/doctor/schedule/page.tsx` — end time (replace native `type="time"`).

`handleAddSlot` in the schedule page already operates on `formDate` (string) and
`formStartTime`/`formEndTime` (`"HH:mm"`) — no logic change beyond the input swaps.

## Error Handling

- Out-of-range selection is prevented by RAC `minValue`/`maxValue` (disabled days,
  non-submittable). Existing zod validation remains the source of truth on submit.
- Partial/invalid typed entry yields no `onChange` until a complete valid date — the
  field shows RAC's validation state; consumers see empty string until valid.

## Testing

- Unit tests for the 3 primitives:
  - string ⇄ internal round-trip (`"YYYY-MM-DD"` / `"HH:mm"`).
  - `minDate`/`maxDate` disable out-of-range days.
  - `onChange` emits the correct string; clearing emits `""`.
- Existing onboarding test suite must pass unchanged — that is the proof the string
  interface held across the migration.

## Rollout / Verification

- `pnpm build` (or project build) green, 0 TS errors.
- No remaining imports of `react-day-picker`, `birthdate-input`, or the old Date-based
  `DatePicker` signature; then remove `react-day-picker` from `package.json`.
- Manual smoke: birthday entry (type year), expiry min-today block, schedule add-slot.

## Files Touched (~12)

New/rewritten: `calendar.tsx`, `date-picker.tsx`, `time-field.tsx`.
Removed: `birthdate-input.tsx`.
Consumers: 7 listed above (schedule counts once for 3 swaps).
Config: `package.json` (add 2 deps, remove 1).
