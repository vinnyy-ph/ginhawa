/**
 * Doctor onboarding guard — doctor flow.
 *
 * Determines the first step the doctor must complete before being allowed to
 * advance. The page shell passes the result to `resolveStepSlug` as the
 * `blockSlug`, which then enforces it as a redirect ceiling — the doctor
 * cannot deep-link or navigate past an incomplete required step.
 *
 * Only the three required steps (personal → credentials → specialization) are
 * checked; optional steps (practice, review) are not gated.
 */
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
