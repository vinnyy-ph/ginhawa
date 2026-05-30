// frontend/src/lib/datetime.ts
// All appointment/clinical times are Manila-local. These helpers pin the
// timezone so a viewer on a non-PH machine clock still sees the real PH time.

const PH_TZ = 'Asia/Manila';
const LOCALE = 'en-PH';

type DateInput = string | number | Date;

/** Format a time, e.g. "2:45 PM". Always rendered in Asia/Manila. */
export function formatPHTime(
  value: DateInput,
  opts: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit' },
): string {
  return new Date(value).toLocaleTimeString(LOCALE, { ...opts, timeZone: PH_TZ });
}

/** Format a date, e.g. "May 30, 2026". Always rendered in Asia/Manila. */
export function formatPHDate(
  value: DateInput,
  opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' },
): string {
  return new Date(value).toLocaleDateString(LOCALE, { ...opts, timeZone: PH_TZ });
}

/** Relative time: "Just now", "5m ago", "3h ago", "Yesterday", else an Asia/Manila date. */
export function formatRelativeTime(value: DateInput): string {
  const date = new Date(value);
  const diffMins = Math.floor((Date.now() - date.getTime()) / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "Yesterday";
  return formatPHDate(date);
}
