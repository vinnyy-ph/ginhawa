"use client";

import React, { useMemo, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Cross2Icon } from "@radix-ui/react-icons";
import { apiRequest } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { BookingCalendar, phDateKey } from "@/components/booking/booking-calendar";
import { formatPHTime } from "@/lib/datetime";
import { cn } from "@/lib/utils";
import type { Appointment, AvailabilitySlot } from "@/types/api";

interface RescheduleDialogProps {
  appointment: Appointment;
  token?: string;
  onRescheduled: () => void;
  trigger: React.ReactNode;
}

export function RescheduleDialog({
  appointment,
  token,
  onRescheduled,
  trigger,
}: RescheduleDialogProps) {
  const [open, setOpen] = useState(false);
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<AvailabilitySlot | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const slotsForDay = useMemo(() => {
    if (!selectedDateKey) return [];
    return slots
      .filter((s) => phDateKey(s.startTime) === selectedDateKey)
      .sort(
        (a, b) =>
          new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
      );
  }, [slots, selectedDateKey]);

  async function loadSlots() {
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest<AvailabilitySlot[]>(
        `/doctors/${appointment.doctorId}/slots`,
      );
      const now = Date.now();
      setSlots(
        data
          .filter(
            (s) => s.status === "AVAILABLE" && new Date(s.startTime).getTime() > now,
          )
          .sort(
            (a, b) =>
              new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
          ),
      );
    } catch {
      setError("Could not load available slots.");
    } finally {
      setLoading(false);
    }
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      setSelectedDateKey(null);
      setSelectedSlot(null);
      setError(null);
      loadSlots();
    }
  }

  function handleSelectDate(dateKey: string) {
    setSelectedDateKey(dateKey);
    setSelectedSlot(null);
  }

  async function handleConfirm() {
    if (!selectedSlot || !token) return;
    setSubmitting(true);
    setError(null);
    try {
      await apiRequest(`/appointments/${appointment.id}/reschedule`, {
        method: "POST",
        token,
        body: { newSlotId: selectedSlot.id },
      });
      setOpen(false);
      onRescheduled();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to reschedule.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 animate-in fade-in" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[90vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-surface-white p-6 shadow-lifted animate-in fade-in zoom-in-95 focus:outline-none max-h-[90vh] overflow-y-auto">
          <div className="mb-4 flex items-center justify-between">
            <Dialog.Title className="font-serif text-lg font-bold text-text-primary">
              Reschedule Appointment
            </Dialog.Title>
            <Dialog.Close className="rounded-full p-1 text-on-surface-variant hover:bg-surface-container hover:text-primary">
              <Cross2Icon className="h-4 w-4" />
            </Dialog.Close>
          </div>
          <Dialog.Description className="mb-4 text-sm text-on-surface-variant">
            Pick a new available slot. Your appointment will be sent back to the
            doctor to confirm.
          </Dialog.Description>

          {loading ? (
            <div className="flex justify-center py-10">
              <Spinner size="lg" />
            </div>
          ) : (
            <>
              <BookingCalendar
                slots={slots}
                selectedDateKey={selectedDateKey}
                onSelectDate={handleSelectDate}
              />

              {selectedDateKey && (
                <div className="mt-4">
                  <h4 className="text-xs font-semibold text-text-primary mb-3 uppercase tracking-wider">
                    Available Times
                  </h4>
                  {slotsForDay.length === 0 ? (
                    <p className="text-sm text-on-surface-variant">
                      No times left for this day.
                    </p>
                  ) : (
                    <div className="grid grid-cols-3 gap-2">
                      {slotsForDay.map((slot) => {
                        const isSelected = selectedSlot?.id === slot.id;
                        return (
                          <button
                            type="button"
                            key={slot.id}
                            onClick={() => setSelectedSlot(slot)}
                            className={cn(
                              "py-2 px-1 text-xs font-medium rounded-md transition-all border text-center",
                              isSelected
                                ? "bg-primary text-white border-primary shadow-sm"
                                : "bg-surface hover:border-primary/50 text-on-surface-variant border-outline-variant hover:text-primary"
                            )}
                          >
                            {formatPHTime(slot.startTime)}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {error && <p className="mt-3 text-xs text-error">{error}</p>}
              <Button
                className="mt-4 w-full"
                disabled={!selectedSlot || submitting}
                onClick={handleConfirm}
              >
                {submitting ? "Rescheduling…" : "Confirm New Time"}
              </Button>
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
