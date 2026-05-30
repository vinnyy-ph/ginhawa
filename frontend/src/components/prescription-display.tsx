/**
 * Read-only prescription renderer for record views.
 *
 * Prefers the structured prescription list (drug/dosage/frequency/duration);
 * falls back to the legacy free-text `fallbackText`. Renders nothing when both
 * are empty.
 */
import { HeartIcon } from "@radix-ui/react-icons";
import type { Prescription } from "@/types/api";

/** Displays prescriptions, preferring structured data over the legacy text field. */
export function PrescriptionDisplay({
  prescriptions,
  fallbackText,
}: {
  prescriptions?: Prescription[] | null;
  fallbackText?: string | null;
}) {
  const hasStructured = !!(prescriptions && prescriptions.length > 0);
  if (!hasStructured && !fallbackText) return null;
  return (
    <div>
      <h4 className="flex items-center gap-2 font-bold font-serif text-text-primary mb-2">
        <HeartIcon className="w-4 h-4 text-primary" />
        Prescription
      </h4>
      {hasStructured ? (
        <ul className="space-y-2">
          {prescriptions!.map((p) => (
            <li key={p.id} className="bg-primary/5 border border-primary/15 rounded-lg p-3 text-sm">
              <div className="flex items-baseline justify-between gap-3">
                <span className="font-semibold text-text-primary">{p.drugName}</span>
                <span className="text-on-surface-variant">{p.dosage}</span>
              </div>
              <p className="text-on-surface-variant mt-0.5">
                {p.frequency}
                {p.durationDays ? ` · ${p.durationDays} day${p.durationDays === 1 ? '' : 's'}` : ''}
              </p>
              {p.instructions && <p className="text-on-surface-variant mt-1 italic">{p.instructions}</p>}
            </li>
          ))}
        </ul>
      ) : (
        <div className="bg-surface p-4 rounded-lg text-sm text-on-surface-variant whitespace-pre-line leading-relaxed border border-outline-variant/30">
          {fallbackText}
        </div>
      )}
    </div>
  );
}
