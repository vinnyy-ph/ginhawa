/**
 * AppointmentCard — role-aware dispatcher for appointment card UI.
 *
 * Accepts a `role` prop and delegates rendering to either PatientAppointmentCard
 * or DoctorAppointmentCard. Used on the patient appointments page (/appointments)
 * and the doctor appointments page (/doctor/appointments).
 */
import { PatientAppointmentCard } from "./patient-appointment-card";
import { DoctorAppointmentCard } from "./doctor-appointment-card";
import type { AppointmentCardBodyProps } from "./appointment-card.helpers";

export type Role = "patient" | "doctor";

export interface AppointmentCardProps extends AppointmentCardBodyProps {
  role: Role;
}

/**
 * Routes appointment rendering to the role-appropriate card component.
 * Returns null for unknown roles so the caller never receives a broken UI.
 */
export function AppointmentCard({ role, ...props }: AppointmentCardProps) {
  if (role === "patient") {
    return <PatientAppointmentCard {...props} />;
  }
  if (role === "doctor") {
    return <DoctorAppointmentCard {...props} />;
  }
  return null;
}
