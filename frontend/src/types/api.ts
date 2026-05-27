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
  languagesSpoken?: string;
  consultationFee?: number;
  consultationFocusAreas?: string;
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
  bookedAt: string;
  updatedAt: string;
  // Included relations (from backend include: { doctor: true, slot: true })
  doctor?: DoctorProfile;
  patient?: PatientSummary;
  slot?: AvailabilitySlot;
}

// ─── Medical Record ──────────────────────────────────────────────────────────

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
  patientId: string;
  symptomInput: string;
  matchedSpecialization: string;
  createdAt: string;
}
