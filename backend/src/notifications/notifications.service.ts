import { Injectable, NotFoundException, MessageEvent } from '@nestjs/common';
import { PrismaService } from '../infrastructure/prisma/prisma.service';
import { NotificationType, Notification } from '@prisma/client';
import { Subject, merge, interval, Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';

@Injectable()
export class NotificationsService {
  // Single-instance only: every SSE client lives in this one process, so an
  // in-memory Subject reaches them all. If ever scaled to multiple replicas,
  // replace this with Postgres LISTEN/NOTIFY or Redis pub/sub so all instances
  // hear every event.
  private readonly stream$ = new Subject<Notification>();

  constructor(private readonly prisma: PrismaService) {}

  async findAllForUser(userId: string) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

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

  async createNotification(
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
  ) {
    const notification = await this.prisma.notification.create({
      data: { userId, type, title, message },
    });
    this.stream$.next(notification);
    return notification;
  }

  /**
   * Per-user SSE stream. Heartbeat ping every 30s keeps the Railway proxy from
   * idling the connection closed; real notifications are JSON-encoded.
   */
  streamForUser(userId: string): Observable<MessageEvent> {
    const heartbeat$ = interval(30000).pipe(
      map((): MessageEvent => ({ type: 'ping', data: 'ping' })),
    );
    const notifications$ = this.stream$.pipe(
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
