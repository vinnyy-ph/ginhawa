# Onboarding Design Unification — Design Spec

**Date:** 2026-05-29
**Branch:** frontend/onboarding-new-schema
**Type:** DESIGN ONLY — visual/layout polish. No functional changes.

## Goal

Unify the patient (6-step) and doctor (5-step) onboarding flows under one
consistent, DESIGN.md-grounded visual system by extracting shared UI primitives.
Today the two flows diverge in shell layout, input styling, button shapes, and
review-page visual language. This spec defines a single source of truth via
shared components, so consistency holds by construction rather than by copy-paste.

## Hard Constraints

- **DESIGN ONLY.** Do not modify: react-hook-form/zod wiring, doctor manual
  `setErrors` logic, comma-list pill toggle logic, formatters (`lib/format.ts`),
  photo upload handlers, or submit/API calls. Only swap visual classes and wrap
  page content in shared shell/nav/review primitives.
- Follow `docs/DESIGN.md` tokens and shape language.
- Surgical: touch only what serves the unification (project CLAUDE.md).
- Verify with `npm run lint` && `npm run build` from `frontend/`. Two pre-existing
  unrelated warnings (DoctorCard.tsx, ActivityLogIcon) are acceptable.
- Do NOT touch backend, recommendations/GeminiService work, or the leftover
  `docs/superpowers/{gemini-provider*, patient-onboarding-ux.md}` files.

## DESIGN.md Grounding

- Inputs/buttons: 0.5rem radius. Large containers (cards): 1rem radius.
- Cards: borderless, soft primary-tinted shadow, white background.
- Buttons: gradient `#48cab6 → #31a795`, white text, soft shadow (the existing
  `<Button>` default variant already matches).
- Inputs: 1px idle border → primary border on focus, label + helper in Body-SM.
- Shadows: soft, primary-tinted (`shadow-lifted`/`shadow-hover`), never harsh black.
- Headings Plus Jakarta Sans; body/labels Manrope.
- Mobile: 1-column collapse, 16px margins.

## Shared Primitives (new files)

### 1. `OnboardingShell` — `src/components/ui/onboarding-shell.tsx`
One shell for both flows. Renders:
- Full-bleed header: logo + "Ginhawa" wordmark on `surface-white`, bottom hairline
  in `outline-variant`.
- Body on `bg-surface`, centered container `max-w-xl`.
- Borderless white card, `rounded-lg` (1rem), `shadow-lifted`, padding `p-6 sm:p-8`.
- `ProgressIndicator` at top of card, then title (headline-md, Plus Jakarta) and
  subtitle (body-sm, Manrope).

Props: `{ step: number; totalSteps: number; title: string; subtitle?: string;
children: ReactNode }`.

The doctor `layout.tsx` (currently a centered `rounded-3xl` card) and patient
`layout.tsx` (header + bare body) are both reduced to provider wrappers only; the
shell visuals move into `OnboardingShell`, consumed per-page (each page owns its
step/title/subtitle).

### 2. Shared input style — `src/components/ui/onboarding-input.ts` (or co-located)
Export `onboardingInputClass`:
`rounded` (0.5rem), 1px `border-outline-variant`, focus `border-primary` +
`ring-1 ring-primary`, `px-3.5 py-2.5`, `text-sm`, `font-manrope`,
`placeholder:text-outline`, `aria-[invalid=true]:border-error`.
Align existing `editInputClass` (editable-row.tsx) to the same radius/border tokens.
Continue using the existing shared `FormField` for label/error/hint.

### 3. `OnboardingNav` — `src/components/ui/onboarding-nav.tsx`
Standard nav row. Back (`<Button variant="outline" size="lg">`) left, primary
(`<Button size="lg">`) right, `justify-between`, stacks full-width on mobile.
Props: `{ onBack?: () => void; backHref?: string; submitLabel: string;
loading?: boolean; submitType?: 'submit' | 'button'; onSubmit?: () => void }`.
Used by all step pages. Deletes every inline `rounded-full px-8 py-6` pill (doctor)
and `rounded-2xl h-14` (patient step 6) button.

### 4. `ReviewIdCard` — `src/components/ui/review-id-card.tsx`
Generalize the patient step-6 premium gradient "Digital ID" hero for both flows.
- Gradient header (`from-primary to-primary-container`): avatar with inline photo
  upload button, name, subtitle, status pulse dot, decorative blur orb.
- Body: borderless white, responsive `grid-cols-1 sm:grid-cols-2` of `EditableRow`
  (existing shared component, unchanged).
- Props for the differing bits: `label` slot ("Digital Patient ID" /
  "Verified Provider"), `name`, `subtitle`, `photoUrl`, photo upload
  handler/state, and `children` (the EditableRow grid).
- Doctor review drops the `max-h-[60vh]` scrollbox → natural page scroll.

### 5. Shared error alert
Lift patient step-6's inline error alert + Retry into the review pattern so both
reviews share it (icon + message + Retry button, `error/5` bg, `error/20` border).

## Consuming Pages (edits only — no logic change)

- Patient `1..5` + doctor `1..4`: wrap body in `OnboardingShell`, swap inline
  inputClass for `onboardingInputClass`, replace nav buttons with `OnboardingNav`.
- Patient `6` + doctor `5`: render via `ReviewIdCard`; keep all `EditableRow`
  definitions, validation, photo and submit logic intact.
- Both `layout.tsx`: reduce to provider-only wrappers.

## Mobile & Motion

- All multi-column grids become `grid-cols-1 sm:grid-cols-2` (fixes cramped review
  grids on phones).
- `OnboardingNav` stacks vertically full-width below `sm`.
- Card padding scales `p-6 sm:p-8`.
- Apply existing `fade-in` component on step mount; retain button `active:scale-95`.

## Success Criteria

- Both flows share identical shell, input, button, nav, and review visual language.
- No inline `rounded-full`/`rounded-2xl`/`rounded-xl` input or button classes remain
  in onboarding pages; radii follow DESIGN.md (inputs/buttons 0.5rem, cards 1rem).
- All field wiring, validation, pills, formatters, photo upload, and submit calls
  behave exactly as before.
- Review grids and nav are usable on a 360px-wide viewport.
- `npm run lint` && `npm run build` pass (only the 2 known unrelated warnings).

## Out of Scope (YAGNI)

- Rewiring doctor manual `setErrors` to react-hook-form (functional change).
- New animations/libraries beyond the existing `fade-in`.
- Any backend, dashboard, or non-onboarding page.
