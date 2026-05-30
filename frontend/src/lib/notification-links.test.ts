import { describe, it, expect } from 'vitest';
import { notificationHref } from './notification-links';

describe('notificationHref', () => {
  it('routes appointment notifications by role', () => {
    expect(notificationHref('APPOINTMENT_BOOKED', 'doctor')).toBe('/doctor/appointments');
    expect(notificationHref('APPOINTMENT_CONFIRMED', 'patient')).toBe('/appointments');
  });

  it('routes record notifications to patients only', () => {
    expect(notificationHref('PRESCRIPTION_READY', 'patient')).toBe('/records');
    expect(notificationHref('MEDICAL_RECORD_CREATED', 'doctor')).toBeNull();
  });

  it('returns null for types without a destination', () => {
    expect(notificationHref('GENERAL', 'patient')).toBeNull();
    expect(notificationHref('UNKNOWN', 'doctor')).toBeNull();
  });
});
