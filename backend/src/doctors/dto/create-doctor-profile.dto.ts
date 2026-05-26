import { IsString, IsOptional, IsNumber, IsUrl, Min } from 'class-validator';

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
}
