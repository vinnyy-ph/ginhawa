import { Module } from '@nestjs/common';
import { ConsultationService } from './consultation.service';
import { ConsultationController } from './consultation.controller';
import { PrismaModule } from '../infrastructure/prisma/prisma.module';
import { AiModule } from '../infrastructure/ai/ai.module';

@Module({
  imports: [PrismaModule, AiModule],
  controllers: [ConsultationController],
  providers: [ConsultationService],
})
export class ConsultationModule {}
