/**
 * DTO for POST /appointments — book a new appointment.
 * The `slotId` references an `AvailabilitySlot` that must be AVAILABLE and in the future.
 */
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

/** Validates the body of the appointment booking request. */
export class CreateAppointmentDto {
  @IsString()
  @IsNotEmpty()
  slotId: string;

  @IsString()
  @IsOptional()
  reasonForVisit?: string;
}
