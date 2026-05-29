# Doctor Post-Consult Documentation Collapse — Design

**Date:** 2026-05-29
**Branch:** frontend/onboarding-new-schema
**Status:** Approved

## Problem

A doctor can document a consultation from three overlapping surfaces:

1. **In-call notes** (`consultation/[appointmentId]/page.tsx`) — live notes textarea, auto-saves via `PATCH /consultation/:id/notes`. "End & Finalize" routes to the finalize page.
2. **Finalize** (`doctor/finalize/[appointmentId]/page.tsx`) — on mount `POST /consultation/:id/summarize` (AI generates doctorSummary / patientSummary / prescriptions / followUp); doctor edits 4 fields; "Publish" = `POST /medical-records` + `PATCH /appointments/:id/status COMPLETED`.
3. **Notes** (`doctor/notes/[appointmentId]/page.tsx`) — manual 4-field form → `POST /medical-records` (does **not** set status COMPLETED). Renders read-only if a record already exists.

On a CONFIRMED appointment card the doctor sees **both** "Add Notes" (→notes) and "Mark Complete" (→finalize) side by side. No one knows which is canonical or what publishes to the patient.

### Concrete defects
- Two paths `POST /medical-records` (finalize + notes) → duplicate-record / conflict risk (matches the earlier "finalize conflicts" bug).
- Notes path never sets status COMPLETED, so "Add Notes" then "Mark Complete" double-publishes.
- The only non-redundant job of the notes page is the **read-only record view** (COMPLETED card → "View/Edit Notes"). Its editable form is fully redundant — finalize already covers the manual case via its AI-fail fallback.

## Goal

Collapse to **one canonical post-consult documentation surface**, remove the dual button.

## Decision

Finalize (`/doctor/finalize/[appointmentId]`) becomes the single canonical surface. Fold the notes page's read-only view into it; delete `/doctor/notes`. Published records are **locked read-only** (immutable; no edit/amend).

Route name kept (`/doctor/finalize`) to avoid churn; the page becomes state-aware.

## Design

### Canonical surface: `doctor/finalize/[appointmentId]/page.tsx`

On mount, **fetch existing record before any AI call** (guard):

1. Fetch appointment (for context header) via `GET /appointments/:id`.
2. Check `GET /medical-records/doctor` for a record whose `appointmentId` matches (same lookup the notes page uses).
3. **Record exists** → render **read-only view** (folds in the notes page's view markup). No `summarize` call, no publish controls. Title: "Medical Record".
4. **No record** → `POST /consultation/:id/summarize` (AI prefill) → editable 4 fields → "Publish to Patient Record" = `POST /medical-records` + `PATCH /appointments/:id/status COMPLETED` (unchanged). AI-failure fallback unchanged (empty editable fields + manual publish). Title: "Finalize Consultation".

This guard also removes the duplicate-AI-call risk on revisiting a COMPLETED appointment.

**Context header (new):** lightweight patient name + consultation date + reason for visit, pulled from the appointment fetch. Finalize currently shows no patient context; a doctor viewing a record needs to know whose it is. Mirrors the context card the notes page had.

### Card: `src/components/appointment-card.tsx` (doctor role)

- **CONFIRMED** footer: `Cancel | Join Consultation | Complete & Document` (→ `/doctor/finalize/:id`). Remove the "Add Notes" button.
- **COMPLETED** footer: `View Record` (→ `/doctor/finalize/:id`, read-only). Was "View / Edit Notes" → `/doctor/notes/:id`.

### Deletions

- `src/app/doctor/notes/[appointmentId]/page.tsx` and its now-empty parent directories.
- Grep the codebase for any other links to `/doctor/notes` and repoint to `/doctor/finalize`.

## Out of scope

- No backend changes — reuse existing endpoints (`/appointments/:id`, `/medical-records`, `/medical-records/doctor`, `/consultation/:id/summarize`, `/appointments/:id/status`).
- No record editing / amendments (records immutable once published).
- In-call live-notes flow unchanged.

## Verification

No frontend unit-test infra. Verify with:
- `npx tsc --noEmit`
- `npm run build`
- `npm run lint` (pre-existing errors in `src/app/doctor/patients/[id]/page.tsx` and `src/app/doctor/patients/page.tsx` are unrelated — leave them).

`frontend/AGENTS.md`: this Next.js version differs from training data — read `node_modules/next/dist/docs/` before using any Next API. (This change uses only patterns already present in these files: client components, `use(params)`, `next/navigation`, `next/link`.)
