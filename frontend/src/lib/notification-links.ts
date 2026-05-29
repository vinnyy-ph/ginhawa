const APPOINTMENT_TYPES = new Set([
  'APPOINTMENT_BOOKED',
  'APPOINTMENT_CONFIRMED',
  'APPOINTMENT_CANCELLED',
  'APPOINTMENT_COMPLETED',
  'APPOINTMENT_RESCHEDULED',
  'APPOINTMENT_REMINDER',
]);

const RECORD_TYPES = new Set(['MEDICAL_RECORD_CREATED', 'PRESCRIPTION_READY']);

/**
 * Map a notification type + the viewing role to the route its subject lives on.
 * Returns null when there is no meaningful destination (e.g. GENERAL).
 */
export function notificationHref(
  type: string,
  role: 'doctor' | 'patient',
): string | null {
  if (APPOINTMENT_TYPES.has(type)) {
    return role === 'doctor' ? '/doctor/appointments' : '/appointments';
  }
  if (RECORD_TYPES.has(type)) {
    // Record/prescription notifications are only delivered to patients.
    return role === 'patient' ? '/records' : null;
  }
  return null;
}
