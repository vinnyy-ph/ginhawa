"use client"

import { useState, useMemo } from "react"
import { ChevronLeftIcon, ChevronRightIcon } from "@radix-ui/react-icons"
import { Button } from "@/components/ui/button"
import { MonthView } from "./month-view"
import { WeekView } from "./week-view"
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
            type="button"
            onClick={prev}
            className="p-1.5 rounded-md hover:bg-surface-container text-on-surface-variant transition-colors"
            aria-label="Previous"
          >
            <ChevronLeftIcon className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={next}
            className="p-1.5 rounded-md hover:bg-surface-container text-on-surface-variant transition-colors"
            aria-label="Next"
          >
            <ChevronRightIcon className="w-4 h-4" />
          </button>
          <span className="text-base font-bold text-text-primary ml-1">{periodLabel}</span>
          <button
            type="button"
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
                type="button"
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
          { label: "Blocked", cls: "bg-error/20 border border-error/30" },
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
