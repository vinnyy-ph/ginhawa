/**
 * Public-facing doctor profile shape and sanitization utility.
 *
 * `PublicDoctorProfile` strips fields that must not be exposed to unauthenticated
 * callers: internal user linkage (`userId`), audit timestamps, PRC license expiry,
 * PTR number, active/verified flags, and the `verifiedAt` timestamp.
 * `toPublicDoctorProfile` performs the stripping at runtime.
 */
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

/**
 * Strip sensitive/internal fields from a raw Prisma `DoctorProfile` before
 * sending it to unauthenticated API consumers.
 *
 * The `void` expressions silence the "variable declared but never read" TS
 * error for the destructured-away fields without adding any runtime overhead.
 */
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
