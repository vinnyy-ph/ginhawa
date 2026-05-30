/**
 * FilterPillGroup — reusable single-select option group used inside DoctorFilters.
 *
 * Renders a labelled set of toggle buttons in either pill (horizontal wrap) or
 * grid (2-column) layout, controlled by the `shape` prop. Used for availability
 * window, consultation fee range, and experience level filter sections.
 */

import { cn } from "@/lib/utils";

interface PillOption {
  id: string;
  label: string;
}

/** Labelled group of single-select option buttons used in the doctor filters. */
export function FilterPillGroup({
  title,
  options,
  value,
  onChange,
  shape = "pill",
}: {
  title: string;
  options: readonly PillOption[];
  value: string;
  onChange: (id: string) => void;
  shape?: "pill" | "grid";
}) {
  return (
    <div className="space-y-3">
      <h4 className="text-sm font-bold text-text-primary">{title}</h4>
      <div className={shape === "grid" ? "grid grid-cols-2 gap-2" : "flex flex-wrap gap-2"}>
        {options.map((opt) => (
          <button
            key={opt.id}
            onClick={() => onChange(opt.id)}
            className={cn(
              shape === "grid"
                ? "px-3 py-2 text-xs font-semibold rounded-lg border transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-primary/40 text-center"
                : "px-3 py-1.5 text-xs font-semibold rounded-full border transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-primary/40",
              value === opt.id
                ? "bg-[#004d43] text-white border-[#004d43] shadow-sm"
                : "bg-surface-white text-on-surface-variant border-outline-variant hover:border-primary/50 hover:text-primary"
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
