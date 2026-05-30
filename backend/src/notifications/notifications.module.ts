/**
 * NotificationsModule — real-time in-app notification delivery.
 *
 * Exports `NotificationsService` so other feature modules (e.g. AppointmentsModule)
 * can call `createNotification` to persist and fan out events to connected SSE clients.
 */
import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { PrismaModule } from '../infrastructure/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
