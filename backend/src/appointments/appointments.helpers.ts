/**
 * Pure helper utilities for appointment business rules.
 *
 * Keeps transition logic and notification building out of the service so they
 * can be unit-tested in isolation. No Prisma or NestJS dependencies here.
 */
import { AppointmentStatus, NotificationType } from '@prisma/client';

// Allowed status transitions, keyed `ROLE:FROM:TO`. A doctor drives the
// lifecycle; a patient may only cancel.
const ALLOWED_TRANSITIONS = new Set<string>([
  'DOCTOR:PENDING:CONFIRMED',
  'DOCTOR:PENDING:CANCELLED',
  'DOCTOR:CONFIRMED:CANCELLED',
  'DOCTOR:CONFIRMED:COMPLETED',
  'PATIENT:PENDING:CANCELLED',
  'PATIENT:CONFIRMED:CANCELLED',
]);

/** Returns `true` if the role is permitted to move an appointment from `from` to `to`. */
export function isAllowedTransition(
  role: string,
  from: AppointmentStatus,
  to: AppointmentStatus,
): boolean {
  return ALLOWED_TRANSITIONS.has(`${role}:${from}:${to}`);
}

/**
 * Derive initial payment status from the consultation fee.
 * Free consultations (fee === 0) are immediately WAIVED so no payment is outstanding.
 */
export function paymentStatusFor(fee: number): 'PAID' | 'WAIVED' {
  return fee > 0 ? 'PAID' : 'WAIVED';
}

export interface StatusNotificationContext {
  role: string;
  doctorName: string;
  patientName: string;
  patientUserId: string;
  doctorUserId: string;
}

export interface StatusNotification {
  type: NotificationType;
  title: string;
  message: string;
  targetUserId: string;
}

/**
 * The notification to send to the *other* party after a status change.
 * Returns null for statuses that carry no notification.
 */
export function buildStatusNotification(
  status: AppointmentStatus,
  ctx: StatusNotificationContext,
): StatusNotification | null {
  switch (status) {
    case AppointmentStatus.CONFIRMED:
      return {
        type: NotificationType.APPOINTMENT_CONFIRMED,
        title: 'Appointment Confirmed',
        message: `Your appointment with ${ctx.doctorName} has been confirmed.`,
        targetUserId: ctx.patientUserId,
      };
    case AppointmentStatus.CANCELLED:
      return {
        type: NotificationType.APPOINTMENT_CANCELLED,
        title: 'Appointment Cancelled',
        message:
          ctx.role === 'DOCTOR'
            ? `Your appointment with ${ctx.doctorName} has been cancelled.`
            : `Patient ${ctx.patientName} has cancelled their appointment.`,
        targetUserId:
          ctx.role === 'DOCTOR' ? ctx.patientUserId : ctx.doctorUserId,
      };
    case AppointmentStatus.COMPLETED:
      return {
        type: NotificationType.APPOINTMENT_COMPLETED,
        title: 'Appointment Completed',
        message: `Your appointment with ${ctx.doctorName} is complete. Check your records for notes.`,
        targetUserId: ctx.patientUserId,
      };
    default:
      return null;
  }
}
