export interface WeeklyTemplate {
  /** 0 = Sunday … 6 = Saturday */
  weekdays: number[];
  /** 'YYYY-MM-DD' local start date */
  startDate: string;
  /** number of weeks to generate, 1–12 */
  weeks: number;
  /** 'HH:mm' daily window start */
  dayStart: string;
  /** 'HH:mm' daily window end */
  dayEnd: string;
  /** slot length in minutes (e.g. 30, 60) */
  slotMinutes: number;
  /** optional break window skipped during generation */
  breakWindow?: { start: string; end: string } | null;
}

export interface GeneratedSlot {
  startTime: string; // ISO
  endTime: string; // ISO
}

function parseHM(hm: string): { h: number; m: number } {
  const [h, m] = hm.split(':').map(Number);
  return { h, m };
}

/**
 * Expand a weekly template into concrete bookable slot instants.
 * Builds Date objects in local time (matching the single-add form), so the
 * resulting ISO strings carry the correct Asia/Manila → UTC offset.
 * Skips slots that fall in the past or overlap the break window. A trailing
 * partial slot (window not divisible by slotMinutes) is dropped.
 */
export function generateSlots(t: WeeklyTemplate): GeneratedSlot[] {
  const result: GeneratedSlot[] = [];
  if (t.weekdays.length === 0 || t.weeks < 1) return result;

  const { h: startH, m: startM } = parseHM(t.dayStart);
  const { h: endH, m: endM } = parseHM(t.dayEnd);
  const brk = t.breakWindow
    ? { s: parseHM(t.breakWindow.start), e: parseHM(t.breakWindow.end) }
    : null;

  const now = Date.now();
  const totalDays = t.weeks * 7;
  const base = new Date(`${t.startDate}T00:00:00`);

  for (let offset = 0; offset < totalDays; offset++) {
    const day = new Date(base);
    day.setDate(base.getDate() + offset);
    if (!t.weekdays.includes(day.getDay())) continue;

    const y = day.getFullYear();
    const mo = day.getMonth();
    const d = day.getDate();

    const dayEnd = new Date(y, mo, d, endH, endM, 0, 0);
    let cursor = new Date(y, mo, d, startH, startM, 0, 0);

    const breakStart = brk ? new Date(y, mo, d, brk.s.h, brk.s.m, 0, 0) : null;
    const breakEnd = brk ? new Date(y, mo, d, brk.e.h, brk.e.m, 0, 0) : null;

    while (true) {
      const slotEnd = new Date(cursor.getTime() + t.slotMinutes * 60000);
      if (slotEnd > dayEnd) break;

      const inPast = cursor.getTime() < now;
      const inBreak =
        breakStart !== null &&
        breakEnd !== null &&
        cursor < breakEnd &&
        slotEnd > breakStart;

      if (!inPast && !inBreak) {
        result.push({
          startTime: cursor.toISOString(),
          endTime: slotEnd.toISOString(),
        });
      }
      cursor = slotEnd;
    }
  }

  return result;
}
