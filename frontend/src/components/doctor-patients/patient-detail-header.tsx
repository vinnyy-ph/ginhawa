/**
 * PatientDetailHeader — top section of the doctor's patient detail view.
 *
 * Renders the patient's avatar initial, full name, computed age, phone number,
 * and city/region. If the patient has a stored medical history string it is shown
 * below in a dedicated card. Used at the top of the /doctor/patients/:id page.
 */

import type { DoctorPatientHistory } from "@/types/api";
import { patientAge } from "./patient-history-utils";

type Patient = DoctorPatientHistory["patient"];

export function PatientDetailHeader({ patient }: { patient: Patient }) {
  const age = patientAge(patient.birthdate);

  return (
    <>
      <div className="bg-surface-white p-6 rounded-xl shadow-soft flex items-center gap-5 mb-6">
        <div className="w-16 h-16 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant font-serif font-bold text-2xl shrink-0">
          {patient.fullName.charAt(0) || "P"}
        </div>
        <div>
          <h1 className="text-2xl font-serif font-bold text-text-primary">
            {patient.fullName}
          </h1>
          <p className="text-sm text-on-surface-variant mt-1">
            {age !== null && <span>{age} yrs</span>}
            {patient.phoneNumber && <span> · {patient.phoneNumber}</span>}
            {(patient.city || patient.region) && (
              <span>
                {" "}
                · {[patient.city, patient.region].filter(Boolean).join(", ")}
              </span>
            )}
          </p>
        </div>
      </div>

      {patient.medicalHistory && (
        <div className="bg-surface-white p-5 rounded-xl shadow-soft mb-6">
          <h2 className="text-sm font-semibold text-on-surface-variant uppercase tracking-wider mb-2">
            Medical history
          </h2>
          <p className="text-text-primary whitespace-pre-wrap text-sm">
            {patient.medicalHistory}
          </p>
        </div>
      )}
    </>
  );
}
