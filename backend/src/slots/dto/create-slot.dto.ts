import { IsDateString, IsNotEmpty } from 'class-validator';

export class CreateSlotDto {
  @IsNotEmpty()
  @IsDateString()
  startTime: string;

  @IsNotEmpty()
  @IsDateString()
  endTime: string;
}
