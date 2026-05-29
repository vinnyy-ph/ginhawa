// frontend/src/lib/schemas/onboarding.schemas.ts
import { z } from 'zod';
import { isValidPhilHealth, isValidHmoCard, isValidPrc, isValidPtr } from '@/lib/format';

export const step1Schema = z.object({
  fullName: z.string().min(1, 'Full name is required'),
  birthdate: z
    .string()
    .min(1, 'Birthdate is required')
    .refine((val) => {
      const d = new Date(val);
      return !isNaN(d.getTime()) && d < new Date();
    }, 'Birthdate must be a past date'),
  contactDetails: z.string().length(10, 'Contact number must be exactly 10 digits'),
});

export const step2Schema = z.object({
  weightKg: z
    .number({ message: 'Weight is required' })
    .positive('Weight must be a positive number'),
  heightCm: z
    .number({ message: 'Height is required' })
    .positive('Height must be a positive number'),
});

export const locationInsuranceSchema = z.object({
  address: z.string().optional(),
  city: z.string().optional(),
  region: z.string().optional(),
  philhealthId: z
    .string()
    .optional()
    .refine((v) => isValidPhilHealth(v ?? ''), 'Enter the full 12-digit PhilHealth ID'),
  hmoProvider: z.string().optional(),
  hmoCardNo: z
    .string()
    .optional()
    .refine((v) => isValidHmoCard(v ?? ''), 'Enter the full 12-character HMO card number'),
});

export const medicalHistorySchema = z.object({
  bloodType: z.string().optional(),
  allergies: z.string().optional(),
  chronicConditions: z.string().optional(),
  currentMedications: z.string().optional(),
  pastSurgeries: z.string().optional(),
  familyHistory: z.string().optional(),
  smokingStatus: z.string().optional(),
});

export type Step1Schema = z.infer<typeof step1Schema>;
export type Step2Schema = z.infer<typeof step2Schema>;
export type LocationInsuranceSchema = z.infer<typeof locationInsuranceSchema>;
export type MedicalHistorySchema = z.infer<typeof medicalHistorySchema>;

/** Local (not UTC) date as YYYY-MM-DD — used for "expiry >= today" checks so
 *  the comparison matches the user's calendar day (the app's users are UTC+8). */
export function localTodayISO(): string {
  const d = new Date();
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-');
}

export const doctorCredentialsSchema = z.object({
  prcLicenseNo: z
    .string()
    .min(1, 'PRC license number is required')
    .refine(isValidPrc, 'PRC license number must be 7 digits'),
  prcLicenseExpiry: z
    .string()
    .min(1, 'PRC license expiry is required')
    .refine(
      // input type="date" yields "YYYY-MM-DD"; lexical compare against today is valid.
      // Use >= so a license expiring today is still accepted.
      (val) => val >= localTodayISO(),
      'License expiry must be today or a future date',
    ),
  ptrNo: z
    .string()
    .optional()
    .refine((v) => isValidPtr(v ?? ''), 'PTR number must be 7–8 digits'),
  region: z.string().optional(),
  city: z.string().optional(),
});

export type DoctorCredentialsSchema = z.infer<typeof doctorCredentialsSchema>;
