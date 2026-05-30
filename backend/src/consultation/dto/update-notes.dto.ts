import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class UpdateNotesDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(10000)
  notes: string;
}
