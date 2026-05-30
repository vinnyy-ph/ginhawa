/**
 * appointment-card.helpers — shared logic and types for appointment card components.
 *
 * Contains join-window calculations, post-consultation detection, status
 * badge configuration, and the shared prop interface used by both the patient
 * and doctor card variants.
 */
import type { Appointment, AppointmentStatus } from "@/types/api";

// MVP/TESTING: join always enabled regardless of time.
// TODO(prod): set to false to restore the 15-min-before-start → slot-end window.
const ALWAYS_ALLOW_JOIN = true;

/**
 * Returns true when the appointment's video consultation room should be
 * accessible. In production this window is 15 min before start until slot end;
 * ALWAYS_ALLOW_JOIN overrides this for development/testing.
 */
export function isWithinJoinWindow(appt: Appointment): boolean {
  if (!appt.slot) return false;
  if (ALWAYS_ALLOW_JOIN) return true;
  const now = Date.now();
  const start = new Date(appt.slot.startTime).getTime();
  const end = new Date(appt.slot.endTime).getTime();
  // Joinable from 15 minutes before start until the slot end time.
  return now >= start - 15 * 60 * 1000 && now <= end;
}

/** Returns true once the slot end time has passed, enabling the finalize action. */
export function hasConsultEnded(appt: Appointment): boolean {
  if (!appt.slot) return false;
  return Date.now() >= new Date(appt.slot.endTime).getTime();
}

type StatusVariant = "secondary" | "success" | "destructive" | "info" | "outline";

export const statusConfig: Record<string, { variant: StatusVariant; border: string }> = {
  PENDING: { variant: "secondary", border: "border-l-warning" },
  CONFIRMED: { variant: "success", border: "border-l-primary" },
  CANCELLED: { variant: "destructive", border: "border-l-error" },
  COMPLETED: { variant: "info", border: "border-l-info" },
  RESCHEDULED: { variant: "outline", border: "border-l-outline" },
};

/** Shared props for the role-specific card bodies. */
export interface AppointmentCardBodyProps {
  appointment: Appointment;
  isUpdating?: boolean;
  onUpdateStatus?: (id: string, status: AppointmentStatus, cancelReason?: string) => void;
  token?: string;
  onRescheduled?: () => void;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}
