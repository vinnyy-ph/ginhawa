/**
 * DTO for PATCH /doctors/profile.
 * All fields from `CreateDoctorDto` become optional via NestJS `PartialType`,
 * preserving every validation decorator while making none of them required.
 */
import { PartialType } from '@nestjs/mapped-types';
import { CreateDoctorDto } from './create-doctor.dto';

/** Validates a partial doctor profile update body. */
export class UpdateDoctorDto extends PartialType(CreateDoctorDto) {}
