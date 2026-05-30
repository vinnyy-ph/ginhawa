"use client"

import { useMemo } from "react"
import { cn } from "@/lib/utils"
import { formatPHTime } from "@/lib/datetime"
import { AddSlotPopover } from "./add-slot-popover"
import { SlotDetailPopover } from "./slot-detail-popover"
import { DayDetailPopover } from "./day-detail-popover"
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
