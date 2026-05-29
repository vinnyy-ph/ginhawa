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
