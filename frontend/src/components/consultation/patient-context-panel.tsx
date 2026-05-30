export interface PatientContext {
  fullName: string;
  medicalHistory: string | null;
  weight: number | null;
  height: number | null;
  birthdate: string;
}

export function PatientContextPanel({ patientContext }: { patientContext: PatientContext | null }) {
  if (!patientContext) {
    return <p className="text-on-surface-variant text-center py-8">No patient data available.</p>;
  }

  const ageYears = Math.floor(
    (new Date().getTime() - new Date(patientContext.birthdate).getTime()) /
      (365.25 * 24 * 3600 * 1000),
  );

  return (
    <>
      <div>
        <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wide mb-1">Patient</p>
        <p className="text-on-surface font-medium">{patientContext.fullName}</p>
      </div>
      <div>
        <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wide mb-1">Age</p>
        <p className="text-on-surface">{ageYears} years</p>
      </div>
      {patientContext.weight && (
        <div>
          <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wide mb-1">Weight</p>
          <p className="text-on-surface">{patientContext.weight} kg</p>
        </div>
      )}
      {patientContext.height && (
        <div>
          <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wide mb-1">Height</p>
          <p className="text-on-surface">{patientContext.height} cm</p>
        </div>
      )}
      <div>
        <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wide mb-1">Medical History</p>
        <p className="text-on-surface-variant whitespace-pre-line leading-relaxed">
          {patientContext.medicalHistory ?? 'None recorded'}
        </p>
      </div>
    </>
  );
}
