/**
 * Notifications controller — REST + SSE surface for the notifications domain.
 *
 * All routes require a valid JWT (JwtAuthGuard). No admin-only endpoints exist
 * here; every operation is scoped to the authenticated user's own notifications.
 */
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

/**
 * Exposes three endpoints under `/notifications`:
 * - `GET /notifications` — fetch all notifications for the current user
 * - `GET /notifications/stream` — open a per-user SSE connection
 * - `PATCH /notifications/:id/read` — mark a specific notification as read
 *
 * All routes are protected by JwtAuthGuard; the authenticated user id is read
 * from `req.user.id` and passed down to the service so users can only access
 * their own data.
 */
@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  /** GET /notifications — returns all notifications for the current user, newest first. */
  @Get()
  findAllForUser(@Request() req: { user: { id: string } }) {
    return this.notificationsService.findAllForUser(req.user.id);
  }

  // NOTE: JwtAuthGuard runs only at connect time. A long-lived SSE connection
  // outlives its JWT; mid-stream expiry is accepted for the MVP (no refresh).
  /** GET /notifications/stream — opens an SSE stream that emits real-time notifications for the current user. */
  @Sse('stream')
  stream(@Request() req: { user: { id: string } }) {
    return this.notificationsService.streamForUser(req.user.id);
  }

  /** PATCH /notifications/:id/read — marks the specified notification as read. Throws 404 if not found or not owned by the current user. */
  @Patch(':id/read')
  markAsRead(
    @Request() req: { user: { id: string } },
    @Param('id') id: string,
  ) {
    return this.notificationsService.markAsRead(req.user.id, id);
  }
}
