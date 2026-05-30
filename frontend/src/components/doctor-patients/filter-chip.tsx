/**
 * FilterChip — pill-style toggle button used in the doctor patients list.
 *
 * Each chip represents an appointment status category (e.g. All, Completed,
 * Pending). Displays the label with a count badge and highlights when active.
 * Used in a chip row at the top of the patient history view to filter visible cards.
 */

/**
 * Single selectable filter chip.
 *
 * @param label - Status category name displayed on the chip.
 * @param count - Number of appointments matching this category, shown inline.
 * @param active - Whether this chip is currently selected; drives highlight styling.
 * @param onClick - Callback that sets this chip as the active filter in the parent.
 */
export function FilterChip({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-sm rounded-full px-3 py-1 border transition-colors ${active
          ? "bg-primary text-on-primary border-primary"
          : "bg-surface-white text-on-surface-variant border-outline/40 hover:border-primary/50"
        }`}
    >
      {label} <span className="font-semibold">{count}</span>
    </button>
  );
}
