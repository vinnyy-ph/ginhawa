# Design: Doctor Schedule Calendar
Date: 2026-05-30

## Goal

Replace the current card-grid schedule view with a full calendar UI — month view and week view — so doctors can manage availability the way they think about time. The existing weekly template panel is kept as a power tool for bulk slot generation.

---

## Layout & Navigation

The schedule page has two top-level sections:

**Header bar** (always visible):
- Left: "My Schedule" title + subtitle
- Right: Month/Week toggle (segmented control), "Set recurring schedule" outline button

**Calendar nav row** (below header):
- ‹ › arrows to move prev/next month (or week)
- Current period label: "June 2026" or "Jun 9 – Jun 15, 2026"
- "Today" button to jump back to current period

**View area** — switches between Month and Week based on toggle.

**Recurring schedule panel** — slides down below the header when "Set recurring schedule" is clicked. This is the existing weekly template form, unchanged. Dismiss with "Cancel" in the button.

---

## Month View

A 7-column grid. Rows = weeks. Each cell is one calendar day.

**Day cell:**
- Day number (top-left). Today's number shows as white text on a teal circle.
- Past days: muted opacity, no interactions.
- Other-month days: rendered at 50% opacity, non-interactive.
- Slot blocks (up to 3 visible): small colored pill showing time (e.g. `9:00 AM`) or `9:00 AM · PatientName` for booked.
- If more than 3 slots: `+N more` link — clicking opens a day-detail popover listing all slots.
- Empty future days: subtle `+ add slot` hint text.
- Click empty area of day cell → opens **Add Slot popover** pre-filled with that date.
- Click slot block → opens **Slot Detail popover**.

**Slot block colors:**
- AVAILABLE: `bg-primary/12 text-primary`
- BOOKED: `bg-secondary-container/25 text-on-secondary-container`
- BLOCKED: `bg-surface-container text-on-surface-variant`

---

## Week View

A time-grid showing Mon–Sun (current week) with a vertical time axis.

**Time range displayed:** 7:00 AM – 8:00 PM. Each hour = 48px row height.

**Column headers:** Day abbreviation + date number. Today's date number in teal circle.

**Time axis:** Left column, 56px wide. Hour labels (`9 AM`, `10 AM`) right-aligned.

**Slot blocks:** Positioned absolutely within the column at their actual time.
- Height = proportional to duration (1 hour = 48px, 30 min = 24px).
- Left border accent by status (teal for available, green for booked, grey for blocked).
- Show time range + patient name if booked.
- Click → **Slot Detail popover**.

**Click empty hour cell** → **Add Slot popover** pre-filled with that date and the clicked hour as start time (end time = start + 1 hour).

---

## Popovers

All popovers use Radix UI `Popover` (already used elsewhere in the app). Close on outside click or Escape.

### Add Slot Popover

Triggered by clicking empty day cell (month) or empty hour cell (week).

Contents:
- Title: `Add slot · [Day, Mon D]`
- Start Time field (12h TimeField, pre-filled)
- End Time field (12h TimeField, pre-filled to start + 1h)
- "Add Slot" primary button
- Error message if end ≤ start

On submit: `POST /doctors/slots` with `{ startTime, endTime }` as ISO strings. On success: refresh slots, close popover, show toast.

### Slot Detail Popover

Triggered by clicking any slot block.

Contents:
- Time range: e.g. `9:00 – 10:00 AM`
- Status badge
- If BOOKED: patient name row (`Patient: Maria Santos`), then read-only note "Cannot edit — booking active". No action buttons.
- If AVAILABLE: "Block slot" secondary button + "Delete" danger button.
- If BLOCKED: "Unblock slot" secondary button + "Delete" danger button.

Actions call existing endpoints (`PATCH /doctors/slots/:id` for status, `DELETE /doctors/slots/:id` for delete) with optimistic update + toast.

Delete requires inline confirmation ("Delete this slot?" Yes/No) inside the popover before firing.

### Day Detail Popover (month view overflow)

Triggered by `+N more` link on a day cell.

Contents: full list of all slots for that day, each as a row with time + status badge + action buttons (same as Slot Detail but in list form). No nested popovers — actions fire directly.

---

## Data & State

- Slots fetched once on mount (existing pattern).
- Local state: `view: "month" | "week"`, `viewDate: Date` (which month/week is shown).
- `slotsByDate: Record<string, AvailabilitySlot[]>` — derived from slots array, keyed by `YYYY-MM-DD`.
- After any mutation (add/update/delete) — re-fetch slots from API and update state.

---

## File Structure

| Action | File |
|--------|------|
| **Modify** | `frontend/src/app/doctor/schedule/page.tsx` — remove card grid + old add form; add calendar + state wiring |
| **Create** | `frontend/src/components/schedule/ScheduleCalendar.tsx` — top-level calendar (view toggle, nav, period label) |
| **Create** | `frontend/src/components/schedule/MonthView.tsx` — month grid |
| **Create** | `frontend/src/components/schedule/WeekView.tsx` — week time-grid |
| **Create** | `frontend/src/components/schedule/SlotDetailPopover.tsx` — existing slot actions |
| **Create** | `frontend/src/components/schedule/AddSlotPopover.tsx` — add new slot |
| **Create** | `frontend/src/components/schedule/DayDetailPopover.tsx` — overflow slot list |
| **Keep** | `frontend/src/components/ui/time-field.tsx` — already 12h |
| **Keep** | Weekly template form (existing code in page.tsx, just moved inside the panel toggle) |

`MultiDateCalendar` added earlier is no longer used in the add-slot popover (single date per click now) but can be kept for the recurring template if useful.

---

## Out of Scope

- Drag-and-drop slot creation or resizing.
- Day view (month + week covers the use case).
- Patient details beyond name in the booked slot popover.
- Any backend changes.
