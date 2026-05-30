import type { Appointment } from "@/types/api";

export function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-0.5">
        {label}
      </p>
      <p className="text-text-primary whitespace-pre-wrap">{value}</p>
    </div>
  );
}

export function ConsultationDetails({ appt }: { appt: Appointment }) {
  const record = appt.medicalRecord;

  if (appt.status !== "COMPLETED" && !record) {
    return (
      <p className="text-sm text-on-surface-variant italic">
        No consultation record yet.
      </p>
    );
  }

  if (!record) {
    return (
      <p className="text-sm text-on-surface-variant italic">
        Consultation completed — no notes were recorded.
      </p>
    );
  }

  return (
    <div className="space-y-3 text-sm">
      {record.notes && (
        <Field label="Doctor's notes" value={record.notes} />
      )}
      {record.recommendations && (
        <Field label="Recommendations" value={record.recommendations} />
      )}
      {record.followUpAdvice && (
        <Field label="Follow-up advice" value={record.followUpAdvice} />
      )}
      {record.prescription && (
        <Field label="Prescription" value={record.prescription} />
      )}

      {record.prescriptions && record.prescriptions.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1.5">
            Prescribed medication
          </p>
          <ul className="space-y-1.5">
            {record.prescriptions.map(rx => (
              <li
                key={rx.id}
                className="bg-surface-container rounded-lg px-3 py-2 text-text-primary"
              >
                <span className="font-semibold">{rx.drugName}</span>{" "}
                <span className="text-on-surface-variant">
                  — {rx.dosage}, {rx.frequency}
                  {rx.durationDays ? ` for ${rx.durationDays} days` : ""}
                </span>
                {rx.instructions && (
                  <p className="text-xs text-on-surface-variant mt-0.5">
                    {rx.instructions}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
