// frontend/src/types/auth.ts

export type UserRole = 'PATIENT' | 'DOCTOR';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  accessToken: string;
}

export interface LoginFormValues {
  email: string;
  password: string;
}

export interface SignupFormValues {
  email: string;
  password: string;
  confirmPassword: string;
}
