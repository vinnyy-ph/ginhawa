import {
  IsDateString,
  IsNotEmpty,
  IsNumber,
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

  @IsNumber()
  @Min(1)
  weight: number;

  @IsNumber()
  @Min(1)
  height: number;

  @IsUrl({ require_tld: false })
  @IsNotEmpty()
  profilePictureUrl: string;

  @IsString()
  @IsNotEmpty()
  contactDetails: string;

  @IsString()
  @IsNotEmpty()
  medicalHistory: string;
}
