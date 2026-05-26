import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateAppointmentDto {
  @IsString()
  @IsNotEmpty()
  slotId: string;

  @IsString()
  @IsOptional()
  reasonForVisit?: string;
}
