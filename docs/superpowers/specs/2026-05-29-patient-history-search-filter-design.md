# Patient History Search & Filter — Design

**Date:** 2026-05-29
**Branch:** frontend/onboarding-new-schema
**Status:** Approved, pending implementation plan

## Problem

The doctor "Patients" feature currently offers:

- Roster list (`/doctor/patients`): search by patient **name only**.
- Detail timeline (`/doctor/patients/[id]`): full appointment + consultation history, **no filtering**.

Doctors need to find patients and visits by clinical content, not just name. Example: typing `distressed` should surface any patient whose consultation/appointment history contains that word, and on a single patient's page should narrow the timeline to matching visits.

## Goals

1. Roster search matches **patient name OR any keyword in that patient's consultation/appointment history**.
2. When a patient surfaces by history match (name miss), the card shows **why** (snippet with the keyword highlighted).
3. Detail timeline gains a **status filter** (chips with counts) and a **text search** over visit content.

## Non-Goals

- Date-range filter, sort toggle (explicitly deferred).
- Server-side search endpoint / debounced fetch (rejected in favor of client-side filtering).
- Doctor-authored notes / write capabilities.
- Export / print.

## Architecture Decision

**Client-side `searchText` blob.** The roster endpoint precomputes a per-patient `searchText` string; the frontend filters instantly over name + searchText. No new endpoint, no debounce, consistent with the existing client-side name filter. Privacy is fine — the doctor is already authorized to view this data on the detail page.

## Surface 1 — Roster list

### Backend: `appointments.service.ts` → `findPatientsForDoctor`

- Extend the appointment query include with `medicalRecord: { include: { prescriptions: true } }`. (`reasonForVisit` is already returned — the query uses `include`, so all appointment scalars are present.)
- Per patient row, accumulate an **original-case** `searchText` from, in order:
  - `appt.reasonForVisit`
  - `medicalRecord.notes`, `.recommendations`, `.followUpAdvice`, `.prescription`
  - each prescription's `drugName`, `dosage`, `frequency`, `instructions`
- Join non-empty parts with `" · "`. Accumulate across all of the patient's appointments into one string.

### Type: `frontend/src/types/api.ts`

- Add `searchText: string` to `DoctorPatientSummary`.

### Frontend: `frontend/src/app/doctor/patients/page.tsx`

- Filter predicate: `name.toLowerCase().includes(q) || searchText.toLowerCase().includes(q)`.
- **Match snippet:** when a row matches by `searchText` but **not** by name, compute a snippet — find the keyword index in lowercased `searchText`, slice ~40 chars of context from the original-case string, ellipsize both ends as needed, and **bold** the matched keyword. Render as a small line on the card: `Matched: "…patient appeared **distressed**, advised…"`.
- Update search input placeholder → `Search by name or consultation keyword…`.
- Update empty-state copy to reflect keyword search (e.g. "Try a different name or keyword.").
- Snippet/highlight helper stays local to this page.

## Surface 2 — Detail timeline

All client-side over the already-loaded `data.appointments`. No backend or type change.

### Frontend: `frontend/src/app/doctor/patients/[id]/page.tsx`

- **Status filter chips:** derive the set of statuses present in `appointments` with per-status counts. Render a chip row: `All N`, then one chip per present status (`Completed 5`, etc.). Active chip filled, others outline; reuse existing `Badge`/status styling. Selecting a chip filters the timeline; default `All`.
- **Text search:** input box; filter each appointment by matching `q` against `reasonForVisit` + medical-record text (`notes`, `recommendations`, `followUpAdvice`, `prescription`) + each Rx (`drugName`, `dosage`, `frequency`, `instructions`).
- Status filter and text search **compose** (both applied).
- Header count shows `showing X of Y` when a filter is active.
- Distinct empty state when filters yield no matches (separate from "No appointments yet").

## Files Touched

| File | Change |
|------|--------|
| `backend/src/appointments/appointments.service.ts` | `findPatientsForDoctor`: add medicalRecord include + build `searchText` |
| `frontend/src/types/api.ts` | add `searchText: string` to `DoctorPatientSummary` |
| `frontend/src/app/doctor/patients/page.tsx` | name-or-keyword filter + match snippet/highlight |
| `frontend/src/app/doctor/patients/[id]/page.tsx` | status chips + text search over timeline |

## Testing

- Backend: unit test `findPatientsForDoctor` builds `searchText` from reason + record + Rx, and that a keyword present only in a consultation note is contained in the row's `searchText`.
- Frontend: manual smoke — roster keyword search surfaces a name-mismatched patient with a correct highlighted snippet; detail status chips + text search compose and show correct counts / empty state.

## Risks

- Payload size grows with consultation text volume. Acceptable at MVP scale; revisit with a server-side `?q=` endpoint if rosters/histories get large.
