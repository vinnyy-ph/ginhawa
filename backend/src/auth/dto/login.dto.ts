import { IsEmail, IsNotEmpty, MinLength } from 'class-validator';

/**
 * Request body for `POST /auth/login`. Validated by the global ValidationPipe;
 * invalid bodies are rejected with 400 before the controller runs.
 */
export class LoginDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  /** Minimum length mirrors the signup policy so the two stay consistent. */
  @IsNotEmpty()
  @MinLength(8)
  password: string;
}
