/**
 * DTO for PATCH /patients/medical-history — structured clinical data for the
 * patient's medical history record. All fields are optional; only supplied
 * fields are written (upsert semantics).
 *
 * Array fields (allergies, chronicConditions, currentMedications) replace the
 * entire stored array on each update — there is no append/remove granularity.
 */
import { IsString, IsOptional, IsArray } from 'class-validator';

export class UpdateMedicalHistoryDto {
  @IsOptional()
  @IsString()
  bloodType?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allergies?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  chronicConditions?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  currentMedications?: string[];

  @IsOptional()
  @IsString()
  pastSurgeries?: string;

  @IsOptional()
  @IsString()
  familyHistory?: string;

  @IsOptional()
  @IsString()
  smokingStatus?: string;
}
