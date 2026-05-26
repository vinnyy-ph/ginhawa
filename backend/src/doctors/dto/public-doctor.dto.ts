import { DoctorProfile } from '@prisma/client';

export function toPublicDoctorProfile(profile: DoctorProfile) {
  const {
    userId,
    createdAt,
    updatedAt,
    ...publicFields
  } = profile;
  
  return publicFields;
}
