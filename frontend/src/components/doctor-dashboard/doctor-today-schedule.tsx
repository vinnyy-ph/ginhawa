/**
 * DoctorTodaySchedule — main content area of the doctor dashboard showing today's appointments.
 *
 * Renders the list of appointments for the current day with patient name, time,
 * and status badge. A "Join" button appears for CONFIRMED appointments within the
 * ±15-minute window of the slot start time, enabling the doctor to enter the
 * consultation room at the right moment.
 *
 * @param appointments - Today's appointments, already filtered to the current date by the page.
 * @param now - Current timestamp (ms) passed from the page so the join-button
 *   window calculation stays consistent with the server render time.
 */

import Link from "next/link";
import { CalendarIcon, ClockIcon, ChevronRightIcon } from "@radix-ui/react-icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatPHTime } from "@/lib/datetime";
import type { Appointment } from "@/types/api";

const statusColors: Record<string, "secondary" | "success" | "destructive" | "info" | "outline"> = {
  PENDING: "secondary",
  CONFIRMED: "success",
  CANCELLED: "destructive",
  COMPLETED: "info",
  RESCHEDULED: "outline",
};

export function DoctorTodaySchedule({
  appointments,
  now,
}: {
  appointments: Appointment[];
  now: number;
}) {
  return (
    <div className="lg:col-span-2">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold font-serif text-text-primary">Today&apos;s Schedule</h2>
        <Link href="/doctor/appointments" className="text-sm font-semibold text-primary hover:underline flex items-center gap-1">
          View all <ChevronRightIcon className="w-4 h-4" />
        </Link>
      </div>

      {appointments.length === 0 ? (
        <div className="bg-surface-white rounded-xl shadow-soft p-10 text-center border border-outline-variant/30">
          <div className="w-16 h-16 rounded-full bg-surface mx-auto mb-4 flex items-center justify-center">
            <CalendarIcon className="w-8 h-8 text-outline" />
          </div>
          <h3 className="font-semibold text-text-primary mb-2">No appointments today</h3>
          <p className="text-sm text-on-surface-variant mb-4">You have a free schedule today.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {appointments.map((appt) => {
            const pat = appt.patient;
            const timeStr = appt.slot ? formatPHTime(appt.slot.startTime) : '';

            return (
              <div key={appt.id} className="bg-surface-white p-4 rounded-xl shadow-soft flex items-center justify-between border-l-4 border-l-primary/30">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant font-serif font-bold text-xl shrink-0">
                    {pat?.fullName.charAt(0) || 'P'}
                  </div>
                  <div>
                    <h4 className="font-bold text-text-primary">{pat?.fullName || 'Patient'}</h4>
                    <div className="flex items-center gap-2 text-xs text-primary font-semibold mt-1">
                      <ClockIcon className="w-3.5 h-3.5" />
                      <span>{timeStr}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge variant={statusColors[appt.status] || "outline"}>
                    {appt.status}
                  </Badge>
                  {/* Show "Join" only within the 15-minute lead-up to the slot and until it ends. */}
                  {appt.status === 'CONFIRMED' && appt.slot &&
                    now >= new Date(appt.slot.startTime).getTime() - 15 * 60 * 1000 &&
                    now <= new Date(appt.slot.endTime).getTime() && (
                      <Button asChild size="sm" className="bg-brand text-white hover:bg-brand-dark">
                        <Link href={`/consultation/${appt.id}`}>Join</Link>
                      </Button>
                    )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
