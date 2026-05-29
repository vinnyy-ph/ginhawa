import { IsString, IsOptional } from 'class-validator';

export class UpdateMedicalRecordDto {
  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  prescription?: string;

  @IsOptional()
  @IsString()
  recommendations?: string;

  @IsOptional()
  @IsString()
  followUpAdvice?: string;
}
