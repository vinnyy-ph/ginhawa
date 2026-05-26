import { IsString, IsOptional, IsNotEmpty } from 'class-validator';

export class CreateMedicalRecordDto {
  @IsString()
  @IsNotEmpty()
  appointmentId: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  prescription?: string;

  @IsString()
  @IsOptional()
  recommendations?: string;

  @IsString()
  @IsOptional()
  followUpAdvice?: string;
}
