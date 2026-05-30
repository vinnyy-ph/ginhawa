import { toPublicDoctorProfile } from './public-doctor.dto';

describe('toPublicDoctorProfile', () => {
  const base = {
    id: 'doc-1',
    userId: 'user-1',
    fullName: 'Dr. Ana Reyes',
    professionalTitle: 'MD',
    bio: null,
    specialization: 'Cardiology',
    profilePictureUrl: null,
    availabilitySummary: null,
    yearsOfExperience: 10,
    languagesSpoken: ['English'],
    consultationFocusAreas: null,
    consultationFee: 500,
    prcLicenseNo: '0012345',
    prcLicenseExpiry: new Date('2027-01-01'),
    ptrNo: 'PTR-999',
    region: 'NCR',
    city: 'Makati',
    isVerified: true,
    isActive: true,
    verifiedAt: new Date('2026-01-01'),
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  it('omits sensitive and internal fields', () => {
    const result = toPublicDoctorProfile({ ...base });
    expect(result).not.toHaveProperty('userId');
    expect(result).not.toHaveProperty('createdAt');
    expect(result).not.toHaveProperty('updatedAt');
    expect(result).not.toHaveProperty('ptrNo');
    expect(result).not.toHaveProperty('prcLicenseExpiry');
    expect(result).not.toHaveProperty('isActive');
    expect(result).not.toHaveProperty('verifiedAt');
  });

  it('keeps public fields and passes through specializations', () => {
    const specializations = [
      { isPrimary: true, specialization: { id: 's1', name: 'Cardiology' } },
    ];
    const result = toPublicDoctorProfile({ ...base, specializations });
    expect(result.prcLicenseNo).toBe('0012345');
    expect(result.isVerified).toBe(true);
    expect(result.city).toBe('Makati');
    expect(result.region).toBe('NCR');
    expect(result.specializations).toEqual(specializations);
  });
});
