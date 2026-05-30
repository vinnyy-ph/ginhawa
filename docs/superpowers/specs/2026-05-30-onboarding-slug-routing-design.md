# Onboarding Slug Routing — Design

**Date:** 2026-05-30
**Status:** Approved (design)

## Problem

Onboarding routes encode their step number in the URL: `/onboarding/1`–`/onboarding/6`
(patient) and `/onboarding/doctor/1`–`/onboarding/doctor/5`. This is an anti-pattern:

- Reordering steps is a breaking URL change.
- Adding/removing a step shifts every later URL.
- Steps cannot be linked or referenced by name.
- The step number is hardcoded in multiple places (route folder, `OnboardingShell step={N}`,
  `router.push('/onboarding/N')`), so order is duplicated across files.

The context (`onboarding-context.tsx`, `doctor-onboarding-context.tsx`) already holds the form
state; the route should not also encode the step.

## Goals

- Replace numbered routes with named slugs carried in a query param.
- Make step order live in exactly one place per flow.
- Deep-linking to a step name works and is guarded against incomplete prerequisites.

## Non-goals

- No change to form fields, validation, submit logic, or API calls.
- No rename of zod schemas (`step1Schema`, `step2Schema`, etc.) — confusingly numbered but
  unrelated to routing; out of scope.
- No change to `onboarding-styles.ts` or the profile/doctor-profile cards that import it.

## Decisions (confirmed)

- **Route shape:** single page per flow + `?step=<slug>`.
- **Old numbered URLs:** dropped entirely (pre-launch MVP, no external links/bookmarks). No
  redirect shims.
- **Guard:** landing on a step whose prerequisites aren't met redirects to the first incomplete
  step.
- **Shell placement:** `OnboardingShell` lifts to the page (Option A), so the progress number
  derives from the registry and reordering needs no per-file edits.

## Final routes

Patient — `/onboarding?step=<slug>`:

| slug | step | required |
|---|---|---|
| `personal` | Personal Information | yes |
| `location` | Location & Insurance | no |
| `body-metrics` | Body Metrics | no |
| `medical-history` | Medical History | no |
| `photo` | Profile Picture | no |
| `review` | One last check (submit) | — |

Doctor — `/onboarding/doctor?step=<slug>`:

| slug | step | required |
|---|---|---|
| `personal` | Personal Information | yes |
| `credentials` | Credentials & Licensure | yes |
| `specialization` | Specialization & Experience | yes |
| `practice` | Practice Details | no |
| `review` | Review Your Profile (submit) | — |

No `?step=` present → render the first slug and rewrite the URL to include it (shareable URL).

## Architecture

### Step registry — single source of truth for order

One `steps.ts` (or `steps.tsx`) per flow. Order, progress number, slug→component, shell title,
and required-flag all derive from this array.

```ts
export const PATIENT_STEPS = [
  { slug: 'personal',        title: 'Personal Information', subtitle: '…', Component: PersonalStep,        required: true },
  { slug: 'location',        title: 'Location & Insurance', subtitle: '…', Component: LocationStep },
  { slug: 'body-metrics',    title: 'Body Metrics',         subtitle: '…', Component: BodyMetricsStep },
  { slug: 'medical-history', title: 'Medical History',      subtitle: '…', Component: MedicalHistoryStep },
  { slug: 'photo',           title: 'Profile Picture',      subtitle: '…', Component: PhotoStep },
  { slug: 'review',          title: 'One last check',       subtitle: '…', Component: ReviewStep, card: false },
] as const;
```

`DOCTOR_STEPS` mirrors this for the doctor flow.

### Page = switcher + guard

`/onboarding/page.tsx` and `/onboarding/doctor/page.tsx` become client components wrapped in
`<Suspense>` (required by Next for `useSearchParams`). Each:

1. Reads `step` via `useSearchParams()`.
2. Resolves the slug against the registry. Unknown or missing → redirect to the first slug.
3. Computes `firstIncomplete(data)` from context data (reusing existing zod schemas). If the
   requested step is past it → redirect to `firstIncomplete`.
4. Renders `<OnboardingShell step={idx+1} totalSteps={steps.length} title subtitle card>` with the
   matched step component as children.

Guard detail:
- Patient: only `personal` hard-gates (steps 2–5 are optional/skippable). Once `personal` is
  complete, any step including `review` is reachable.
- Doctor: sequential — `personal` → `credentials` → `specialization` all required before later
  steps. `firstIncomplete` returns the first required step whose data is missing.

### Navigation helper

`useOnboardingNav(steps)` returns `goNext()`, `goBack()`, `goTo(slug)`, `goToReview()`. Each does
`router.push('/onboarding?step=' + slug)` (doctor variant: `/onboarding/doctor?step=`). Replaces
all current `router.push('/onboarding/N')` and skip-link calls. "Skip for now" = `goToReview()`.

### Step component extraction

Each numbered `page.tsx` body moves into a body-only component:
- `components/onboarding/steps/patient/{personal,location,body-metrics,medical-history,photo,review}.tsx`
- `components/onboarding/steps/doctor/{personal,credentials,specialization,practice,review}.tsx`

Each strips its own `<OnboardingShell>` wrapper (now provided by the page) and routing calls (now
via the nav helper). Internal form logic, validation, and API calls are unchanged. Step-specific
siblings currently rendered outside the shell (review step's `Toast`, photo/personal steps'
`CameraCapture`) render inside the page's shell children instead.

### Cleanup

- Delete numbered folders `onboarding/1`–`6`, `onboarding/doctor/1`–`5`.
- Delete `onboarding/doctor/page.tsx`'s redirect-to-`/1` (the index becomes the real page).
- Layouts (`onboarding/layout.tsx`, `onboarding/doctor/layout.tsx`) unchanged — providers stay.
- Update external refs:
  - `src/app/page.tsx:49` — `redirect("/onboarding/1")` → `redirect("/onboarding")`.
  - `src/app/(auth)/signup/page.tsx:49` — `router.push('/onboarding/1')` → `'/onboarding'`.
  - `src/middleware.ts:12` — add explicit `/onboarding` alongside `/onboarding/:path*`.
  - `/onboarding/doctor` refs (`signup/doctor`, `doctor/dashboard`, `doctor/schedule`) already
    point at the index — no change.

## Testing

- Move `onboarding/6/page.test.tsx` with the review component; update imports/paths.
- Add a guard test: deep-link to a step past `firstIncomplete` redirects to `firstIncomplete`.
- Add a resolver test: unknown slug → first step; known slug → correct component.

## Next.js caveat

This repo runs a Next.js version with breaking changes (see `frontend/AGENTS.md`). Before
implementing, read the relevant guide in `node_modules/next/dist/docs/` for the current
`useSearchParams` / client-page / Suspense conventions and confirm the `redirect` API for client
components.
