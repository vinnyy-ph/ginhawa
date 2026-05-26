import {
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
} from 'class-validator';

export class CreatePatientDto {
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @IsDateString()
  @IsNotEmpty()
  birthdate: string;

  @IsNumber()
  @IsOptional()
  weight?: number;

  @IsNumber()
  @IsOptional()
  height?: number;

  @IsUrl({ require_tld: false })
  @IsOptional()
  profilePictureUrl?: string;

  @IsString()
  @IsOptional()
  contactDetails?: string;

  @IsString()
  @IsOptional()
  medicalHistory?: string;
}
