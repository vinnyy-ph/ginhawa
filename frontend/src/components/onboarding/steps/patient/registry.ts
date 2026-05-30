/**
 * Patient onboarding step registry — patient flow.
 *
 * Single source of truth for step order, slugs, titles, and components in the
 * patient onboarding flow. To add, remove, or reorder a step, edit this file
 * only — the page shell reads `PATIENT_STEPS` at runtime to drive navigation,
 * progress indicators, and the guard (`firstIncompletePatientSlug`).
 *
 * Steps 2–5 are all optional (skippable via `nav.goToReview()`); only step 1
 * ("personal") is required by the guard before the patient may advance.
 */
import type { StepDef } from '@/components/onboarding/steps/types';
import { PersonalStep } from './personal';
import { LocationStep } from './location';
import { BodyMetricsStep } from './body-metrics';
import { MedicalHistoryStep } from './medical-history';
import { PhotoStep } from './photo';
import { ReviewStep } from './review';

export const PATIENT_BASE_PATH = '/onboarding';

// Order lives here. Reordering / adding / removing a step = edit this array only.
export const PATIENT_STEPS: StepDef[] = [
  { slug: 'personal', title: 'Personal Information', subtitle: 'Tell us a little about yourself so your doctors have context.', Component: PersonalStep },
  { slug: 'location', title: 'Location & Insurance', subtitle: 'Optional — helps with billing and connecting you to nearby care. You can skip any field.', Component: LocationStep },
  { slug: 'body-metrics', title: 'Body Metrics', subtitle: 'Your weight and height help doctors give accurate advice.', Component: BodyMetricsStep },
  { slug: 'medical-history', title: 'Medical History', subtitle: 'Helps your doctor understand your health context. All optional and kept private — separate items with commas.', Component: MedicalHistoryStep },
  { slug: 'photo', title: 'Profile Picture', subtitle: 'Add a photo so doctors can recognise you — optional.', Component: PhotoStep },
  { slug: 'review', title: 'One last check', subtitle: 'Tap EDIT on any field to fix it right here.', card: false, Component: ReviewStep },
];
