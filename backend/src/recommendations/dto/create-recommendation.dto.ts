import { IsNotEmpty, IsString } from 'class-validator';

/**
 * Request body shared by both recommendation endpoints. `symptomInput` is the
 * patient's free text — either symptoms to triage or a doctor preference to
 * match against.
 */
export class CreateRecommendationDto {
  @IsString()
  @IsNotEmpty()
  symptomInput: string;
}
