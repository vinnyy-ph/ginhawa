// frontend/src/lib/schemas/onboarding.schemas.ts
import { z } from 'zod';

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
  philhealthId: z.string().optional(),
  hmoProvider: z.string().optional(),
  hmoCardNo: z.string().optional(),
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
