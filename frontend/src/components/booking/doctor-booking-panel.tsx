"use client";

/**
 * DoctorBookingPanel — full self-contained booking flow for a doctor's detail page.
 *
 * Rendered inside DoctorBookingCard. Guides the patient through three steps in one panel:
 *   1. Calendar date selection (BookingCalendar)
 *   2. Time slot selection from the filtered slots for that day
 *   3. Reason-for-visit form that POSTs to /appointments
 *
 * When `isAuthenticated` is false the "Confirm Booking" button becomes "Sign In to Book"
 * and redirects to /login with the current path as callbackUrl — the reason field is
 * hidden entirely in that state so unauthenticated users see a minimal CTA.
 */

import React, { useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { apiRequest } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { CheckCircledIcon } from "@radix-ui/react-icons";
import { BookingCalendar, phDateKey } from "@/components/booking/booking-calendar";
import { formatPHTime } from "@/lib/datetime";
import { cn } from "@/lib/utils";
import type { AvailabilitySlot } from "@/types/api";

/**
 * Orchestrates the patient booking flow: date → time slot → reason → confirm.
 *
 * @param slots - All available slots for this doctor, pre-fetched by the page.
 * @param isAuthenticated - When false, bypasses the form and redirects to login
 *   instead of submitting; defaults to true so the panel is fully functional for
 *   authenticated sessions.
 */
export function DoctorBookingPanel({
  slots,
  isAuthenticated = true,
}: {
  slots: AvailabilitySlot[];
  isAuthenticated?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session } = useSession();

  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<AvailabilitySlot | null>(null);
  const [reason, setReason] = useState("");
  const [isBooking, setIsBooking] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);

  // Filter and sort slots for the selected day so they display chronologically.
  const slotsForDay = useMemo(() => {
    if (!selectedDateKey) return [];
    return slots
      .filter((s) => phDateKey(s.startTime) === selectedDateKey)
      .sort(
        (a, b) =>
          new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
      );
  }, [slots, selectedDateKey]);

  function handleSelectDate(dateKey: string) {
    setSelectedDateKey(dateKey);
    setSelectedSlot(null);
  }

  async function handleBookAppointment(e: React.FormEvent) {
    e.preventDefault();
    if (!isAuthenticated) {
      router.push(`/login?callbackUrl=${encodeURIComponent(pathname)}`);
      return;
    }
    if (!selectedSlot || reason.trim().length < 5) return;
    try {
      setIsBooking(true);
      setBookingError(null);
      await apiRequest("/appointments", {
        method: "POST",
        token: session?.user?.accessToken,
        body: { slotId: selectedSlot.id, reasonForVisit: reason.trim() },
      });
      setBookingSuccess(true);
      setTimeout(() => router.push("/appointments"), 1500);
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

  if (slots.length === 0) {
    return (
      <div className="bg-surface py-6 px-4 rounded-lg text-center">
        <p className="text-on-surface-variant text-sm">
          No available slots at the moment.
        </p>
      </div>
    );
  }

  return (
    <>
      {bookingSuccess && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-top-4 fade-in duration-300">
          <div className="bg-brand text-white px-6 py-3 rounded-xl shadow-lifted flex items-center gap-3">
            <CheckCircledIcon className="w-5 h-5" />
            <span className="font-medium">
              Request sent — your doctor will confirm shortly.
            </span>
          </div>
        </div>
      )}

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

      {selectedSlot && (
        <div className="animate-in fade-in slide-in-from-top-4 duration-300">
          <hr className="border-outline-variant/30 my-4" />
          <form onSubmit={handleBookAppointment} className="space-y-4">
            {isAuthenticated && (
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
            )}
            {bookingError && <p className="text-xs text-error">{bookingError}</p>}
            <Button
              type="submit"
              className="w-full"
              disabled={isAuthenticated && (isBooking || reason.trim().length < 5)}
            >
              {!isAuthenticated
                ? "Sign In to Book"
                : isBooking
                  ? "Confirming…"
                  : "Confirm Booking"}
            </Button>
            {isAuthenticated && reason.trim().length < 5 && (
              <p className="mt-2 text-xs text-on-surface-variant">
                Add a brief reason for your visit (at least 5 characters) to
                continue.
              </p>
            )}
          </form>
        </div>
      )}
    </>
  );
}
