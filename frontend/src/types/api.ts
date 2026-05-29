// frontend/src/types/api.ts
// Shared TypeScript types matching backend Prisma models

export type AppointmentStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'CANCELLED'
  | 'COMPLETED'
  | 'RESCHEDULED';

export type SlotStatus = 'AVAILABLE' | 'BOOKED' | 'BLOCKED';

// ─── Doctor ─────────────────────────────────────────────────────────────────

export interface DoctorSpecializationLink {
  isPrimary: boolean;
  specialization: { id: string; name: string };
}

export interface DoctorProfile {
  id: string;
  userId?: string;
  fullName: string;
  professionalTitle: string;
  specialization: string;
  bio?: string;
  profilePictureUrl?: string;
  availabilitySummary?: string;
  yearsOfExperience?: number;
  languagesSpoken?: string[];
  consultationFee?: number;
  consultationFocusAreas?: string;
  city?: string;
  region?: string;
  isVerified?: boolean;
  prcLicenseNo?: string;
  specializations?: DoctorSpecializationLink[];
  availabilitySlots?: AvailabilitySlot[];
  avgRating?: number;
  reviewCount?: number;
}

export interface DoctorReview {
  id: string;
  rating: number;
  comment?: string | null;
  createdAt: string;
  patient: { fullName: string; profilePictureUrl?: string | null };
}

// ─── Availability Slot ───────────────────────────────────────────────────────

export interface AvailabilitySlot {
  id: string;
  doctorId: string;
  startTime: string; // ISO datetime string
  endTime: string;   // ISO datetime string
  status: SlotStatus;
  createdAt: string;
  updatedAt: string;
}

// ─── Appointment ─────────────────────────────────────────────────────────────

export interface PatientSummary {
  id: string;
  fullName: string;
  profilePictureUrl?: string | null;
}

export interface Appointment {
  id: string;
  patientId: string;
  doctorId: string;
  slotId: string;
  status: AppointmentStatus;
  reasonForVisit: string;
  consultationLink?: string | null;
  liveNotes?: string | null;
  bookedAt: string;
  updatedAt: string;
  // Included relations (from backend include: { doctor: true, slot: true })
  doctor?: DoctorProfile;
  patient?: PatientSummary;
  slot?: AvailabilitySlot;
  medicalRecord?: MedicalRecord | null;
}

// ─── Doctor's patients (GET /appointments/doctor/patients) ──────────────────

export interface DoctorPatientSummary {
  patient: PatientSummary;
  totalVisits: number;
  upcomingCount: number;
  lastVisit: string | null; // ISO datetime of latest past visit
  searchText: string;
}

// GET /appointments/doctor/patients/:patientId
export interface DoctorPatientHistory {
  patient: PatientSummary & {
    birthdate: string;
    phoneNumber?: string | null;
    city?: string | null;
    region?: string | null;
    medicalHistory?: string | null;
  };
  appointments: Appointment[]; // each may include medicalRecord + prescriptions
}

// ─── Patient's doctors (GET /appointments/patient/doctors) ──────────────────

export interface PatientDoctorSummary {
  doctor: {
    id: string; // DoctorProfile.id — use for /doctors/[id] links
    fullName: string;
    professionalTitle: string;
    specialization: string;
    profilePictureUrl?: string | null;
  };
  totalVisits: number;
  upcomingCount: number;
  lastVisit: string | null; // ISO datetime of latest past visit
}

// ─── Medical Record ──────────────────────────────────────────────────────────

export interface Prescription {
  id: string;
  medicalRecordId: string;
  drugName: string;
  dosage: string;
  frequency: string;
  durationDays?: number | null;
  instructions?: string | null;
  issuedAt: string;
}

export interface MedicalRecord {
  id: string;
  appointmentId: string;
  patientId: string;
  doctorId: string;
  notes?: string | null;
  prescription?: string | null;
  recommendations?: string | null;
  followUpAdvice?: string | null;
  createdAt: string;
  // Included relations
  doctor?: DoctorProfile;
  appointment?: Appointment;
  prescriptions?: Prescription[];
}

// ─── Notification ─────────────────────────────────────────────────────────────

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  readAt?: string | null;
  createdAt: string;
}

// ─── Recommendation ───────────────────────────────────────────────────────────

export interface RecommendationLog {
  id: string;
  patientId: string | null;
  symptomInput: string;
  matchedSpecialization: string;
  aiExplanation?: string;
  createdAt: string;
}
