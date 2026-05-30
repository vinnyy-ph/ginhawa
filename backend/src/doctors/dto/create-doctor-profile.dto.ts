/**
 * DTO for the POST /doctors/profile (upsert) endpoint.
 *
 * Validated on both create and update paths — all fields except the three
 * required identity fields (`fullName`, `professionalTitle`, `specialization`)
 * are optional so the request body can be built incrementally.
 */
import {
  IsString,
  IsOptional,
  IsNumber,
  IsDateString,
  IsUrl,
  IsArray,
  Min,
} from 'class-validator';

/**
 * Validates the body of the doctor profile upsert request.
 * The `specialization` field drives the primary `DoctorSpecialization` join-table
 * entry and must be an exact string name (the service handles normalization/upsert).
 */
export class CreateDoctorProfileDto {
  @IsString()
  fullName: string;

  @IsString()
  professionalTitle: string;

  @IsString()
  specialization: string;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  yearsOfExperience?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  consultationFee?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  languagesSpoken?: string[];

  @IsOptional()
  @IsString()
  consultationFocusAreas?: string;

  @IsOptional()
  @IsString()
  availabilitySummary?: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  profilePictureUrl?: string;

  /** Philippine Regulatory Commission license number. */
  @IsOptional()
  @IsString()
  prcLicenseNo?: string;

  /** ISO 8601 date string; converted to a `Date` object by the service before persisting. */
  @IsOptional()
  @IsDateString()
  prcLicenseExpiry?: string;

  @IsOptional()
  @IsString()
  ptrNo?: string;

  @IsOptional()
  @IsString()
  region?: string;

  @IsOptional()
  @IsString()
  city?: string;
}
