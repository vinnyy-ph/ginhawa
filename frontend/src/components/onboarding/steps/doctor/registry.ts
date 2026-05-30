import type { StepDef } from '@/components/onboarding/steps/types';
import { PersonalStep } from './personal';
import { CredentialsStep } from './credentials';
import { SpecializationStep } from './specialization';
import { PracticeStep } from './practice';
import { ReviewStep } from './review';

export const DOCTOR_BASE_PATH = '/onboarding/doctor';

// Order lives here. Reordering / adding / removing a step = edit this array only.
export const DOCTOR_STEPS: StepDef[] = [
  { slug: 'personal', title: 'Personal Information', subtitle: 'Let patients know who they are consulting with.', Component: PersonalStep },
  { slug: 'credentials', title: 'Credentials & Licensure', subtitle: 'Required for verification. Your PRC license confirms you are licensed to practice.', Component: CredentialsStep },
  { slug: 'specialization', title: 'Specialization & Experience', subtitle: 'Help patients understand your expertise.', Component: SpecializationStep },
  { slug: 'practice', title: 'Practice Details', subtitle: 'Share more about your practice and availability.', Component: PracticeStep },
  { slug: 'review', title: 'Review Your Profile', subtitle: 'Tap EDIT on any field to fix it right here.', card: false, Component: ReviewStep },
];
