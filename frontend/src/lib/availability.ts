/**
 * Availability display helpers for the doctor discovery UI.
 *
 * All date comparisons are performed in the Asia/Manila timezone so that
 * "today" and "tomorrow" labels reflect Philippine calendar days regardless of
 * the viewer's local clock.
 */

import type { AvailabilitySlot } from "@/types/api";

const PH_TZ = "Asia/Manila";

export type AvailabilityResult =
  | { kind: "today" }
  | { kind: "tomorrow" }
  | { kind: "date"; label: string }
  | { kind: "booked" };

/**
 * Computes earliest available slot from a list of slots.
 * All comparisons done in Asia/Manila timezone.
 */
export function getEarliestAvailability(
  slots: AvailabilitySlot[] | undefined
): AvailabilityResult {
  if (!slots || slots.length === 0) return { kind: "booked" };

  const now = new Date();
  const available = slots
    .filter((s) => s.status === "AVAILABLE" && new Date(s.startTime) > now)
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  if (available.length === 0) return { kind: "booked" };

  const earliest = new Date(available[0].startTime);

  // Compare calendar dates in PH timezone
  const toPhDate = (d: Date) =>
    d.toLocaleDateString("en-PH", { timeZone: PH_TZ, year: "numeric", month: "2-digit", day: "2-digit" });

  const todayStr = toPhDate(now);
  const tomorrowDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const tomorrowStr = toPhDate(tomorrowDate);
  const earliestStr = toPhDate(earliest);

  if (earliestStr === todayStr) return { kind: "today" };
  if (earliestStr === tomorrowStr) return { kind: "tomorrow" };

  // Format: "Thu, Jun 5"
  const label = earliest.toLocaleDateString("en-PH", {
    timeZone: PH_TZ,
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  return { kind: "date", label };
}

/** Returns the badge text and color classes for a given AvailabilityResult. */
export function availabilityBadge(result: AvailabilityResult): {
  text: string;
  colorClass: string;
  showCalendarIcon: boolean;
} {
  switch (result.kind) {
    case "today":
      return {
        text: "Available Today",
        colorClass: "bg-primary/10 text-primary border-primary/20",
        showCalendarIcon: false,
      };
    case "tomorrow":
      return {
        text: "Tomorrow",
        colorClass: "bg-secondary-container/30 text-on-secondary-container border-secondary-container/50",
        showCalendarIcon: true,
      };
    case "date":
      return {
        text: `Next: ${result.label}`,
        colorClass: "bg-secondary-container/30 text-on-secondary-container border-secondary-container/50",
        showCalendarIcon: true,
      };
    case "booked":
      return {
        text: "Fully Booked",
        colorClass: "bg-surface-container text-on-surface-variant border-outline-variant",
        showCalendarIcon: false,
      };
  }
}
