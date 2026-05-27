export interface DoctorOnboardingData {
  fullName: string;
  professionalTitle: string;
  specialization: string;
  bio: string;
  yearsOfExperience: number | null;
  consultationFee: number | null;
  languagesSpoken: string;
  consultationFocusAreas: string;
  availabilitySummary: string;
  profilePictureUrl: string | null;
}

export const DOCTOR_ONBOARDING_DEFAULTS: DoctorOnboardingData = {
  fullName: '',
  professionalTitle: '',
  specialization: '',
  bio: '',
  yearsOfExperience: null,
  consultationFee: null,
  languagesSpoken: '',
  consultationFocusAreas: '',
  availabilitySummary: '',
  profilePictureUrl: null,
};
