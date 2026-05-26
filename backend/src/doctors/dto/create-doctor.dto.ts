import { IsString, IsOptional, IsNumber } from 'class-validator';

export class CreateDoctorDto {
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
  @IsString()
  profilePictureUrl?: string;

  @IsOptional()
  @IsString()
  availabilitySummary?: string;

  @IsOptional()
  @IsNumber()
  yearsOfExperience?: number;

  @IsOptional()
  @IsString()
  languagesSpoken?: string;

  @IsOptional()
  @IsString()
  consultationFocusAreas?: string;

  @IsOptional()
  @IsNumber()
  consultationFee?: number;
}
