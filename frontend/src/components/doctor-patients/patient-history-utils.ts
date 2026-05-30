/**
 * patient-history-utils — shared helpers for the doctor patient history view.
 *
 * `patientAge` computes a patient's current age from their birthdate string.
 * `appointmentText` builds a flattened, lowercased search corpus from an
 * appointment and its medical record so the patient detail page can filter
 * appointments client-side by free-text search without additional API calls.
 */

import type { Appointment } from "@/types/api";

/** Computes the patient's age in whole years from an ISO birthdate string. Returns null if the date is absent or unparseable. */
export function patientAge(birthdate?: string): number | null {
  if (!birthdate) return null;
  const b = new Date(birthdate);
  if (isNaN(b.getTime())) return null;
  const diff = Date.now() - b.getTime();
  return Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
}

/** Flattened, lowercased text of an appointment + its record, for search. */
export function appointmentText(appt: Appointment): string {
  const rec = appt.medicalRecord;
  return [
    appt.reasonForVisit,
    rec?.notes,
    rec?.recommendations,
    rec?.followUpAdvice,
    rec?.prescription,
    ...(rec?.prescriptions ?? []).flatMap(rx => [
      rx.drugName,
      rx.dosage,
      rx.frequency,
      rx.instructions,
    ]),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}
