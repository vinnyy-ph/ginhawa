/**
 * Types and default values for the doctor onboarding multi-step form state.
 *
 * `DoctorOnboardingData` is the single source of truth held in form state;
 * it is split across credential, profile, and availability steps before being
 * POSTed to the backend.
 */

/**
 * Complete form state for the doctor onboarding wizard.
 * Collected across multiple steps; submitted as a single profile creation request.
 */
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

/** Blank initial state for the doctor onboarding form. */
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
