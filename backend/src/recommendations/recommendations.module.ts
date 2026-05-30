/**
 * Recommendations module.
 *
 * Imports AiModule (Gemini) for criteria extraction and DoctorsModule for the
 * candidate pool + rating data. Registers DoctorRankingService as the pure
 * scoring engine consumed by RecommendationsService.
 */
import { Module } from '@nestjs/common';
import { RecommendationsService } from './recommendations.service';
import { RecommendationsController } from './recommendations.controller';
import { DoctorRankingService } from './doctor-ranking.service';
import { AiModule } from '../infrastructure/ai/ai.module';
import { DoctorsModule } from '../doctors/doctors.module';

@Module({
  imports: [AiModule, DoctorsModule],
  controllers: [RecommendationsController],
  providers: [RecommendationsService, DoctorRankingService],
})
export class RecommendationsModule {}
