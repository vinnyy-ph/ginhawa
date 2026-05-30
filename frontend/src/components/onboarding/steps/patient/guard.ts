/**
 * Patient onboarding guard — patient flow.
 *
 * Determines the first incomplete required step for a patient. Only the
 * "personal" step (full name, birthdate, contact number) is required — all
 * subsequent steps are optional. The page shell passes the result to
 * `resolveStepSlug` as `blockSlug`, preventing the patient from deep-linking
 * past step 1 before it is complete.
 */
import { step1Schema } from '@/lib/schemas/onboarding.schemas';
import type { OnboardingData } from '@/types/patient-profile';

/** First step the patient still needs to complete, or null if cleared to roam. */
export function firstIncompletePatientSlug(data: OnboardingData): string | null {
  const personalOk = step1Schema.safeParse({
    fullName: data.fullName,
    birthdate: data.birthdate,
    contactDetails: data.contactDetails,
  }).success;
  return personalOk ? null : 'personal';
}
