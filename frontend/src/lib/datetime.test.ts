import { describe, it, expect, vi, afterEach } from 'vitest';
import { formatPHTime, formatPHDate, formatRelativeTime } from './datetime';

describe('formatPHTime', () => {
  it('renders an instant in Asia/Manila (UTC+8)', () => {
    // 06:00 UTC → 14:00 PH → "2:00 PM"
    const out = formatPHTime('2026-05-30T06:00:00Z');
    expect(out).toMatch(/2:00/);
    expect(out).toMatch(/p\.?m\.?/i);
  });
});

describe('formatPHDate', () => {
  it('renders the Manila calendar date', () => {
    const out = formatPHDate('2026-05-30T06:00:00Z');
    expect(out).toContain('2026');
    expect(out).toContain('30');
  });
});

describe('formatRelativeTime', () => {
  afterEach(() => vi.useRealTimers());

  it('labels recent and older instants', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-30T12:00:00Z'));
    const ago = (mins: number) => new Date(Date.now() - mins * 60000).toISOString();

    expect(formatRelativeTime(ago(0.5))).toBe('Just now');
    expect(formatRelativeTime(ago(5))).toBe('5m ago');
    expect(formatRelativeTime(ago(180))).toBe('3h ago');
    expect(formatRelativeTime(ago(60 * 25))).toBe('Yesterday');
  });
});
