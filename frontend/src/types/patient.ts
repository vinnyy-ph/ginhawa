// frontend/src/types/patient.ts

export interface OnboardingData {
  // Step 1
  fullName: string;
  birthdate: string;       // ISO date string "YYYY-MM-DD"
  contactDetails: string;
  // Step 2
  weightKg: number | null;
  heightCm: number | null;
  // Step 3
  conditions: string;
  allergies: string;
  medications: string;
  // Step 4
  profilePictureUrl: string | null;
}

export const ONBOARDING_DEFAULTS: OnboardingData = {
  fullName: '',
  birthdate: '',
  contactDetails: '',
  weightKg: null,
  heightCm: null,
  conditions: '',
  allergies: '',
  medications: '',
  profilePictureUrl: null,
};

/** Shape returned by GET /patients/profile */
export interface PatientProfile {
  id: string;
  userId: string;
  fullName: string;
  birthdate: string;
  weight: number | null;
  height: number | null;
  profilePictureUrl: string | null;
  contactDetails: string | null;
  medicalHistory: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Body sent to POST /patients/profile */
export interface CreatePatientProfileBody {
  fullName: string;
  birthdate: string;
  /** Weight in kilograms — maps from OnboardingData.weightKg */
  weight?: number;
  /** Height in centimetres — maps from OnboardingData.heightCm */
  height?: number;
  profilePictureUrl?: string;
  contactDetails?: string;
  /**
   * Free-text medical history merged from three onboarding fields:
   * "Conditions: ...\nAllergies: ...\nMedications: ..."
   */
  medicalHistory?: string;
}
