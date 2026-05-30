// frontend/src/types/api.ts

/**
 * Shared TypeScript types that mirror the backend Prisma models and API response
 * shapes. These types are used across the frontend for type-safe data fetching
 * and component props. They are intentionally kept in sync with the NestJS DTOs
 * and Prisma schema — do not add client-only fields here.
 */
// Shared TypeScript types matching backend Prisma models

export type AppointmentStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'CANCELLED'
  | 'COMPLETED'
  | 'RESCHEDULED';

export type SlotStatus = 'AVAILABLE' | 'BOOKED' | 'BLOCKED';

// ─── Doctor ─────────────────────────────────────────────────────────────────

/** Join-table shape returned when a doctor's specializations are included. */
export interface DoctorSpecializationLink {
  isPrimary: boolean;
  specialization: { id: string; name: string };
}

/** Mirrors the `DoctorProfile` Prisma model; also used as list items in search/discovery. */
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

/** Filters extracted by the AI recommendation engine from the patient's symptom input. */
export interface MatchCriteria {
  specialization: string | null;
  city: string | null;
  region: string | null;
  minYears: number | null;
  minRating: number | null;
}

/** A `DoctorProfile` augmented with AI-generated match score and reasoning. */
export interface MatchedDoctor extends DoctorProfile {
  matchScore: number;
  matchReason: string;
}

/** Top-level response from `POST /recommendations/match`. */
export interface MatchResult {
  explanation: string;
  criteria: MatchCriteria;
  emergency: boolean;
  doctors: MatchedDoctor[];
}

/** A patient review on a doctor; returned by `GET /doctors/:id/reviews`. */
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

/** Minimal patient projection included inside appointment and record responses. */
export interface PatientSummary {
  id: string;
  fullName: string;
  profilePictureUrl?: string | null;
}

/** Mirrors the `Appointment` Prisma model; optional relations are included when
 *  the backend query uses `include: { doctor: true, slot: true }`. */
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

/** Individual prescription line item within a `MedicalRecord`. */
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

/** Mirrors the `MedicalRecord` Prisma model; created by doctors post-consultation. */
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

/** Mirrors the `Notification` Prisma model; delivered via SSE and REST. */
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

/** Audit log entry for an AI recommendation request; returned by `GET /recommendations/history`. */
export interface RecommendationLog {
  id: string;
  patientId: string | null;
  symptomInput: string;
  matchedSpecialization: string;
  aiExplanation?: string;
  createdAt: string;
}
