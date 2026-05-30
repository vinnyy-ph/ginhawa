/**
 * AppointmentsModule — booking lifecycle and appointment history ownership.
 * Imports NotificationsModule so the service can send push events after
 * booking, status, and reschedule operations.
 */
import { Module } from '@nestjs/common';
import { AppointmentsController } from './appointments.controller';
import { AppointmentsService } from './appointments.service';
import { PrismaModule } from '../infrastructure/prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [PrismaModule, NotificationsModule],
  controllers: [AppointmentsController],
  providers: [AppointmentsService],
})
export class AppointmentsModule {}
