// frontend/src/types/patient.ts

export interface OnboardingData {
  // Step 1 — Personal
  fullName: string;
  birthdate: string;       // ISO date string "YYYY-MM-DD"
  contactDetails: string;
  // Step 2 — Location & Insurance (all optional)
  address: string;
  city: string;
  region: string;
  philhealthId: string;
  hmoProvider: string;
  hmoCardNo: string;
  // Step 3 — Metrics
  weightKg: number | null;
  heightCm: number | null;
  // Step 4 — Medical History (lists held as comma strings, split on submit)
  bloodType: string;
  allergies: string;
  chronicConditions: string;
  currentMedications: string;
  pastSurgeries: string;
  familyHistory: string;
  smokingStatus: string;
  // Step 5 — Photo
  profilePictureUrl: string | null;
}

export const ONBOARDING_DEFAULTS: OnboardingData = {
  fullName: '',
  birthdate: '',
  contactDetails: '',
  address: '',
  city: '',
  region: '',
  philhealthId: '',
  hmoProvider: '',
  hmoCardNo: '',
  weightKg: null,
  heightCm: null,
  bloodType: '',
  allergies: '',
  chronicConditions: '',
  currentMedications: '',
  pastSurgeries: '',
  familyHistory: '',
  smokingStatus: '',
  profilePictureUrl: null,
};

/** Structured medical history nested under GET /patients/profile */
export interface PatientMedicalHistoryRecord {
  bloodType: string | null;
  allergies: string[];
  chronicConditions: string[];
  currentMedications: string[];
  pastSurgeries: string | null;
  familyHistory: string | null;
  smokingStatus: string | null;
}

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
  address: string | null;
  city: string | null;
  region: string | null;
  philhealthId: string | null;
  hmoProvider: string | null;
  hmoCardNo: string | null;
  medicalHistoryRecord: PatientMedicalHistoryRecord | null;
  createdAt: string;
  updatedAt: string;
}

/** Body sent to POST/PATCH /patients/profile */
export interface CreatePatientProfileBody {
  fullName: string;
  birthdate: string;
  /** Weight in kilograms — maps from OnboardingData.weightKg */
  weight?: number;
  /** Height in centimetres — maps from OnboardingData.heightCm */
  height?: number;
  profilePictureUrl?: string;
  contactDetails?: string;
  address?: string;
  city?: string;
  region?: string;
  philhealthId?: string;
  hmoProvider?: string;
  hmoCardNo?: string;
}

/** Body sent to PATCH /patients/medical-history */
export interface UpdateMedicalHistoryBody {
  bloodType?: string;
  allergies?: string[];
  chronicConditions?: string[];
  currentMedications?: string[];
  pastSurgeries?: string;
  familyHistory?: string;
  smokingStatus?: string;
}
