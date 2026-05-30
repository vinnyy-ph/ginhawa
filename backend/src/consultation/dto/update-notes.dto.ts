/**
 * Request body for PATCH /consultation/:id/notes.
 * Carries the full text of the doctor's live session notes.
 */
import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class UpdateNotesDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(10000)
  notes: string;
}
