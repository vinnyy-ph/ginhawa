/**
 * NestJS module for the reviews feature. Depends only on PrismaModule
 * as no external services are needed for review creation or retrieval.
 */
import { Module } from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { ReviewsController } from './reviews.controller';
import { PrismaModule } from '../infrastructure/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ReviewsController],
  providers: [ReviewsService],
})
export class ReviewsModule {}
