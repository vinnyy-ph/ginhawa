/**
 * Request body for PATCH /medical-records/:id.
 * All fields are optional; only the provided fields will be updated.
 * Structured prescription items cannot be modified through this endpoint.
 */
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
