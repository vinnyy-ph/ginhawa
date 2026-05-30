import { describe, it, expect } from 'vitest';
import { firstIncompletePatientSlug } from './guard';
import { ONBOARDING_DEFAULTS } from '@/types/patient-profile';

describe('firstIncompletePatientSlug', () => {
  it('returns "personal" when required personal fields are missing', () => {
    expect(firstIncompletePatientSlug(ONBOARDING_DEFAULTS)).toBe('personal');
  });

  it('returns null once personal info is complete', () => {
    const data = {
      ...ONBOARDING_DEFAULTS,
      fullName: 'Juan Dela Cruz',
      birthdate: '1990-01-01',
      contactDetails: '9171234567',
    };
    expect(firstIncompletePatientSlug(data)).toBeNull();
  });
});
