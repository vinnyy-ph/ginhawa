import { describe, it, expect, vi, afterEach } from 'vitest';
import { getEarliestAvailability, availabilityBadge } from './availability';
import type { AvailabilitySlot } from '@/types/api';

function slot(startTime: string, status: AvailabilitySlot['status'] = 'AVAILABLE'): AvailabilitySlot {
  return {
    id: startTime,
    doctorId: 'd1',
    startTime,
    endTime: startTime,
    status,
    createdAt: '',
    updatedAt: '',
  };
}

describe('getEarliestAvailability', () => {
  afterEach(() => vi.useRealTimers());

  it('is "booked" with no slots', () => {
    expect(getEarliestAvailability(undefined).kind).toBe('booked');
    expect(getEarliestAvailability([]).kind).toBe('booked');
  });

  it('ignores past and non-available slots', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-01T02:00:00Z')); // 10:00 PH, Jun 1
    const result = getEarliestAvailability([
      slot('2026-05-01T02:00:00Z'), // past
      slot('2026-06-05T02:00:00Z', 'BOOKED'), // not available
    ]);
    expect(result.kind).toBe('booked');
  });

  it('classifies the earliest available slot as today/tomorrow/date', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-01T02:00:00Z')); // 10:00 PH, Jun 1

    expect(getEarliestAvailability([slot('2026-06-01T05:00:00Z')]).kind).toBe('today'); // 13:00 PH Jun 1
    expect(getEarliestAvailability([slot('2026-06-02T05:00:00Z')]).kind).toBe('tomorrow'); // Jun 2 PH

    const later = getEarliestAvailability([slot('2026-06-05T05:00:00Z')]);
    expect(later.kind).toBe('date');
    if (later.kind === 'date') expect(later.label).toContain('Jun');
  });

  it('picks the soonest of several available slots', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-01T02:00:00Z'));
    const result = getEarliestAvailability([
      slot('2026-06-05T05:00:00Z'),
      slot('2026-06-01T05:00:00Z'), // soonest, today
      slot('2026-06-02T05:00:00Z'),
    ]);
    expect(result.kind).toBe('today');
  });
});

describe('availabilityBadge', () => {
  it('maps each result kind to display text', () => {
    expect(availabilityBadge({ kind: 'today' }).text).toBe('Available Today');
    expect(availabilityBadge({ kind: 'tomorrow' }).text).toBe('Tomorrow');
    expect(availabilityBadge({ kind: 'date', label: 'Thu, Jun 5' }).text).toBe('Next: Thu, Jun 5');
    expect(availabilityBadge({ kind: 'booked' }).text).toBe('Fully Booked');
  });
});
