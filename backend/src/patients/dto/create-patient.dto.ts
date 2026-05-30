/**
 * DTO for POST /patients/profile — validated body for initial patient profile creation.
 * `fullName`, `birthdate`, and `contactDetails` are required; all other fields are optional
 * and can be supplied later via UpdatePatientDto.
 */
import {
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Min,
} from 'class-validator';

export class CreatePatientDto {
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @IsDateString()
  @IsNotEmpty()
  birthdate: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  weight?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  height?: number;

  @IsOptional()
  @IsUrl({ require_tld: false })
  profilePictureUrl?: string;

  @IsString()
  @IsNotEmpty()
  contactDetails: string;

  @IsOptional()
  @IsString()
  medicalHistory?: string;

  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  region?: string;

  @IsOptional()
  @IsString()
  philhealthId?: string;

  @IsOptional()
  @IsString()
  hmoProvider?: string;

  @IsOptional()
  @IsString()
  hmoCardNo?: string;
}
