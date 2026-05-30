/**
 * DTO for PATCH /patients/profile — all fields from CreatePatientDto become optional,
 * allowing partial updates to any demographic or contact field.
 */
import { PartialType } from '@nestjs/mapped-types';
import { CreatePatientDto } from './create-patient.dto';

export class UpdatePatientDto extends PartialType(CreatePatientDto) {}
