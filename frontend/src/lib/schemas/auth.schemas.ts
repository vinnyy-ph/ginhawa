// frontend/src/lib/schemas/auth.schemas.ts

/**
 * Zod validation schemas for the authentication forms (login and sign-up).
 */

import { z } from 'zod';

/** Validates the login form: requires a valid email and a non-empty password. */
export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

/**
 * Validates the sign-up form.
 * Password must be at least 8 characters and contain at least one digit.
 * A cross-field refinement enforces that `password` and `confirmPassword` match.
 */
export const signupSchema = z
  .object({
    email: z
      .string()
      .min(1, 'Email is required')
      .email('Enter a valid email address'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters and include a number')
      .regex(/\d/, 'Password must be at least 8 characters and include a number'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  });

export type LoginSchema = z.infer<typeof loginSchema>;
export type SignupSchema = z.infer<typeof signupSchema>;
