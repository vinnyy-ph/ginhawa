import {
  IsString,
  IsOptional,
  IsNumber,
  IsDateString,
  Min,
  MaxLength,
} from 'class-validator';

export class CreateDoctorDto {
  @IsString()
  @MaxLength(255)
  fullName: string;

  @IsString()
  @MaxLength(255)
  professionalTitle: string;

  @IsString()
  @MaxLength(255)
  specialization: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  bio?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  profilePictureUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  availabilitySummary?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  yearsOfExperience?: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  languagesSpoken?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  consultationFocusAreas?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  consultationFee?: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  prcLicenseNo?: string;

  @IsOptional()
  @IsDateString()
  prcLicenseExpiry?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  ptrNo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  region?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  city?: string;
}
