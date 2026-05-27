import { DoctorProfile, AvailabilitySlot } from '@prisma/client';

export type PublicDoctorProfile = Omit<
  DoctorProfile,
  'userId' | 'createdAt' | 'updatedAt'
> & {
  availabilitySlots?: AvailabilitySlot[];
};

export function toPublicDoctorProfile(
  profile: DoctorProfile & { availabilitySlots?: AvailabilitySlot[] },
): PublicDoctorProfile {
  const {
    userId: _userId,
    createdAt: _createdAt,
    updatedAt: _updatedAt,
    ...publicFields
  } = profile;

  void _userId;
  void _createdAt;
  void _updatedAt;

  return publicFields;
}
