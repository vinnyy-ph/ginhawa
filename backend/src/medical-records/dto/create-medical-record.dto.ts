/**
 * Request body for POST /medical-records.
 * Supports both a free-text `prescription` field (legacy) and a structured
 * `prescriptions` array of typed prescription items that are persisted as
 * separate PrescriptionItem rows.
 */
import {
  IsString,
  IsOptional,
  IsNotEmpty,
  IsArray,
  IsInt,
  ValidateNested,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

/** One line-item in a structured prescription attached to a medical record. */
export class PrescriptionItemDto {
  @IsString()
  @IsNotEmpty()
  drugName: string;

  @IsString()
  @IsNotEmpty()
  dosage: string;

  @IsString()
  @IsNotEmpty()
  frequency: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  durationDays?: number;

  @IsOptional()
  @IsString()
  instructions?: string;
}

export class CreateMedicalRecordDto {
  @IsString()
  @IsNotEmpty()
  appointmentId: string;

  @IsString()
  @IsOptional()
  notes?: string;

  /** Free-text prescription field; prefer `prescriptions` for structured data. */
  @IsString()
  @IsOptional()
  prescription?: string;

  @IsString()
  @IsOptional()
  recommendations?: string;

  @IsString()
  @IsOptional()
  followUpAdvice?: string;

  /** Structured prescription line-items; each is validated and stored individually. */
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PrescriptionItemDto)
  prescriptions?: PrescriptionItemDto[];

  /**
   * ID of an already-booked follow-up appointment for the same patient.
   * The service validates that this appointment belongs to the same patient
   * and is not yet linked to another record.
   */
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  followUpAppointmentId?: string;
}
