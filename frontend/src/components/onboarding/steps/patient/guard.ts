import { step1Schema } from '@/lib/schemas/onboarding.schemas';
import type { OnboardingData } from '@/types/patient';

/** First step the patient still needs to complete, or null if cleared to roam. */
export function firstIncompletePatientSlug(data: OnboardingData): string | null {
  const personalOk = step1Schema.safeParse({
    fullName: data.fullName,
    birthdate: data.birthdate,
    contactDetails: data.contactDetails,
  }).success;
  return personalOk ? null : 'personal';
}
