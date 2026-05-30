/**
 * SpecializationsModule — read-only reference data for medical specializations.
 * Service is not exported; no other module needs to query specializations programmatically.
 */
import { Module } from '@nestjs/common';
import { SpecializationsService } from './specializations.service';
import { SpecializationsController } from './specializations.controller';
import { PrismaModule } from '../infrastructure/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [SpecializationsController],
  providers: [SpecializationsService],
})
export class SpecializationsModule {}
