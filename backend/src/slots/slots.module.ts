/**
 * SlotsModule — doctor availability-slot ownership.
 * Exports `SlotsService` so other modules (e.g. AppointmentsModule) can resolve
 * slot records without importing through DoctorsModule.
 */
import { Module } from '@nestjs/common';
import { SlotsService } from './slots.service';
import { SlotsController } from './slots.controller';
import { PrismaModule } from '../infrastructure/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [SlotsController],
  providers: [SlotsService],
  exports: [SlotsService],
})
export class SlotsModule {}
