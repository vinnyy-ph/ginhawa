/**
 * DTO for PATCH /doctors/slots/:id.
 * Currently only `status` is updatable via this endpoint; time range changes
 * would require re-running overlap validation (not yet supported).
 */
import { IsEnum, IsOptional } from 'class-validator';
import { SlotStatus } from '@prisma/client';

/** Validates a partial slot update body. */
export class UpdateSlotDto {
  @IsOptional()
  @IsEnum(SlotStatus)
  status?: SlotStatus;
}
