import {
  Controller,
  Get,
  Patch,
  Param,
  Sse,
  UseGuards,
  Request,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  findAllForUser(@Request() req: { user: { id: string } }) {
    return this.notificationsService.findAllForUser(req.user.id);
  }

  // NOTE: JwtAuthGuard runs only at connect time. A long-lived SSE connection
  // outlives its JWT; mid-stream expiry is accepted for the MVP (no refresh).
  @Sse('stream')
  stream(@Request() req: { user: { id: string } }) {
    return this.notificationsService.streamForUser(req.user.id);
  }

  @Patch(':id/read')
  markAsRead(
    @Request() req: { user: { id: string } },
    @Param('id') id: string,
  ) {
    return this.notificationsService.markAsRead(req.user.id, id);
  }
}
