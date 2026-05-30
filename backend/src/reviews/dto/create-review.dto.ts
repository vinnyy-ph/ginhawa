/**
 * Request body for POST /reviews.
 * Ties a star rating (and optional free-text comment) to a specific appointment.
 */
import {
  IsString,
  IsNotEmpty,
  IsInt,
  Min,
  Max,
  IsOptional,
} from 'class-validator';

export class CreateReviewDto {
  @IsString()
  @IsNotEmpty()
  appointmentId: string;

  /** Integer star rating on a 1–5 scale. */
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @IsOptional()
  @IsString()
  comment?: string;
}
