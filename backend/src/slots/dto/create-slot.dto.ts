/**
 * DTO for POST /doctors/slots — create a single availability slot.
 * Both fields are ISO 8601 datetime strings; the service validates that
 * `startTime < endTime` and checks for overlaps.
 */
import { IsDateString, IsNotEmpty } from 'class-validator';

/** Validates the body of a single slot creation request. */
export class CreateSlotDto {
  @IsNotEmpty()
  @IsDateString()
  startTime: string;

  @IsNotEmpty()
  @IsDateString()
  endTime: string;
}
