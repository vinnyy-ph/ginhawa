"use client"

/**
 * AddSlotPopover — inline popover form for creating a single availability slot on the doctor schedule.
 *
 * Used as a click-target wrapper in MonthView (whole day cell) and WeekView (per-hour
 * row). Clicking any open cell opens this popover pre-filled with the selected date
 * and, in WeekView, the clicked hour as the default start time. The end time
 * auto-advances by one hour on open.
 *
 * Validates that end > start before POSTing to /doctors/slots. Calls `onSuccess`
 * so the parent page can refetch the slot list.
 *
 * @param date - YYYY-MM-DD date string for the slot.
 * @param initialHour - 0-23 hour to pre-fill (defaults to 9); set by WeekView per clicked row.
 * @param token - Doctor's auth token for the authenticated API call.
 * @param onSuccess - Callback fired after a slot is successfully created.
 */

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

/** Advances an HH:MM string by one hour, clamped to 23:xx to avoid midnight overflow. */
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
