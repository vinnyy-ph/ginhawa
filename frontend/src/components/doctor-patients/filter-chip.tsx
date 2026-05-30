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
