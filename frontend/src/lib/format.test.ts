import { describe, it, expect } from 'vitest';
import {
  formatPhone,
  formatPhilHealth,
  formatHmoCard,
  isValidPhilHealth,
  isValidHmoCard,
  formatPrc,
  isValidPrc,
  formatPtr,
  isValidPtr,
} from './format';

describe('formatPhone', () => {
  it('groups 10 digits as 3-3-4 and strips non-digits', () => {
    expect(formatPhone('9171234567')).toBe('917 123 4567');
    expect(formatPhone('(917) 123-4567')).toBe('917 123 4567');
  });

  it('caps at 10 digits', () => {
    expect(formatPhone('91712345670000')).toBe('917 123 4567');
  });

  it('is idempotent', () => {
    expect(formatPhone(formatPhone('9171234567'))).toBe('917 123 4567');
  });
});

describe('formatPhilHealth', () => {
  it('groups 12 digits as 2-9-1', () => {
    expect(formatPhilHealth('123456789012')).toBe('12-345678901-2');
  });
});

describe('formatHmoCard', () => {
  it('uppercases and groups every 4 chars', () => {
    expect(formatHmoCard('abcd1234efgh')).toBe('ABCD-1234-EFGH');
  });
});

describe('field validators', () => {
  it('PhilHealth: empty or exactly 12 digits', () => {
    expect(isValidPhilHealth('')).toBe(true);
    expect(isValidPhilHealth('123456789012')).toBe(true);
    expect(isValidPhilHealth('12345')).toBe(false);
  });

  it('HMO: empty or exactly 12 alphanumeric', () => {
    expect(isValidHmoCard('')).toBe(true);
    expect(isValidHmoCard('ABCD1234EFGH')).toBe(true);
    expect(isValidHmoCard('ABC')).toBe(false);
  });

  it('PRC: exactly 7 digits', () => {
    expect(formatPrc('12345678')).toBe('1234567');
    expect(isValidPrc('1234567')).toBe(true);
    expect(isValidPrc('123')).toBe(false);
  });

  it('PTR: empty, 7, or 8 digits', () => {
    expect(formatPtr('123456789')).toBe('12345678');
    expect(isValidPtr('')).toBe(true);
    expect(isValidPtr('1234567')).toBe(true);
    expect(isValidPtr('12345678')).toBe(true);
    expect(isValidPtr('123')).toBe(false);
  });
});
