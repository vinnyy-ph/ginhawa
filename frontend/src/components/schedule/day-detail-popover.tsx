"use client"

/**
 * DayDetailPopover — scrollable slot list popover for a calendar day with more than SLOT_LIMIT slots.
 *
 * Triggered by the "+N more" overflow link in MonthView. Renders all slots for
 * the day with time, status badge, and inline Block/Unblock/Delete actions.
 * Booked slots show the patient's name and cannot be edited.
 *
 * Delete requires a two-step confirmation to prevent accidental removal: clicking
 * "Del" first sets a pending confirm state; a second click commits the deletion.
 *
 * @param patientNames - Map of slot ID → patient full name; populated by the page
 *   for BOOKED slots so the doctor can see who is booked without a separate fetch.
 * @param onStatusChange - Lifts slot status changes (AVAILABLE ↔ BLOCKED) to the page.
 * @param onDelete - Lifts slot deletion to the page.
 */

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
                          type="button"
                          onClick={() => { onDelete(slot.id); setConfirmDeleteId(null) }}
                          className="text-[10px] font-bold text-error hover:underline focus-visible:ring-2 focus-visible:ring-primary"
                          aria-label="Confirm delete"
                        >
                          Del
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="text-[10px] text-on-surface-variant hover:underline focus-visible:ring-2 focus-visible:ring-primary"
                          aria-label="Cancel delete"
                        >
                          No
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => onStatusChange(slot.id, isAvailable ? "BLOCKED" : "AVAILABLE")}
                          className="text-[10px] font-semibold text-primary hover:underline focus-visible:ring-2 focus-visible:ring-primary"
                          aria-label={isAvailable ? "Block slot" : "Unblock slot"}
                        >
                          {isAvailable ? "Block" : "Unblock"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(slot.id)}
                          className="text-[10px] text-on-surface-variant hover:text-error hover:underline focus-visible:ring-2 focus-visible:ring-primary"
                          aria-label="Delete slot"
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
