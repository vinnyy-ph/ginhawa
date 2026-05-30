/**
 * DTO for user account creation (POST /users and POST /auth/register).
 * Validates the three fields required to establish an identity: email, password, and role.
 */
import { Role } from '@prisma/client';
import { IsEmail, IsEnum, IsNotEmpty, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  /** Minimum 8 characters; stored as a bcrypt hash — never persisted in plaintext. */
  @IsNotEmpty()
  @MinLength(8)
  password: string;

  /** Must be a valid Prisma `Role` enum value (e.g. PATIENT, DOCTOR). Determines access to role-gated routes. */
  @IsEnum(Role)
  @IsNotEmpty()
  role: Role;
}
