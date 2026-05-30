/**
 * profile-fields — shared presentational primitives and reference data for the patient profile cards.
 *
 * Exports:
 *   - Constant arrays (BLOOD_TYPES, SMOKING_OPTIONS, COMMON_ALLERGIES, etc.)
 *     used as quick-pick chip suggestions in MedicalHistoryCard.
 *   - Pure helpers (toItems, toggleChip) for managing comma-separated string fields.
 *   - Micro-components (Empty, StatCell, InfoRow, PillList) reused across all
 *     three profile cards (IdentityCard, LocationInsuranceCard, MedicalHistoryCard).
 */
// Shared presentational primitives + option data for the patient profile cards.

export const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "Unknown"];

export const SMOKING_OPTIONS = [
  { value: "", label: "Prefer not to say" },
  { value: "Never", label: "Never" },
  { value: "Former", label: "Former" },
  { value: "Current", label: "Current" },
];

export const COMMON_ALLERGIES = ["Penicillin", "Seafood", "Peanuts", "Aspirin"];
export const COMMON_CONDITIONS = ["Hypertension", "Diabetes", "Asthma", "High Cholesterol"];
export const COMMON_MEDICATIONS = ["Metformin", "Amlodipine", "Losartan", "Salbutamol"];

export const toItems = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);

/** Toggle a value within a comma-joined string field. */
export const toggleChip = (value: string, current: string, setter: (v: string) => void) => {
  const items = toItems(current);
  const next = items.includes(value) ? items.filter((i) => i !== value) : [...items, value];
  setter(next.join(", "));
};

/** Italic placeholder rendered when a profile field has no value. */
export function Empty() {
  return <span className="text-on-surface-variant/40 italic text-sm">Not set</span>;
}

/** Muted label + value pair for read-only stat cells */
export function StatCell({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant/60 font-manrope">
        {label}
      </span>
      <span className="text-sm font-semibold text-text-primary font-manrope">
        {value?.trim() ? value : <Empty />}
      </span>
    </div>
  );
}

/** Generic read-only labelled row */
export function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant/60 font-manrope">
        {label}
      </span>
      <span className="text-sm text-text-primary font-manrope leading-relaxed">
        {value?.trim() ? value.trim() : <Empty />}
      </span>
    </div>
  );
}

/** Pill tags for lists (allergies, conditions, meds, languages) */
export function PillList({ items, color = "neutral" }: { items: string[]; color?: "neutral" | "primary" | "warning" }) {
  if (items.length === 0) return <Empty />;
  const cls =
    color === "primary"
      ? "bg-primary/10 text-primary border border-primary/20"
      : color === "warning"
      ? "bg-amber-50 text-amber-700 border border-amber-200"
      : "bg-surface-variant text-on-surface-variant border border-outline-variant/50";
  return (
    <div className="flex flex-wrap gap-2 py-1">
      {items.map((item) => (
        <span key={item} className={`px-2.5 py-0.5 rounded-full text-xs font-semibold font-manrope ${cls}`}>
          {item}
        </span>
      ))}
    </div>
  );
}
