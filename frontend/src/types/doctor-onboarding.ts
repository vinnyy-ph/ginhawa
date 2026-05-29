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
  prcLicenseNo: string;
  prcLicenseExpiry: string; // "YYYY-MM-DD"
  ptrNo: string;
  region: string;
  city: string;
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
  prcLicenseNo: '',
  prcLicenseExpiry: '',
  ptrNo: '',
  region: '',
  city: '',
};
