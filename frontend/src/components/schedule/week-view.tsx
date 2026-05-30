"use client"

/**
 * WeekView — time-grid weekly calendar view for the doctor schedule page.
 *
 * Renders a 7-day column grid with a fixed pixel-per-hour scale (HOUR_HEIGHT = 48 px/hr)
 * from 7 AM to 8 PM. Each hour row is wrapped in AddSlotPopover so clicking any
 * empty cell opens the slot creator pre-filled with that day and hour.
 *
 * Slot blocks are positioned absolutely using pixel offsets computed from the slot's
 * PH-local start time (slotTopPx) and duration (slotHeightPx). Slots outside the
 * displayed hour range are silently skipped to prevent overflow.
 *
 * Booked slots display the patient's first name in the block. Past days are non-interactive.
 *
 * @param weekStart - The Sunday (midnight) that begins the displayed 7-day range.
 */

import { useMemo } from "react"
import { cn } from "@/lib/utils"
import { formatPHTime } from "@/lib/datetime"
import { AddSlotPopover } from "./add-slot-popover"
import { SlotDetailPopover } from "./slot-detail-popover"
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

/**
 * Converts an ISO timestamp to a pixel offset from the top of the time grid.
 * Must read the local PH time (not UTC) so slots land on the correct hour row.
 */
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

/** Converts slot duration to pixel height, with a 20 px minimum so very short slots remain visible. */
function slotHeightPx(startTime: string, endTime: string): number {
  const ms = new Date(endTime).getTime() - new Date(startTime).getTime()
  return Math.max((ms / 3600000) * HOUR_HEIGHT, 20)
}

function slotBorderClass(status: string) {
  if (status === "AVAILABLE") return "bg-primary/15 text-primary border-l-2 border-primary"
  if (status === "BOOKED") return "bg-secondary-container/25 text-on-secondary-container border-l-2 border-secondary"
  return "bg-error/10 text-error border-l-2 border-error"
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
