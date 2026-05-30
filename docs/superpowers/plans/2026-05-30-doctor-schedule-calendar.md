# Doctor Schedule Calendar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the doctor schedule card-grid with a full month+week calendar where slots appear as colored blocks, clicking empty cells adds slots, and clicking slots shows a detail popover.

**Architecture:** Six new components under `frontend/src/components/schedule/` handle all calendar UI. `page.tsx` retains all API logic and passes data/callbacks down to `ScheduleCalendar`, which orchestrates view switching and the existing recurring template panel. No backend changes.

**Tech Stack:** Next.js 15 App Router, React, Tailwind CSS, Radix UI Popover (already in `src/components/ui/popover.tsx`), `react-aria-components` TimeField (12h, already updated), Ginhawa design tokens.

---

## File Map

| Action | File |
|--------|------|
| **Create** | `frontend/src/components/schedule/AddSlotPopover.tsx` |
| **Create** | `frontend/src/components/schedule/SlotDetailPopover.tsx` |
| **Create** | `frontend/src/components/schedule/DayDetailPopover.tsx` |
| **Create** | `frontend/src/components/schedule/MonthView.tsx` |
| **Create** | `frontend/src/components/schedule/WeekView.tsx` |
| **Create** | `frontend/src/components/schedule/ScheduleCalendar.tsx` |
| **Modify** | `frontend/src/app/doctor/schedule/page.tsx` |

**Key imports available:**
- `Popover, PopoverTrigger, PopoverContent` from `@/components/ui/popover`
- `TimeField` from `@/components/ui/time-field` (already 12h)
- `Badge` from `@/components/ui/badge`
- `Button` from `@/components/ui/button`
- `formatPHTime, formatPHDate` from `@/lib/datetime`
- `localTodayISO` from `@/lib/schemas/onboarding.schemas`
- `apiRequest` from `@/lib/api-client`
- `cn` from `@/lib/utils`
- `AvailabilitySlot, SlotStatus, Appointment` from `@/types/api`
- `ChevronLeftIcon, ChevronRightIcon` from `@radix-ui/react-icons`

---

### Task 1: AddSlotPopover

**Files:**
- Create: `frontend/src/components/schedule/AddSlotPopover.tsx`

- [ ] **Step 1.1: Create the file**

```tsx
"use client"

import { useState } from "react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { TimeField } from "@/components/ui/time-field"
import { apiRequest } from "@/lib/api-client"
import { formatPHDate } from "@/lib/datetime"

interface AddSlotPopoverProps {
  date: string           // YYYY-MM-DD
  initialHour?: number   // 0-23, pre-fills start time (default 9)
  token: string
  onSuccess: () => void
  children: React.ReactNode
}

function padded(n: number) {
  return String(n).padStart(2, "0")
}

function plusOneHour(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number)
  return `${padded(Math.min(h + 1, 23))}:${padded(m)}`
}

export function AddSlotPopover({ date, initialHour = 9, token, onSuccess, children }: AddSlotPopoverProps) {
  const [open, setOpen] = useState(false)
  const [startTime, setStartTime] = useState(`${padded(initialHour)}:00`)
  const [endTime, setEndTime] = useState(plusOneHour(`${padded(initialHour)}:00`))
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  function handleOpenChange(v: boolean) {
    if (v) {
      const s = `${padded(initialHour)}:00`
      setStartTime(s)
      setEndTime(plusOneHour(s))
      setError(null)
    }
    setOpen(v)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const startObj = new Date(`${date}T${startTime}:00`)
    const endObj = new Date(`${date}T${endTime}:00`)
    if (endObj <= startObj) {
      setError("End time must be after start time")
      return
    }
    try {
      setSubmitting(true)
      setError(null)
      await apiRequest("/doctors/slots", {
        method: "POST",
        token,
        body: { startTime: startObj.toISOString(), endTime: endObj.toISOString() },
      })
      setOpen(false)
      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add slot")
    } finally {
      setSubmitting(false)
    }
  }

  const dateLabel = formatPHDate(`${date}T00:00:00`, {
    weekday: "short",
    month: "short",
    day: "numeric",
  })

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-60 p-4" align="start">
        <form onSubmit={handleSubmit} className="space-y-3">
          <p className="text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">
            Add slot · {dateLabel}
          </p>
          <div>
            <label className="block text-xs font-semibold text-text-primary mb-1">Start time</label>
            <TimeField value={startTime} onChange={setStartTime} aria-label="Start time" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-text-primary mb-1">End time</label>
            <TimeField value={endTime} onChange={setEndTime} aria-label="End time" />
          </div>
          {error && <p className="text-error text-xs">{error}</p>}
          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? "Adding..." : "Add Slot"}
          </Button>
        </form>
      </PopoverContent>
    </Popover>
  )
}
```

- [ ] **Step 1.2: Type-check**

```bash
cd /home/vincentdev/vincent-projects/launchpad/telehealth-app/frontend && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 1.3: Commit**

```bash
cd /home/vincentdev/vincent-projects/launchpad/telehealth-app && git add frontend/src/components/schedule/AddSlotPopover.tsx && git commit -m "feat: add AddSlotPopover component for calendar"
```

---

### Task 2: SlotDetailPopover

**Files:**
- Create: `frontend/src/components/schedule/SlotDetailPopover.tsx`

- [ ] **Step 2.1: Create the file**

```tsx
"use client"

import { useState } from "react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { formatPHTime } from "@/lib/datetime"
import type { AvailabilitySlot, SlotStatus } from "@/types/api"

