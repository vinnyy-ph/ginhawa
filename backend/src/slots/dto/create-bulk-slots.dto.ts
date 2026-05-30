/**
 * DTO for POST /doctors/slots/bulk — create up to 1 000 availability slots atomically.
 * Each slot in the array is validated as a `SlotInputDto`. Slots with invalid ranges
 * or overlaps are silently skipped by the service; the response includes `skipped` count.
 */
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsNotEmpty,
  ValidateNested,
} from 'class-validator';

/** A single slot entry within a bulk-create request. */
export class SlotInputDto {
  @IsNotEmpty()
  @IsDateString()
  startTime: string;

  @IsNotEmpty()
  @IsDateString()
  endTime: string;
}

/** Validates the body of a bulk slot creation request. */
export class CreateBulkSlotsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(1000)
  @ValidateNested({ each: true })
  @Type(() => SlotInputDto)
  slots: SlotInputDto[];
}
