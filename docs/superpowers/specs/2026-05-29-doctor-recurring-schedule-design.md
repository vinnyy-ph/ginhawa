# Doctor Recurring Weekly Schedule — Design

**Date:** 2026-05-29
**Branch:** frontend/onboarding-new-schema
**Status:** Approved, ready for implementation plan

## Problem

`doctor/schedule/page.tsx` adds availability one slot at a time: pick Date + Start + End → "Add Slot" → repeat. A doctor opening Mon–Fri for a month hand-enters dozens of slots. This is the doctor's onboarding-to-value step and it is manual data entry — the biggest doctor-side UX hole.

## Goal

Let a doctor define a **weekly template** (weekdays + daily time range + slot length + optional break + horizon in weeks) and generate every bookable slot in one submit. Keep the existing single-add form for one-off slots.

## Decisions (from brainstorming)

| Dimension | Decision |
|-----------|----------|
| Recurrence model | Weekly template: weekdays + daily range + slot length + horizon |
| Range → slots | Fixed slot length + optional single break window (skipped) |
| Horizon | Number of weeks, 1–12 (capped) |
| Existing-slot conflicts | Skip + report summary (idempotent), never reject whole batch |
| TZ / generation site | **Frontend** generates concrete ISO slot pairs; backend is a thin batch-insert |

### Why frontend generates the slots

The current single-add already builds instants on the FE via `new Date(\`${date}T${time}:00\`).toISOString()`, so the FE owns the Asia/Manila → UTC conversion. If the backend generated slots from `"HH:mm"` strings it would have to assume a server timezone — a correctness risk. Keeping the time math on the FE matches the existing pattern and leaves the backend as a dumb, transactional batch insert.

## Backend

### Endpoint
- `POST /doctors/slots/bulk`, `@Roles('DOCTOR')`, added to existing `SlotsController` (`backend/src/slots/slots.controller.ts`).
- Single-add `POST /doctors/slots` unchanged.

### DTO
New `backend/src/slots/dto/create-bulk-slots.dto.ts`:
```ts
class SlotInput {
  @IsDateString() startTime: string;
  @IsDateString() endTime: string;
}
class CreateBulkSlotsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(1000)
  @ValidateNested({ each: true })
  @Type(() => SlotInput)
  slots: SlotInput[];
}
```

### Service — `SlotsService.createBulk(userId, slots)`
1. Resolve doctor profile by `userId` (reuse existing pattern; `NotFoundException` if absent).
2. Load doctor's existing slots once over the candidate window `[min(start), max(end)]`.
3. For each candidate, in order:
   - drop if `start >= end` (skip, count as skipped)
   - drop if it overlaps an existing slot (`existingStart < candEnd && existingEnd > candStart`)
   - drop if it overlaps an already-accepted candidate in this batch
   - else accept
4. `prisma.$transaction` → `availabilitySlot.createMany` for accepted survivors.
5. Return `{ created: number, skipped: number }`.

Overlap-skip makes the call **idempotent**: re-running or extending the horizon later only adds the gaps.

### Module
`SlotsController`/`SlotsService` already registered in `slots.module.ts` — no wiring change.

## Frontend

### UI — `doctor/schedule/page.tsx`
Add a second collapsible panel beside the existing "Add Availability Slot": **"Set weekly schedule"**.

Inputs:
- Weekday multi-select — Mon–Sun chips (reuse existing Chip pattern).
- Start time / End time — `TimeField`.
- Slot length — select (30 / 60 min).
- Optional break — toggle → break start / break end `TimeField`s; slots inside the break window are skipped.
- Start date — `DatePicker`, `minDate={localTodayISO()}`.
- Weeks — stepper, 1–12.

A **live preview count** ("~42 slots") renders before submit so the doctor sees the scale.

### Generation helper — pure function
`generateSlots(template): { startTime: string; endTime: string }[]`
- For `week` in `0..weeks-1`, for each selected weekday → resolve that calendar date relative to start date.
- Step `dayStart → dayEnd` by `slotLen`; emit `[t, t+slotLen)` unless:
  - the slot falls (wholly or partially) within the break window, or
  - the slot is in the past (`< now`).
- A trailing partial slot (range not divisible by `slotLen`) is dropped.
- Build ISO via local `Date` exactly like the current single-add.

### Submit flow
`generateSlots` → `POST /doctors/slots/bulk` with `{ slots }` → toast `"42 slots added, 3 skipped"` (omit "skipped" when 0) → `fetchSlots(profile.id)` to refresh the grid. Submit disabled when generated count is 0.

### Unchanged
Single-add form, slot grid grouping, optimistic block/unblock toggle, delete confirm.

## Validation / edge cases

| Case | Handling |
|------|----------|
| No weekdays selected | Submit disabled |
| End ≤ start (daily range) | Inline error, submit disabled |
| Break outside daily range | Inline error |
| Range not divisible by slot length | Trailing partial slot dropped |
| All slots in the past | Generated count 0 → submit disabled |
| Conflicts with existing slots | Backend skips, summary reports count |
| Batch > 1000 | DTO rejects (4xx); 12 wks × selected days stays well under |

## Testing

**Backend** — `slots.service.spec.ts`:
- bulk skips slots overlapping existing slots
- bulk dedupes overlapping candidates within the same batch
- enforces doctor ownership / profile resolution
- inserts survivors and returns correct `{ created, skipped }`
- controller role guard (`@Roles('DOCTOR')`)

**Frontend** — `generateSlots` unit tests:
- weekday-to-date math across multiple weeks
- break-window exclusion
- past-slot skip
- trailing partial-slot drop
- week count bounds

## Out of scope

- Doctor signup → `/onboarding/doctor` redirect (separate 1-line fix).
- Notification deep-links (separate spec; requires `Notification` schema migration).
- Soft patient profile gate.
- "Copy last week" / drag-to-edit calendar (future).
