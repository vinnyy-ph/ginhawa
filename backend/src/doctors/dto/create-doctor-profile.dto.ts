import { IsString, IsOptional, IsNumber, IsDateString, IsUrl, Min } from 'class-validator';

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
  @IsString()
  languagesSpoken?: string;

  @IsOptional()
  @IsString()
  consultationFocusAreas?: string;

  @IsOptional()
  @IsString()
  availabilitySummary?: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  profilePictureUrl?: string;

  @IsOptional()
  @IsString()
  prcLicenseNo?: string;

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