interface SlotDetailPopoverProps {
  slot: AvailabilitySlot
  patientName?: string
  onStatusChange: (id: string, status: SlotStatus) => void
  onDelete: (id: string) => void
  children: React.ReactNode
}

export function SlotDetailPopover({
  slot,
  patientName,
  onStatusChange,
  onDelete,
  children,
}: SlotDetailPopoverProps) {
  const [open, setOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const isBooked = slot.status === "BOOKED"
  const isAvailable = slot.status === "AVAILABLE"
  const timeStr = `${formatPHTime(slot.startTime)} – ${formatPHTime(slot.endTime)}`

  function handleStatusChange() {
    onStatusChange(slot.id, isAvailable ? "BLOCKED" : "AVAILABLE")
    setOpen(false)
  }

  function handleDelete() {
    onDelete(slot.id)
    setOpen(false)
  }

  return (
    <Popover
      open={open}
      onOpenChange={(v) => {
        setOpen(v)
        if (!v) setConfirmDelete(false)
      }}
    >
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-52 p-4" align="start">
        <div className="space-y-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-on-surface-variant mb-1">
              Slot details
            </p>
            <p className="text-base font-bold text-text-primary tabular-nums">{timeStr}</p>
            <Badge
              variant={isBooked ? "info" : isAvailable ? "success" : "secondary"}
              className="mt-1"
            >
              {slot.status}
            </Badge>
          </div>

          {isBooked ? (
            <div className="space-y-1">
              {patientName && (
                <p className="text-sm text-on-surface-variant">
                  Patient:{" "}
                  <span className="font-semibold text-text-primary">{patientName}</span>
                </p>
              )}
              <p className="text-xs text-on-surface-variant italic">
                Cannot edit — booking active
              </p>
            </div>
          ) : confirmDelete ? (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-error">Delete this slot?</p>
              <div className="flex gap-2">
                <button
                  onClick={handleDelete}
                  className="flex-1 py-1.5 rounded-md bg-error text-white text-xs font-semibold hover:bg-error/90 transition-colors"
                >
                  Yes, delete
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="flex-1 py-1.5 rounded-md bg-surface-container text-on-surface-variant text-xs font-semibold hover:bg-surface-variant transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={handleStatusChange}
                className="flex-1 py-1.5 rounded-md bg-surface-container text-on-surface-variant text-xs font-semibold hover:bg-surface-variant transition-colors"
              >
                {isAvailable ? "Block" : "Unblock"}
              </button>
              <button
                onClick={() => setConfirmDelete(true)}
                className="flex-1 py-1.5 rounded-md bg-error/10 text-error text-xs font-semibold hover:bg-error/20 transition-colors"
              >
                Delete
              </button>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
```

- [ ] **Step 2.2: Type-check**

```bash
cd /home/vincentdev/vincent-projects/launchpad/telehealth-app/frontend && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 2.3: Commit**

```bash
cd /home/vincentdev/vincent-projects/launchpad/telehealth-app && git add frontend/src/components/schedule/SlotDetailPopover.tsx && git commit -m "feat: add SlotDetailPopover component for calendar"
```

---

### Task 3: DayDetailPopover

**Files:**
- Create: `frontend/src/components/schedule/DayDetailPopover.tsx`

- [ ] **Step 3.1: Create the file**

```tsx
"use client"

import { useState } from "react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { formatPHTime, formatPHDate } from "@/lib/datetime"
import type { AvailabilitySlot, SlotStatus } from "@/types/api"

interface DayDetailPopoverProps {
  date: string // YYYY-MM-DD
  slots: AvailabilitySlot[]
  patientNames: Record<string, string>
  onStatusChange: (id: string, status: SlotStatus) => void
  onDelete: (id: string) => void
  children: React.ReactNode
}

export function DayDetailPopover({
  date,
  slots,
  patientNames,
  onStatusChange,
  onDelete,
  children,
}: DayDetailPopoverProps) {
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const dateLabel = formatPHDate(`${date}T00:00:00`, {
    weekday: "long",
    month: "long",
    day: "numeric",
  })

  return (
    <Popover>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-72 p-4 max-h-80 overflow-y-auto" align="start">
        <p className="text-[11px] font-bold uppercase tracking-widest text-on-surface-variant mb-3">
          {dateLabel}
        </p>
        <div className="space-y-0">
          {slots.map((slot) => {
            const isBooked = slot.status === "BOOKED"
            const isAvailable = slot.status === "AVAILABLE"
            const timeStr = `${formatPHTime(slot.startTime)} – ${formatPHTime(slot.endTime)}`
            const isConfirming = confirmDeleteId === slot.id

            return (
              <div
                key={slot.id}
                className="flex items-center justify-between gap-2 py-2.5 border-b border-outline-variant/15 last:border-0"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-text-primary tabular-nums">{timeStr}</p>
                  {isBooked && patientNames[slot.id] && (
                    <p className="text-xs text-on-surface-variant truncate">{patientNames[slot.id]}</p>
                  )}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Badge
                    variant={isBooked ? "info" : isAvailable ? "success" : "secondary"}
                    className="text-[10px] px-1.5 py-0"
                  >
                    {slot.status}
                  </Badge>
                  {!isBooked && (
                    isConfirming ? (
                      <>
                        <button
                          onClick={() => { onDelete(slot.id); setConfirmDeleteId(null) }}
                          className="text-[10px] font-bold text-error hover:underline"
                        >
                          Del
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="text-[10px] text-on-surface-variant hover:underline"
                        >
                          No
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => onStatusChange(slot.id, isAvailable ? "BLOCKED" : "AVAILABLE")}
                          className="text-[10px] font-semibold text-primary hover:underline"
                        >
                          {isAvailable ? "Block" : "Unblock"}
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(slot.id)}
                          className="text-[10px] text-on-surface-variant hover:text-error hover:underline"
                        >
                          Del
                        </button>
                      </>
                    )
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </PopoverContent>
    </Popover>
  )
}
```

- [ ] **Step 3.2: Type-check**

```bash
cd /home/vincentdev/vincent-projects/launchpad/telehealth-app/frontend && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 3.3: Commit**

```bash
cd /home/vincentdev/vincent-projects/launchpad/telehealth-app && git add frontend/src/components/schedule/DayDetailPopover.tsx && git commit -m "feat: add DayDetailPopover for calendar overflow slots"
```

---

### Task 4: MonthView

**Files:**
- Create: `frontend/src/components/schedule/MonthView.tsx`

- [ ] **Step 4.1: Create the file**

```tsx
"use client"

import { useMemo } from "react"
import { cn } from "@/lib/utils"
import { formatPHTime } from "@/lib/datetime"
import { AddSlotPopover } from "./AddSlotPopover"
import { SlotDetailPopover } from "./SlotDetailPopover"
import { DayDetailPopover } from "./DayDetailPopover"
import type { AvailabilitySlot, SlotStatus } from "@/types/api"

const DOW = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"] as const
const SLOT_LIMIT = 3

interface MonthViewProps {
  year: number
  month: number // 0-indexed
  slotsByDate: Record<string, AvailabilitySlot[]>
  patientNames: Record<string, string>
  token: string
  onSlotChange: () => void
  onStatusChange: (id: string, status: SlotStatus) => void
  onDelete: (id: string) => void
}

function toISO(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`
}

function slotColorClass(status: string) {
  if (status === "AVAILABLE") return "bg-primary/[0.12] text-primary"
  if (status === "BOOKED") return "bg-secondary-container/25 text-on-secondary-container"
  return "bg-surface-container text-on-surface-variant"
}

const todayISO = new Date().toISOString().slice(0, 10)

export function MonthView({
  year,
  month,
  slotsByDate,
  patientNames,
  token,
  onSlotChange,
  onStatusChange,
  onDelete,
}: MonthViewProps) {
  const cells = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const prevMonthDays = new Date(year, month, 0).getDate()
    const result: { iso: string; isCurrentMonth: boolean }[] = []

    // Trailing days from prev month
    for (let i = firstDay - 1; i >= 0; i--) {
      const d = prevMonthDays - i
      const pm = month === 0 ? 11 : month - 1
      const py = month === 0 ? year - 1 : year
      result.push({ iso: toISO(py, pm, d), isCurrentMonth: false })
    }
    // Current month
    for (let d = 1; d <= daysInMonth; d++) {
      result.push({ iso: toISO(year, month, d), isCurrentMonth: true })
    }
    // Leading days from next month to fill last row
    const rem = result.length % 7
    if (rem !== 0) {
      for (let d = 1; d <= 7 - rem; d++) {
        const nm = month === 11 ? 0 : month + 1
        const ny = month === 11 ? year + 1 : year
        result.push({ iso: toISO(ny, nm, d), isCurrentMonth: false })
      }
    }
    return result
  }, [year, month])

  return (
    <div className="px-4 pb-6">
      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 mb-1">
        {DOW.map((d) => (
          <div key={d} className="text-center text-[11px] font-bold tracking-widest text-on-surface-variant py-2">
            {d}
          </div>
        ))}
      </div>

      {/* Date cells */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map(({ iso, isCurrentMonth }) => {
          const isPast = iso < todayISO
          const isToday = iso === todayISO
          const daySlots = slotsByDate[iso] ?? []
          const visible = daySlots.slice(0, SLOT_LIMIT)
          const overflow = daySlots.length - SLOT_LIMIT
          const dayNum = parseInt(iso.slice(8))
          const interactive = isCurrentMonth && !isPast

          return (
            <AddSlotPopover key={iso} date={iso} token={token} onSuccess={onSlotChange}>
              <div
                className={cn(
                  "min-h-[96px] rounded-lg border p-1.5 transition-colors",
                  !isCurrentMonth && "opacity-40 bg-surface pointer-events-none border-transparent",
                  isCurrentMonth && isPast && "bg-surface border-outline-variant/10 opacity-60 pointer-events-none",
                  isCurrentMonth && !isPast && "bg-surface-white border-outline-variant/20 cursor-pointer hover:border-primary/40 hover:bg-primary/[0.01]",
                  isToday && "border-primary/50",
                )}
              >
                {/* Day number */}
                <div className="mb-1">
                  {isToday ? (
                    <span className="inline-flex w-5 h-5 items-center justify-center rounded-full bg-primary text-white text-[10px] font-bold">
                      {dayNum}
                    </span>
                  ) : (
                    <span className="text-xs font-semibold text-on-surface-variant pl-0.5">{dayNum}</span>
                  )}
                </div>

                {/* Slot blocks */}
                {visible.map((slot) => (
                  <SlotDetailPopover
                    key={slot.id}
                    slot={slot}
                    patientName={patientNames[slot.id]}
                    onStatusChange={onStatusChange}
                    onDelete={onDelete}
                  >
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className={cn(
                        "text-[10px] font-semibold rounded px-1 py-0.5 mb-0.5 truncate cursor-pointer",
                        slotColorClass(slot.status),
                      )}
                    >
                      {formatPHTime(slot.startTime)}
                      {slot.status === "BOOKED" && patientNames[slot.id]
                        ? ` · ${patientNames[slot.id].split(" ")[0]}`
                        : ""}
                    </div>
                  </SlotDetailPopover>
                ))}

                {/* Overflow */}
                {overflow > 0 && (
                  <DayDetailPopover
                    date={iso}
                    slots={daySlots}
                    patientNames={patientNames}
                    onStatusChange={onStatusChange}
                    onDelete={onDelete}
                  >
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="text-[10px] font-bold text-primary cursor-pointer hover:underline"
                    >
                      +{overflow} more
                    </div>
                  </DayDetailPopover>
                )}

                {/* Empty hint */}
                {interactive && daySlots.length === 0 && (
                  <div className="text-[10px] text-outline-variant mt-1 pl-0.5">+ add slot</div>
                )}
              </div>
            </AddSlotPopover>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 4.2: Type-check**

```bash
cd /home/vincentdev/vincent-projects/launchpad/telehealth-app/frontend && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 4.3: Commit**

```bash
cd /home/vincentdev/vincent-projects/launchpad/telehealth-app && git add frontend/src/components/schedule/MonthView.tsx && git commit -m "feat: add MonthView calendar component"
```

---

### Task 5: WeekView

**Files:**
- Create: `frontend/src/components/schedule/WeekView.tsx`

- [ ] **Step 5.1: Create the file**

```tsx
"use client"

import { useMemo } from "react"
import { cn } from "@/lib/utils"
import { formatPHTime } from "@/lib/datetime"
import { AddSlotPopover } from "./AddSlotPopover"
import { SlotDetailPopover } from "./SlotDetailPopover"
import type { AvailabilitySlot, SlotStatus } from "@/types/api"

const DOW_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const
const HOUR_START = 7   // 7 AM
const HOUR_END = 20    // 8 PM (exclusive)
const HOUR_COUNT = HOUR_END - HOUR_START
const HOUR_HEIGHT = 48 // px per hour

interface WeekViewProps {
  weekStart: Date // Sunday of the displayed week
  slotsByDate: Record<string, AvailabilitySlot[]>
  patientNames: Record<string, string>
  token: string
  onSlotChange: () => void
  onStatusChange: (id: string, status: SlotStatus) => void
  onDelete: (id: string) => void
}

function dateToISO(d: Date) {
  return d.toISOString().slice(0, 10)
}

function slotTopPx(startTime: string): number {
  const d = new Date(startTime)
  const phStr = d.toLocaleTimeString("en-PH", {
    timeZone: "Asia/Manila",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
  const [h, m] = phStr.split(":").map(Number)
  return ((h - HOUR_START) + m / 60) * HOUR_HEIGHT
}

function slotHeightPx(startTime: string, endTime: string): number {
  const ms = new Date(endTime).getTime() - new Date(startTime).getTime()
  return Math.max((ms / 3600000) * HOUR_HEIGHT, 20)
}

function slotBorderClass(status: string) {
  if (status === "AVAILABLE") return "bg-primary/15 text-primary border-l-2 border-primary"
  if (status === "BOOKED") return "bg-secondary-container/25 text-on-secondary-container border-l-2 border-secondary"
  return "bg-surface-container text-on-surface-variant border-l-2 border-outline-variant"
}

function formatHour(h: number) {
  if (h === 12) return "12 PM"
  return h < 12 ? `${h} AM` : `${h - 12} PM`
}

const todayISO = new Date().toISOString().slice(0, 10)

export function WeekView({
  weekStart,
  slotsByDate,
  patientNames,
  token,
  onSlotChange,
  onStatusChange,
  onDelete,
}: WeekViewProps) {
  const days = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart)
      d.setDate(d.getDate() + i)
      return { date: d, iso: dateToISO(d) }
    })
  }, [weekStart])

  const hours = Array.from({ length: HOUR_COUNT }, (_, i) => HOUR_START + i)

  return (
    <div className="px-4 pb-6 overflow-x-auto">
      <div className="min-w-[560px]">
        {/* Day column headers */}
        <div className="grid border-b border-outline-variant/20" style={{ gridTemplateColumns: `52px repeat(7, 1fr)` }}>
          <div /> {/* time axis spacer */}
          {days.map(({ date, iso }) => {
            const isToday = iso === todayISO
            return (
              <div key={iso} className="text-center pb-2 pt-1">
                <div className="text-[10px] font-bold tracking-widest text-on-surface-variant uppercase">
                  {DOW_SHORT[date.getDay()]}
                </div>
                {isToday ? (
                  <div className="w-7 h-7 rounded-full bg-primary text-white text-sm font-bold flex items-center justify-center mx-auto mt-0.5">
                    {date.getDate()}
                  </div>
                ) : (
                  <div className="text-lg font-bold text-text-primary leading-tight">{date.getDate()}</div>
                )}
              </div>
            )
          })}
        </div>

        {/* Time grid body */}
        <div className="grid" style={{ gridTemplateColumns: `52px repeat(7, 1fr)` }}>
          {/* Hour labels */}
          <div>
            {hours.map((h) => (
              <div
                key={h}
                className="text-right pr-2 text-[10px] text-on-surface-variant"
                style={{ height: HOUR_HEIGHT, paddingTop: 2 }}
              >
                {formatHour(h)}
              </div>
            ))}
          </div>

          {/* Day columns */}
          {days.map(({ iso }) => {
            const isPast = iso < todayISO
            const isToday = iso === todayISO
            const daySlots = slotsByDate[iso] ?? []

            return (
              <div
                key={iso}
                className={cn(
                  "relative border-l border-outline-variant/10",
                  isToday && "bg-primary/[0.015]"
                )}
                style={{ height: HOUR_COUNT * HOUR_HEIGHT }}
              >
                {/* Hour rows — each is a click target for AddSlotPopover */}
                {hours.map((h) => (
                  <AddSlotPopover key={h} date={iso} initialHour={h} token={token} onSuccess={onSlotChange}>
                    <div
                      className={cn(
                        "absolute left-0 right-0 border-b border-outline-variant/[0.08]",
                        !isPast && "hover:bg-primary/5 cursor-pointer",
                      )}
                      style={{ top: (h - HOUR_START) * HOUR_HEIGHT, height: HOUR_HEIGHT }}
                    />
                  </AddSlotPopover>
                ))}

                {/* Slot blocks */}
                {daySlots.map((slot) => {
                  const top = slotTopPx(slot.startTime)
                  const height = slotHeightPx(slot.startTime, slot.endTime)
                  if (top < 0 || top >= HOUR_COUNT * HOUR_HEIGHT) return null

                  return (
                    <SlotDetailPopover
                      key={slot.id}
                      slot={slot}
                      patientName={patientNames[slot.id]}
                      onStatusChange={onStatusChange}
                      onDelete={onDelete}
                    >
                      <div
                        className={cn(
                          "absolute left-1 right-1 rounded-md px-1.5 py-1 text-[10px] font-semibold cursor-pointer overflow-hidden z-10",
                          slotBorderClass(slot.status),
                        )}
                        style={{ top, height: Math.max(height, 20) }}
                      >
                        <div className="truncate">{formatPHTime(slot.startTime)}</div>
                        {slot.status === "BOOKED" && patientNames[slot.id] && (
                          <div className="truncate opacity-75">
                            {patientNames[slot.id].split(" ")[0]}
                          </div>
                        )}
                      </div>
                    </SlotDetailPopover>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 5.2: Type-check**

```bash
cd /home/vincentdev/vincent-projects/launchpad/telehealth-app/frontend && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 5.3: Commit**

```bash
cd /home/vincentdev/vincent-projects/launchpad/telehealth-app && git add frontend/src/components/schedule/WeekView.tsx && git commit -m "feat: add WeekView time-grid calendar component"
```

---

### Task 6: ScheduleCalendar

**Files:**
- Create: `frontend/src/components/schedule/ScheduleCalendar.tsx`

- [ ] **Step 6.1: Create the file**

```tsx
"use client"

import { useState, useMemo } from "react"
import { ChevronLeftIcon, ChevronRightIcon } from "@radix-ui/react-icons"
import { Button } from "@/components/ui/button"
import { MonthView } from "./MonthView"
import { WeekView } from "./WeekView"
import type { AvailabilitySlot, SlotStatus } from "@/types/api"

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
] as const

interface ScheduleCalendarProps {
  slots: AvailabilitySlot[]
  patientNames: Record<string, string>
  token: string
  onSlotChange: () => void
  onStatusChange: (id: string, status: SlotStatus) => void
  onDelete: (id: string) => void
  recurringPanel: React.ReactNode
}

function getWeekStart(d: Date): Date {
  const start = new Date(d)
  start.setDate(d.getDate() - d.getDay())
  start.setHours(0, 0, 0, 0)
  return start
}

function dateToISO(d: Date) {
  return d.toISOString().slice(0, 10)
}

export function ScheduleCalendar({
  slots,
  patientNames,
  token,
  onSlotChange,
  onStatusChange,
  onDelete,
  recurringPanel,
}: ScheduleCalendarProps) {
  const [view, setView] = useState<"month" | "week">("month")
  const [viewDate, setViewDate] = useState(new Date())
  const [showRecurring, setShowRecurring] = useState(false)

  const slotsByDate = useMemo(() => {
    const groups: Record<string, AvailabilitySlot[]> = {}
    for (const slot of slots) {
      const iso = dateToISO(new Date(slot.startTime))
      if (!groups[iso]) groups[iso] = []
      groups[iso].push(slot)
    }
    return groups
  }, [slots])

  function prev() {
    setViewDate((d) => {
      const next = new Date(d)
      if (view === "month") next.setMonth(d.getMonth() - 1)
      else next.setDate(d.getDate() - 7)
      return next
    })
  }

  function next() {
    setViewDate((d) => {
      const next = new Date(d)
      if (view === "month") next.setMonth(d.getMonth() + 1)
      else next.setDate(d.getDate() + 7)
      return next
    })
  }

  function goToday() {
    setViewDate(new Date())
  }

  const periodLabel = useMemo(() => {
    if (view === "month") {
      return `${MONTH_NAMES[viewDate.getMonth()]} ${viewDate.getFullYear()}`
    }
    const ws = getWeekStart(viewDate)
    const we = new Date(ws)
    we.setDate(ws.getDate() + 6)
    const fmt: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" }
    return `${ws.toLocaleDateString("en-PH", fmt)} – ${we.toLocaleDateString("en-PH", { ...fmt, year: "numeric" })}`
  }, [view, viewDate])

  const weekStart = useMemo(() => getWeekStart(viewDate), [viewDate])

  return (
    <div className="bg-surface-white rounded-xl shadow-soft border border-outline-variant/30 overflow-hidden">
      {/* Calendar header */}
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-outline-variant/20 flex-wrap gap-y-2">
        {/* Nav */}
        <div className="flex items-center gap-1">
          <button
            onClick={prev}
            className="p-1.5 rounded-md hover:bg-surface-container text-on-surface-variant transition-colors"
            aria-label="Previous"
          >
            <ChevronLeftIcon className="w-4 h-4" />
          </button>
          <button
            onClick={next}
            className="p-1.5 rounded-md hover:bg-surface-container text-on-surface-variant transition-colors"
            aria-label="Next"
          >
            <ChevronRightIcon className="w-4 h-4" />
          </button>
          <span className="text-base font-bold text-text-primary ml-1">{periodLabel}</span>
          <button
            onClick={goToday}
            className="ml-2 px-2.5 py-1 text-xs font-semibold rounded-md border border-outline-variant/50 text-on-surface-variant hover:bg-surface-container transition-colors"
          >
            Today
          </button>
        </div>

        {/* View toggle + recurring button */}
        <div className="flex items-center gap-2">
          <div className="flex bg-surface-container rounded-lg p-0.5">
            {(["month", "week"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold capitalize transition-colors ${
                  view === v
                    ? "bg-surface-white text-primary shadow-sm"
                    : "text-on-surface-variant hover:text-text-primary"
                }`}
              >
                {v}
              </button>
            ))}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowRecurring((v) => !v)}
            className="text-xs border-primary/40 text-primary hover:bg-primary/5"
          >
            {showRecurring ? "Hide schedule" : "⟳ Set recurring"}
          </Button>
        </div>
      </div>

      {/* Recurring template panel */}
      {showRecurring && (
        <div className="border-b border-outline-variant/20 animate-in slide-in-from-top-2 fade-in duration-200">
          {recurringPanel}
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-4 px-4 py-2 border-b border-outline-variant/10">
        {[
          { label: "Available", cls: "bg-primary/20" },
          { label: "Booked", cls: "bg-secondary-container/40" },
          { label: "Blocked", cls: "bg-surface-container border border-outline-variant/30" },
        ].map(({ label, cls }) => (
          <div key={label} className="flex items-center gap-1.5">
            <div className={`w-2.5 h-2.5 rounded-sm ${cls}`} />
            <span className="text-xs text-on-surface-variant">{label}</span>
          </div>
        ))}
      </div>

      {/* View content */}
      <div className="pt-3">
        {view === "month" ? (
          <MonthView
            year={viewDate.getFullYear()}
            month={viewDate.getMonth()}
            slotsByDate={slotsByDate}
            patientNames={patientNames}
            token={token}
            onSlotChange={onSlotChange}
            onStatusChange={onStatusChange}
            onDelete={onDelete}
          />
        ) : (
          <WeekView
            weekStart={weekStart}
            slotsByDate={slotsByDate}
            patientNames={patientNames}
            token={token}
            onSlotChange={onSlotChange}
            onStatusChange={onStatusChange}
            onDelete={onDelete}
          />
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 6.2: Type-check**

```bash
cd /home/vincentdev/vincent-projects/launchpad/telehealth-app/frontend && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 6.3: Commit**

```bash
cd /home/vincentdev/vincent-projects/launchpad/telehealth-app && git add frontend/src/components/schedule/ScheduleCalendar.tsx && git commit -m "feat: add ScheduleCalendar orchestration component"
```

---

### Task 7: Rewire page.tsx

**Files:**
- Modify: `frontend/src/app/doctor/schedule/page.tsx`

Replace the entire file with the following. This preserves all existing API logic (fetchSlots, handleUpdateStatus, handleDeleteSlot, weekly template handlers) and adds patient name fetching. The old card-grid UI and old add-slot form are removed; `ScheduleCalendar` receives everything it needs.

- [ ] **Step 7.1: Read the current file first**

```bash
cat /home/vincentdev/vincent-projects/launchpad/telehealth-app/frontend/src/app/doctor/schedule/page.tsx | head -5
```

Then replace the file entirely:

- [ ] **Step 7.2: Write the new page.tsx**

```tsx
"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { apiRequest, ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { DatePicker } from "@/components/ui/date-picker";
import { TimeField } from "@/components/ui/time-field";
import { localTodayISO } from "@/lib/schemas/onboarding.schemas";
import { ClockIcon, CheckCircledIcon } from "@radix-ui/react-icons";
import { Chip } from "@/components/ui/chip";
import { generateSlots, type WeeklyTemplate } from "@/lib/generate-slots";
import { ScheduleCalendar } from "@/components/schedule/ScheduleCalendar";
import type { AvailabilitySlot, DoctorProfile, SlotStatus, Appointment } from "@/types/api";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const MAX_BULK_SLOTS = 1000;

export default function DoctorSchedulePage() {
  const { data: session } = useSession();
  const token = session?.user?.accessToken;
  const router = useRouter();

  const [profile, setProfile] = useState<DoctorProfile | null>(null);
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [patientNames, setPatientNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Weekly template state
  const [tplWeekdays, setTplWeekdays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [tplStartDate, setTplStartDate] = useState("");
  const [tplWeeks, setTplWeeks] = useState(4);
  const [tplDayStart, setTplDayStart] = useState("09:00");
  const [tplDayEnd, setTplDayEnd] = useState("17:00");
  const [tplSlotMinutes, setTplSlotMinutes] = useState(60);
  const [tplBreakOn, setTplBreakOn] = useState(false);
  const [tplBreakStart, setTplBreakStart] = useState("12:00");
  const [tplBreakEnd, setTplBreakEnd] = useState("13:00");
  const [tplSubmitting, setTplSubmitting] = useState(false);
  const [tplError, setTplError] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      if (!token) return;
      try {
        setLoading(true);
        const profileData = await apiRequest<DoctorProfile>("/doctors/profile", { token });
        setProfile(profileData);
        if (profileData?.id) {
          await fetchSlots(profileData.id);
        }
        // Fetch appointments to build slotId → patientName map
        try {
          const appts = await apiRequest<Appointment[]>("/appointments/doctor", { token });
          const names: Record<string, string> = {};
          for (const appt of appts) {
            if (appt.slotId && appt.patient?.fullName) {
              names[appt.slotId] = appt.patient.fullName;
            }
          }
          setPatientNames(names);
        } catch {
          // Graceful degradation: patient names won't show in booked slots
        }
      } catch (err) {
        console.error(err);
        if (err instanceof ApiError && err.status === 404) {
          router.replace("/onboarding/doctor");
          return;
        }
        setError("Failed to load your schedule.");
      } finally {
        setLoading(false);
      }
    }
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  async function fetchSlots(doctorId: string) {
    const data = await apiRequest<AvailabilitySlot[]>(`/doctors/${doctorId}/slots`);
    data.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
    setSlots(data);
  }

  async function handleUpdateStatus(id: string, status: SlotStatus) {
    if (!token || !profile) return;
    try {
      setUpdatingId(id);
      setSlots((prev) => prev.map((s) => (s.id === id ? { ...s, status } : s)));
      await apiRequest(`/doctors/slots/${id}`, {
        method: "PATCH",
        token,
        body: { status },
      });
      setToastMessage(`Slot marked as ${status.toLowerCase()}`);
    } catch (err) {
      console.error(err);
      setToastMessage("Failed to update slot. Changes reverted.");
      await fetchSlots(profile.id);
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleDeleteSlot(id: string) {
    if (!token || !profile) return;
    try {
      setUpdatingId(id);
      await apiRequest(`/doctors/slots/${id}`, { method: "DELETE", token });
      setSlots((prev) => prev.filter((s) => s.id !== id));
      setToastMessage("Slot deleted");
    } catch (err) {
      console.error(err);
      setToastMessage("Failed to delete slot. Please try again.");
      await fetchSlots(profile.id);
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleSlotChange() {
    if (!profile) return;
    await fetchSlots(profile.id);
    setToastMessage("Slot added");
  }

  const template: WeeklyTemplate = useMemo(
    () => ({
      weekdays: tplWeekdays,
      startDate: tplStartDate,
      weeks: tplWeeks,
      dayStart: tplDayStart,
      dayEnd: tplDayEnd,
      slotMinutes: tplSlotMinutes,
      breakWindow: tplBreakOn ? { start: tplBreakStart, end: tplBreakEnd } : null,
    }),
    [tplWeekdays, tplStartDate, tplWeeks, tplDayStart, tplDayEnd, tplSlotMinutes, tplBreakOn, tplBreakStart, tplBreakEnd],
  );

  const previewSlots = useMemo(
    () => (tplStartDate ? generateSlots(template) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [template],
  );

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !profile) return;
    setTplError(null);
    if (tplDayEnd <= tplDayStart) { setTplError("Day end time must be after start time"); return; }
    if (tplBreakOn && tplBreakEnd <= tplBreakStart) { setTplError("Break end time must be after break start time"); return; }
    if (previewSlots.length === 0) { setTplError("This template generates no slots. Check your inputs."); return; }
    if (previewSlots.length > MAX_BULK_SLOTS) { setTplError(`Too many slots (${previewSlots.length}). Max ${MAX_BULK_SLOTS}.`); return; }
    try {
      setTplSubmitting(true);
      const result = await apiRequest<{ created: number; skipped: number }>(
        "/doctors/slots/bulk",
        { method: "POST", token, body: { slots: previewSlots } },
      );
      const msg = result.skipped > 0
        ? `${result.created} slots added, ${result.skipped} skipped`
        : `${result.created} slots added`;
      setToastMessage(msg);
      await fetchSlots(profile.id);
    } catch (err) {
      setTplError(err instanceof Error ? err.message : "Failed to generate slots");
    } finally {
      setTplSubmitting(false);
    }
  }

  function toggleWeekday(d: number) {
    setTplWeekdays((prev) => prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]);
  }

  // The weekly template form is passed as a render prop so ScheduleCalendar can
  // show/hide it without owning any of the template state.
  const recurringPanel = (
    <form onSubmit={handleGenerate} className="p-6 space-y-6">
      <div>
        <label className="block text-sm font-semibold text-text-primary mb-2">Days of week</label>
        <div className="flex flex-wrap gap-2">
          {WEEKDAY_LABELS.map((label, d) => (
            <Chip key={d} selected={tplWeekdays.includes(d)} onClick={() => toggleWeekday(d)}>
              {label}
            </Chip>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-semibold text-text-primary mb-1">Day start</label>
          <TimeField value={tplDayStart} onChange={setTplDayStart} aria-label="Day start time" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-text-primary mb-1">Day end</label>
          <TimeField value={tplDayEnd} onChange={setTplDayEnd} aria-label="Day end time" />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-semibold text-text-primary mb-1">Slot length</label>
          <select
            value={tplSlotMinutes}
            onChange={(e) => setTplSlotMinutes(Number(e.target.value))}
            className="w-full h-11 px-3 rounded-lg border border-outline-variant bg-surface-white text-text-primary"
          >
            <option value={30}>30 minutes</option>
            <option value={60}>60 minutes</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-semibold text-text-primary mb-1">Repeat for (weeks)</label>
          <input
            type="number"
            min={1}
            max={12}
            value={tplWeeks}
            onChange={(e) => setTplWeeks(Math.min(12, Math.max(1, Number(e.target.value))))}
            className="w-full h-11 px-3 rounded-lg border border-outline-variant bg-surface-white text-text-primary"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-semibold text-text-primary mb-1">Start date</label>
        <DatePicker value={tplStartDate} onChange={setTplStartDate} minDate={localTodayISO()} />
      </div>
      <div>
        <label className="flex items-center gap-2 text-sm font-semibold text-text-primary mb-2">
          <input type="checkbox" checked={tplBreakOn} onChange={(e) => setTplBreakOn(e.target.checked)} />
          Add a daily break (skipped)
        </label>
        {tplBreakOn && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-medium text-on-surface-variant mb-1">Break start</label>
              <TimeField value={tplBreakStart} onChange={setTplBreakStart} aria-label="Break start time" />
            </div>
            <div>
              <label className="block text-xs font-medium text-on-surface-variant mb-1">Break end</label>
              <TimeField value={tplBreakEnd} onChange={setTplBreakEnd} aria-label="Break end time" />
            </div>
          </div>
        )}
      </div>
      <div className="flex items-center justify-between gap-4 pt-2 border-t border-outline-variant/30">
        <p className="text-sm text-on-surface-variant">
          {tplStartDate
            ? <><span className="font-semibold text-text-primary">{previewSlots.length}</span> slots will be created.</>
            : "Pick a start date to preview."}
        </p>
        <Button
          type="submit"
          disabled={tplSubmitting || previewSlots.length === 0 || previewSlots.length > MAX_BULK_SLOTS}
          className="min-w-[140px]"
        >
          {tplSubmitting ? "Generating..." : "Generate slots"}
        </Button>
      </div>
      {tplError && <p className="text-error text-sm">{tplError}</p>}
    </form>
  );

  return (
    <DashboardLayout role="doctor">
      <div className="animate-in fade-in duration-500 relative">
        {/* Toast */}
        {toastMessage && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-top-4 fade-in duration-300">
            <div className="bg-success text-white px-6 py-3 rounded-lg shadow-lifted flex items-center gap-3">
              <CheckCircledIcon className="w-5 h-5" />
              <span className="font-medium">{toastMessage}</span>
            </div>
          </div>
        )}

        {/* Page header */}
        <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold font-serif text-text-primary mb-2">My Schedule</h1>
            <p className="text-on-surface-variant font-sans">
              Manage your availability slots for patient bookings.
            </p>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="py-20 flex justify-center">
            <Spinner size="lg" />
          </div>
        ) : error ? (
          <div className="bg-red-50 text-error p-6 rounded-lg border border-red-100 text-center">
            {error}
          </div>
        ) : (
          <ScheduleCalendar
            slots={slots}
            patientNames={patientNames}
            token={token ?? ""}
            onSlotChange={handleSlotChange}
            onStatusChange={handleUpdateStatus}
            onDelete={handleDeleteSlot}
            recurringPanel={recurringPanel}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
```

- [ ] **Step 7.3: Type-check**

```bash
cd /home/vincentdev/vincent-projects/launchpad/telehealth-app/frontend && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors. If `Appointment` import is missing from `@/types/api`, check `frontend/src/types/api.ts` — the type is defined there as `interface Appointment { slotId: string; patient?: PatientSummary; ... }`.

- [ ] **Step 7.4: Commit**

```bash
cd /home/vincentdev/vincent-projects/launchpad/telehealth-app && git add frontend/src/app/doctor/schedule/page.tsx && git commit -m "feat: wire schedule page to ScheduleCalendar, remove old card grid"
```

---

### Task 8: Final verification + cleanup

**Files:** (no code changes)

- [ ] **Step 8.1: Lint check**

```bash
cd /home/vincentdev/vincent-projects/launchpad/telehealth-app/frontend && npm run lint 2>&1 | tail -20
```

Expected: no new errors (pre-existing errors in other files are OK — don't fix them).

- [ ] **Step 8.2: Build check**

```bash
cd /home/vincentdev/vincent-projects/launchpad/telehealth-app/frontend && npm run build 2>&1 | tail -30
```

Expected: build completes with no errors.

- [ ] **Step 8.3: Visual check — navigate to schedule page**

Start dev server if not running:
```bash
cd /home/vincentdev/vincent-projects/launchpad/telehealth-app/frontend && npm run dev
```

Navigate to `http://localhost:3000/doctor/schedule` and verify:
- Month view renders with day grid
- Week view renders when toggled
- "Today" button returns to current period
- "⟳ Set recurring" toggles the template form
- Clicking an empty future day opens AddSlotPopover with correct date pre-filled
- Clicking an existing slot opens SlotDetailPopover with time, status, and actions

- [ ] **Step 8.4: Delete spec and plan, then commit**

```bash
rm /home/vincentdev/vincent-projects/launchpad/telehealth-app/docs/superpowers/specs/2026-05-30-doctor-schedule-calendar-design.md
rm /home/vincentdev/vincent-projects/launchpad/telehealth-app/docs/superpowers/plans/2026-05-30-doctor-schedule-calendar.md
cd /home/vincentdev/vincent-projects/launchpad/telehealth-app && git add -A && git commit -m "chore: delete doctor schedule calendar spec and plan (implementation complete)"
```
