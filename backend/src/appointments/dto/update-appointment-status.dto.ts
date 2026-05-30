/**
 * DTO for PATCH /appointments/:id/status.
 * Which `status` values are actually permitted depends on the caller's role and
 * the appointment's current status — enforced by `isAllowedTransition` in the service.
 */
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { AppointmentStatus } from '@prisma/client';

/** Validates a status-update request body. */
export class UpdateAppointmentStatusDto {
  @IsEnum(AppointmentStatus)
  @IsNotEmpty()
  status: AppointmentStatus;

  /** Required when `status` is CANCELLED; stored on the appointment record for audit purposes. */
  @IsOptional()
  @IsString()
  cancelReason?: string;
}
