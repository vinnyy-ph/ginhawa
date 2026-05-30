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
