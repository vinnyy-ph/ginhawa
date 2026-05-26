import { IsEnum, IsOptional } from 'class-validator';
import { SlotStatus } from '@prisma/client';

export class UpdateSlotDto {
  @IsOptional()
  @IsEnum(SlotStatus)
  status?: SlotStatus;
}
