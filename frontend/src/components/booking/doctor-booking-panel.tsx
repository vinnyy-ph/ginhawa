"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { apiRequest } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { CheckCircledIcon } from "@radix-ui/react-icons";
import { SlotPicker } from "@/components/booking/slot-picker";
import type { AvailabilitySlot } from "@/types/api";

export function DoctorBookingPanel({ slots }: { slots: AvailabilitySlot[] }) {
  const router = useRouter();
  const { data: session } = useSession();

  const [selectedSlot, setSelectedSlot] = useState<AvailabilitySlot | null>(null);
  const [reason, setReason] = useState("");
  const [isBooking, setIsBooking] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);

  async function handleBookAppointment(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedSlot || !reason.trim() || reason.trim().length < 5) return;
    try {
      setIsBooking(true);
      setBookingError(null);
      await apiRequest("/appointments", {
        method: "POST",
        token: session?.user?.accessToken,
        body: { slotId: selectedSlot.id, reasonForVisit: reason.trim() },
      });
      setBookingSuccess(true);
      setTimeout(() => router.push("/dashboard/appointments"), 1500);
    } catch (err: unknown) {
      setBookingError(
        err instanceof Error
          ? err.message
          : "Failed to book appointment. Please try again."
      );
    } finally {
      setIsBooking(false);
    }
  }

  return (
    <>
      {bookingSuccess && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-top-4 fade-in duration-300">
          <div className="bg-[#31a795] text-white px-6 py-3 rounded-xl shadow-lifted flex items-center gap-3">
            <CheckCircledIcon className="w-5 h-5" />
            <span className="font-medium">Appointment booked! Redirecting…</span>
          </div>
        </div>
      )}

      <div className="mb-6">
        <h4 className="text-xs font-semibold text-text-primary mb-3 uppercase tracking-wider">
          Available Slots
        </h4>
        <SlotPicker
          slots={slots}
          selectedSlot={selectedSlot}
          onSelectSlot={setSelectedSlot}
        />
      </div>

      {selectedSlot && (
        <div className="animate-in fade-in slide-in-from-top-4 duration-300">
          <hr className="border-outline-variant/30 my-4" />
          <form onSubmit={handleBookAppointment} className="space-y-4">
            <div>
              <label
                htmlFor="reason"
                className="block text-sm font-semibold text-text-primary mb-1"
              >
                Reason for Visit <span className="text-error">*</span>
              </label>
              <textarea
                id="reason"
                required
                minLength={5}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Briefly describe your symptoms or concern…"
                className="w-full rounded-lg border border-outline-variant px-3 py-2 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary bg-surface min-h-[80px]"
              />
            </div>
            {bookingError && <p className="text-xs text-error">{bookingError}</p>}
            <Button
              type="submit"
              className="w-full"
              disabled={isBooking || reason.trim().length < 5}
            >
              {isBooking ? "Confirming…" : "Confirm Booking"}
            </Button>
          </form>
        </div>
      )}
    </>
  );
}
