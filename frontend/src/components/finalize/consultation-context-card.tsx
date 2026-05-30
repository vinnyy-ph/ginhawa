/**
 * ConsultationContextCard — read-only summary header for the finalize record page.
 *
 * Displays the patient's name, consultation date, and reason for visit at the
 * top of the /doctor/finalize/[id] page so the doctor has context while
 * reviewing the AI-generated clinical draft.
 */
import { CalendarIcon, PersonIcon } from "@radix-ui/react-icons";
import { formatPHDate } from "@/lib/datetime";
import type { Appointment } from "@/types/api";

/** Renders a compact identity + slot summary card at the top of the finalize page. */
export function ConsultationContextCard({ appointment }: { appointment: Appointment }) {
  const pat = appointment.patient;
  const slot = appointment.slot;
  const dateStr = slot
    ? formatPHDate(slot.startTime, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
    : 'Unknown Date';

  return (
    <div className="bg-surface-white rounded-xl shadow-soft border border-outline-variant/30 p-5 mb-6 flex flex-col md:flex-row gap-5 items-start">
      <div className="w-14 h-14 rounded-full bg-surface-container flex items-center justify-center text-text-primary font-serif font-bold text-xl shrink-0">
        {pat?.fullName.charAt(0) || 'P'}
      </div>
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <p className="text-xs font-bold text-outline uppercase tracking-wider mb-1">Patient</p>
          <h3 className="font-bold text-text-primary flex items-center gap-2">
            <PersonIcon className="w-4 h-4 text-on-surface-variant" />
            {pat?.fullName || 'Unknown Patient'}
          </h3>
        </div>
        <div>
          <p className="text-xs font-bold text-outline uppercase tracking-wider mb-1">Consultation Date</p>
          <p className="font-medium flex items-center gap-2 text-text-primary">
            <CalendarIcon className="w-4 h-4 text-primary" />
            {dateStr}
          </p>
        </div>
        <div className="md:col-span-2">
          <p className="text-xs font-bold text-outline uppercase tracking-wider mb-1">Reason for Visit</p>
          <p className="text-sm text-on-surface-variant bg-surface p-3 rounded-lg">
            {appointment.reasonForVisit || "No reason provided."}
          </p>
        </div>
      </div>
    </div>
  );
}
