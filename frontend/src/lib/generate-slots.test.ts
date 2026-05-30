import { describe, it, expect } from 'vitest';
import { generateSlots, type WeeklyTemplate } from './generate-slots';

const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

function tpl(overrides: Partial<WeeklyTemplate> = {}): WeeklyTemplate {
  return {
    weekdays: ALL_DAYS,
    startDate: '2099-01-05', // far future → never dropped as past
    weeks: 1,
    dayStart: '09:00',
    dayEnd: '12:00',
    slotMinutes: 60,
    breakWindow: null,
    ...overrides,
  };
}

describe('generateSlots', () => {
  it('returns [] for empty weekdays', () => {
    expect(generateSlots(tpl({ weekdays: [] }))).toEqual([]);
  });

  it('returns [] for weeks < 1', () => {
    expect(generateSlots(tpl({ weeks: 0 }))).toEqual([]);
  });

  it('returns [] for non-positive slotMinutes', () => {
    expect(generateSlots(tpl({ slotMinutes: 0 }))).toEqual([]);
  });

  it('returns [] for an invalid start date', () => {
    expect(generateSlots(tpl({ startDate: 'not-a-date' }))).toEqual([]);
  });

  it('drops slots entirely in the past', () => {
    expect(generateSlots(tpl({ startDate: '2020-01-06' }))).toEqual([]);
  });

  it('generates 3 hourly slots/day across a full future week', () => {
    expect(generateSlots(tpl())).toHaveLength(21); // 3/day * 7 days
  });

  it('makes each slot exactly slotMinutes long', () => {
    const [first] = generateSlots(tpl());
    const ms = new Date(first.endTime).getTime() - new Date(first.startTime).getTime();
    expect(ms).toBe(60 * 60000);
  });

  it('starts the first slot at the window start (local hour)', () => {
    const [first] = generateSlots(tpl());
    expect(new Date(first.startTime).getHours()).toBe(9);
  });

  it('drops a trailing partial slot that overflows the window', () => {
    expect(generateSlots(tpl({ dayEnd: '09:30' }))).toEqual([]);
  });

  it('only includes requested weekdays', () => {
    const days = new Set(
      generateSlots(tpl({ weekdays: [3] })).map((s) => new Date(s.startTime).getDay()),
    );
    expect([...days]).toEqual([3]);
  });

  it('skips slots overlapping the break window', () => {
    const slots = generateSlots(tpl({ breakWindow: { start: '10:00', end: '11:00' } }));
    expect(slots).toHaveLength(14); // 09-10 and 11-12 survive → 2/day * 7
    expect(slots.some((s) => new Date(s.startTime).getHours() === 10)).toBe(false);
  });
});
