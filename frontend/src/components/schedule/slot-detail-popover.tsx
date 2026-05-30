"use client"

/**
 * SlotDetailPopover — per-slot action popover for the doctor schedule calendar views.
 *
 * Wraps any slot block element (month or week view) in a Radix Popover that shows
 * the slot's time range, status badge, and action buttons. BOOKED slots show the
 * patient name and a read-only notice. Non-booked slots offer Block/Unblock and
 * Delete — delete requires a two-step confirmation within the same popover.
 *
 * @param patientName - Name of the booked patient, if any; shown only for BOOKED status.
 * @param onStatusChange - Toggles the slot between AVAILABLE and BLOCKED.
 * @param onDelete - Permanently removes the slot; called after inline confirmation.
 */

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
