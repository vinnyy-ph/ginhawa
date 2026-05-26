import { DoctorProfile } from '@prisma/client';

export type PublicDoctorProfile = Omit<DoctorProfile, 'userId' | 'createdAt' | 'updatedAt'>;

export function toPublicDoctorProfile(profile: DoctorProfile): PublicDoctorProfile {
  const {
    userId,
    createdAt,
    updatedAt,
    ...publicFields
  } = profile;
  
  return publicFields;
}
