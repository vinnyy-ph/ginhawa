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
  contactDetails: z.string().min(1, 'Contact number is required'),
});

export const step2Schema = z.object({
  weightKg: z
    .number({ message: 'Weight is required' })
    .positive('Weight must be a positive number'),
  heightCm: z
    .number({ message: 'Height is required' })
    .positive('Height must be a positive number'),
});

export const step3Schema = z.object({
  conditions: z.string().min(1, 'Please list your medical conditions (or "None")'),
  allergies: z.string().min(1, 'Please list your allergies (or "None")'),
  medications: z.string().optional().default(''),
});

export type Step1Schema = z.infer<typeof step1Schema>;
export type Step2Schema = z.infer<typeof step2Schema>;
export type Step3Schema = z.infer<typeof step3Schema>;
