import { describe, it, expect } from 'vitest';
import { firstIncompleteDoctorSlug } from './guard';
import { DOCTOR_ONBOARDING_DEFAULTS } from '@/types/doctor-onboarding';

const withPersonal = {
  ...DOCTOR_ONBOARDING_DEFAULTS,
  fullName: 'Dr. Jane Doe',
  professionalTitle: 'MD',
};
const withCreds = {
  ...withPersonal,
  prcLicenseNo: '1234567',
  prcLicenseExpiry: '2999-01-01',
};
const complete = { ...withCreds, specialization: 'Cardiology' };

describe('firstIncompleteDoctorSlug', () => {
  it('returns "personal" when name/title missing', () => {
    expect(firstIncompleteDoctorSlug(DOCTOR_ONBOARDING_DEFAULTS)).toBe('personal');
  });

  it('returns "credentials" when only personal is done', () => {
    expect(firstIncompleteDoctorSlug(withPersonal)).toBe('credentials');
  });

  it('returns "specialization" when credentials are done but specialization is blank', () => {
    expect(firstIncompleteDoctorSlug(withCreds)).toBe('specialization');
  });

  it('returns null when all required steps are complete', () => {
    expect(firstIncompleteDoctorSlug(complete)).toBeNull();
  });
});
