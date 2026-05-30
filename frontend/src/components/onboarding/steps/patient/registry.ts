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
