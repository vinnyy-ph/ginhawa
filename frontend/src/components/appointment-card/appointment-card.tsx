import { PatientAppointmentCard } from "./patient-appointment-card";
import { DoctorAppointmentCard } from "./doctor-appointment-card";
import type { AppointmentCardBodyProps } from "./appointment-card.helpers";

export type Role = "patient" | "doctor";

export interface AppointmentCardProps extends AppointmentCardBodyProps {
  role: Role;
}

export function AppointmentCard({ role, ...props }: AppointmentCardProps) {
  if (role === "patient") {
    return <PatientAppointmentCard {...props} />;
  }
  if (role === "doctor") {
    return <DoctorAppointmentCard {...props} />;
  }
  return null;
}
