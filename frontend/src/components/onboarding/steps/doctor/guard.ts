import { doctorCredentialsSchema } from '@/lib/schemas/onboarding.schemas';
import type { DoctorOnboardingData } from '@/types/doctor-onboarding';

/** First required step the doctor still needs to complete, or null if all done. */
export function firstIncompleteDoctorSlug(data: DoctorOnboardingData): string | null {
  if (!data.fullName.trim() || !data.professionalTitle.trim()) return 'personal';

  const credsOk = doctorCredentialsSchema.safeParse({
    prcLicenseNo: data.prcLicenseNo,
    prcLicenseExpiry: data.prcLicenseExpiry,
    ptrNo: data.ptrNo,
    region: data.region,
    city: data.city,
  }).success;
  if (!credsOk) return 'credentials';

  if (!data.specialization.trim()) return 'specialization';
  return null;
}
