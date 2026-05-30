/**
 * Notifications service — persistence and real-time delivery of in-app notifications.
 *
 * Persists notification records to the database and pushes them to connected SSE
 * clients through an in-memory RxJS Subject. All other modules (e.g. AppointmentsModule)
 * create notifications by calling `createNotification`, which is the single chokepoint
 * that both writes to Postgres and fans out to live streams.
 */
import { Injectable, NotFoundException, MessageEvent } from '@nestjs/common';
import { PrismaService } from '../infrastructure/prisma/prisma.service';
import { NotificationType, Notification } from '@prisma/client';
import { Subject, merge, interval, Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';

/**
 * Core service for notification lifecycle: create, query, mark-read, and stream.
 *
 * Owns the singleton `stream$` Subject that backs all active SSE connections.
 */
@Injectable()
export class NotificationsService {
  // Single-instance only: every SSE client lives in this one process, so an
  // in-memory Subject reaches them all. If ever scaled to multiple replicas,
  // replace this with Postgres LISTEN/NOTIFY or Redis pub/sub so all instances
  // hear every event.
  private readonly stream$ = new Subject<Notification>();

  constructor(private readonly prisma: PrismaService) {}

  /** Returns all notifications for the given user, ordered newest first. */
  async findAllForUser(userId: string) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Marks a notification as read by setting `readAt` to now.
   * Validates ownership (userId match) before updating; throws 404 if not found.
   */
  async markAsRead(userId: string, notificationId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id: notificationId, userId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    return this.prisma.notification.update({
      where: { id: notificationId },
      data: { readAt: new Date() },
    });
  }

  /**
   * Single chokepoint for notification creation used by all other modules.
   * Persists the notification to the database, then immediately pushes it onto
   * `stream$` so any connected SSE client for this user receives it in real time.
   *
   * @param userId - The recipient user's id.
   * @param type - Prisma `NotificationType` enum value (e.g. APPOINTMENT_CONFIRMED).
   * @param title - Short notification title shown in the UI.
   * @param message - Full notification body text.
   */
  async createNotification(
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
  ) {
    const notification = await this.prisma.notification.create({
      data: { userId, type, title, message },
    });
    // Publish to the in-memory bus so live SSE streams receive this immediately.
    this.stream$.next(notification);
    return notification;
  }

  /**
   * Per-user SSE stream. Heartbeat ping every 30s keeps the Railway proxy from
   * idling the connection closed; real notifications are JSON-encoded.
   *
   * Filters `stream$` by `userId` so each client only receives its own events.
   */
  streamForUser(userId: string): Observable<MessageEvent> {
    const heartbeat$ = interval(30000).pipe(
      map((): MessageEvent => ({ type: 'ping', data: 'ping' })),
    );
    const notifications$ = this.stream$.pipe(
      // Only forward notifications that belong to this specific SSE subscriber.
      filter((n) => n.userId === userId),
      map(
        (n): MessageEvent => ({
          type: 'notification',
          data: JSON.stringify(n),
        }),
      ),
    );
    return merge(heartbeat$, notifications$);
  }
}
