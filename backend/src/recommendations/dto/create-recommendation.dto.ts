import { IsNotEmpty, IsString } from 'class-validator';

export class CreateRecommendationDto {
  @IsString()
  @IsNotEmpty()
  symptomInput: string;
}
