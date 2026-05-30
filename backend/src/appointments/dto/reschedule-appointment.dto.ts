/**
 * DTO for POST /appointments/:id/reschedule.
 * The target slot must belong to the same doctor as the original appointment,
 * be AVAILABLE, and be in the future — validated in the service.
 */
import { IsString, IsNotEmpty } from 'class-validator';

/** Validates the body of an appointment reschedule request. */
export class RescheduleAppointmentDto {
  @IsString()
  @IsNotEmpty()
  newSlotId: string;
}
