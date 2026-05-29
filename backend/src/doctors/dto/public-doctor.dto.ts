import { DoctorProfile, AvailabilitySlot } from '@prisma/client';

export interface PublicDoctorSpecialization {
  isPrimary: boolean;
  specialization: { id: string; name: string };
}

export type PublicDoctorProfile = Omit<
  DoctorProfile,
  | 'userId'
  | 'createdAt'
  | 'updatedAt'
  | 'ptrNo'
  | 'prcLicenseExpiry'
  | 'isActive'
  | 'verifiedAt'
> & {
  availabilitySlots?: AvailabilitySlot[];
  specializations?: PublicDoctorSpecialization[];
};

export function toPublicDoctorProfile(
  profile: DoctorProfile & {
    availabilitySlots?: AvailabilitySlot[];
    specializations?: PublicDoctorSpecialization[];
  },
): PublicDoctorProfile {
  const {
    userId: _userId,
    createdAt: _createdAt,
    updatedAt: _updatedAt,
    ptrNo: _ptrNo,
    prcLicenseExpiry: _prcLicenseExpiry,
    isActive: _isActive,
    verifiedAt: _verifiedAt,
    ...publicFields
  } = profile;

  void _userId;
  void _createdAt;
  void _updatedAt;
  void _ptrNo;
  void _prcLicenseExpiry;
  void _isActive;
  void _verifiedAt;

  return publicFields;
}
