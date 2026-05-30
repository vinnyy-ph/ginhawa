/**
 * PatientHistoryCard — collapsible card representing a single appointment in a patient's history.
 *
 * Displays the appointment date, time, and status badge in the card header.
 * Expands to show the reason for visit and full ConsultationDetails (notes,
 * recommendations, prescriptions). Used in the list on the doctor's patient
 * detail page.
 */

import { Badge } from "@/components/ui/badge";
import { FileTextIcon } from "@radix-ui/react-icons";
import { formatPHTime, formatPHDate } from "@/lib/datetime";
import type { Appointment, AppointmentStatus } from "@/types/api";
import { Field, ConsultationDetails } from "./consultation-details";

const statusVariant: Record<
  AppointmentStatus,
  "default" | "secondary" | "destructive" | "success" | "info" | "outline"
> = {
  PENDING: "secondary",
  CONFIRMED: "info",
  COMPLETED: "success",
  CANCELLED: "destructive",
  RESCHEDULED: "outline",
};

export function PatientHistoryCard({ appt }: { appt: Appointment }) {
  const start = appt.slot ? new Date(appt.slot.startTime) : null;

  return (
    <div className="bg-surface-white rounded-xl shadow-soft overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-outline/20">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-surface-container flex items-center justify-center text-on-surface-variant shrink-0">
            <FileTextIcon className="w-4 h-4" />
          </div>
          <div>
            <p className="font-semibold text-text-primary">
              {start
                ? formatPHDate(start, {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })
                : "Date TBD"}
            </p>
            {start && (
              <p className="text-xs text-on-surface-variant">
                {formatPHTime(start)}
              </p>
            )}
          </div>
        </div>
        <Badge variant={statusVariant[appt.status] ?? "outline"}>
          {appt.status}
        </Badge>
      </div>

      <div className="p-4 space-y-3">
        {appt.reasonForVisit && (
          <Field
            label="Reason for visit"
            value={appt.reasonForVisit}
          />
        )}
        <ConsultationDetails appt={appt} />
      </div>
    </div>
  );
}
