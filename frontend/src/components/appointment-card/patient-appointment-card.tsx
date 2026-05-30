/**
 * PatientAppointmentCard — collapsible appointment card rendered from the patient's perspective.
 *
 * Shows doctor name, specialization, and slot date/time in an always-visible
 * header. Expanding the card reveals the booking reference, actions (Reschedule,
 * Cancel, Join Consultation) and — for completed appointments — a link to the
 * medical record. The "Join" button is time-gated by isWithinJoinWindow. Used
 * on the patient appointments page (/appointments).
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CalendarIcon, ChevronDownIcon, ClockIcon } from "@radix-ui/react-icons";
import { cn } from "@/lib/utils";
import { formatPHTime, formatPHDate } from "@/lib/datetime";
import { RescheduleDialog } from "@/components/booking/reschedule-dialog";
import { isWithinJoinWindow, statusConfig, type AppointmentCardBodyProps } from "./appointment-card.helpers";

/**
 * Renders an expand/collapse card with the patient-facing appointment summary
 * and contextual actions. A 30-second interval keeps join-window state current
 * without a full data refetch.
 */
export function PatientAppointmentCard({
  appointment: appt,
  isExpanded = false,
  onToggleExpand,
  isUpdating = false,
  onUpdateStatus,
  token,
  onRescheduled,
}: AppointmentCardBodyProps) {
  const slot = appt.slot;
  const config = statusConfig[appt.status] || { variant: "outline", border: "border-l-outline" };
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  const doc = appt.doctor;
  const dateStr = slot ? formatPHDate(slot.startTime, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) : 'Unknown Date';
  const timeStr = slot ? `${formatPHTime(slot.startTime)} - ${formatPHTime(slot.endTime)} (PHT)` : '';

  return (
    <div className={cn("bg-surface-white rounded-xl shadow-soft overflow-hidden border-l-4 transition-all duration-200", config.border)}>
      {/* Card Header (Always visible) */}
      <button
        type="button"
        className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer hover:bg-surface-container/30 w-full text-left"
        onClick={onToggleExpand}
        aria-expanded={isExpanded}
      >
        <div className="flex gap-4 items-center">
          {doc?.profilePictureUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={doc.profilePictureUrl} alt={doc.fullName} className="w-12 h-12 rounded-full object-cover shrink-0" />
          ) : (
            <div className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center text-primary font-serif font-bold text-xl shrink-0">
              {doc?.fullName.charAt(0) || 'D'}
            </div>
          )}
          <div>
            <h3 className="font-bold text-text-primary text-lg leading-tight">
              {doc?.professionalTitle ? `${doc.professionalTitle} ` : ''}{doc?.fullName}
            </h3>
            <p className="text-sm text-on-surface-variant mb-1">{doc?.specialization}</p>
            <div className="flex items-center gap-4 text-xs font-semibold text-text-primary mt-2">
              <span className="flex items-center gap-1.5 bg-surface px-2 py-1 rounded-md">
                <CalendarIcon className="w-3.5 h-3.5 text-primary" />
                {dateStr}
              </span>
              <span className="flex items-center gap-1.5 bg-surface px-2 py-1 rounded-md">
                <ClockIcon className="w-3.5 h-3.5 text-primary" />
                {timeStr}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between sm:justify-end sm:w-auto w-full gap-4">
          <Badge variant={config.variant} className="capitalize px-3 py-1 text-xs">
            {appt.status.toLowerCase()}
          </Badge>
          <span className="text-on-surface-variant hover:text-primary transition-colors p-2 rounded-full hover:bg-primary/5">
            <ChevronDownIcon className={cn("w-5 h-5 transition-transform duration-200", isExpanded && "rotate-180")} />
          </span>
        </div>
      </button>

      {/* Expanded Content */}
      <div
        className={cn(
          "overflow-hidden transition-all duration-300 ease-in-out",
          isExpanded ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
        )}
      >
        <div className="p-5 pt-0 border-t border-outline-variant/30 mt-2">
          <div className="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <p className="text-xs font-bold text-outline uppercase tracking-wider mb-2">Reason for Visit</p>
              <p className="text-sm text-on-surface-variant bg-surface p-3 rounded-lg min-h-[60px]">
                {appt.reasonForVisit || "No reason provided."}
              </p>
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-xs font-bold text-outline uppercase tracking-wider mb-2">Booking Reference</p>
                <p className="text-sm font-mono text-on-surface-variant">{appt.id}</p>
              </div>

              {(appt.status === "PENDING" || appt.status === "CONFIRMED") && (
                <div>
                  <p className="text-xs font-bold text-outline uppercase tracking-wider mb-2">Actions</p>
                  <div className="flex gap-2 flex-wrap">
                    <RescheduleDialog
                      appointment={appt}
                      token={token}
                      onRescheduled={() => onRescheduled?.()}
                      trigger={
                        <Button variant="outline" size="sm">
                          Reschedule
                        </Button>
                      }
                    />
                    {!confirmCancel ? (
                      <Button
                        variant="destructive"
                        size="sm"
                        className={cn("bg-error/10 text-error border-0 hover:bg-error/20", isUpdating && "opacity-50")}
                        onClick={() => setConfirmCancel(true)}
                        disabled={isUpdating}
                      >
                        Cancel
                      </Button>
                    ) : (
                      <div className="flex items-center gap-2 text-xs font-semibold">
                        <span className="text-error">Cancel appointment?</span>
                        <button
                          onClick={() => { onUpdateStatus?.(appt.id, "CANCELLED"); setConfirmCancel(false); }}
                          className="px-2 py-1 bg-error text-white rounded shadow-sm hover:bg-error/90"
                        >
                          Yes
                        </button>
                        <button
                          onClick={() => setConfirmCancel(false)}
                          className="px-2 py-1 bg-surface-container text-on-surface-variant rounded hover:bg-surface-variant"
                        >
                          No
                        </button>
                      </div>
                    )}
                    {/* Inform the patient when the join window opens; the
                        "Join" button only replaces this message once the
                        window is active (checked against the live `now` tick). */}
                    {appt.status === "CONFIRMED" && !isWithinJoinWindow(appt) && slot && now < new Date(slot.startTime).getTime() && (
                      <span className="text-xs font-semibold text-on-surface-variant self-center">
                        Join opens at {formatPHTime(slot.startTime)} (PHT)
                      </span>
                    )}
                    {appt.status === "CONFIRMED" && isWithinJoinWindow(appt) && (
                      <Button asChild size="sm" className="bg-brand text-white hover:bg-brand-dark">
                        <Link href={`/consultation/${appt.id}`}>Join Consultation</Link>
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {appt.status === "COMPLETED" && (
                <div>
                  <Button asChild size="sm" variant="outline" className="w-full sm:w-auto">
                    <Link href={`/records?appointment=${appt.id}`}>View Medical Record</Link>
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
