import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsService } from './notifications.service';
import { PrismaService } from '../infrastructure/prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';
import { NotificationType } from '@prisma/client';

describe('NotificationsService', () => {
  let service: NotificationsService;

  const mockPrismaService = {
    notification: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();
    service = module.get<NotificationsService>(NotificationsService);
    jest.clearAllMocks();
  });

  describe('findAllForUser', () => {
    it("returns the user's notifications newest-first", async () => {
      const rows = [{ id: 'n-1' }, { id: 'n-2' }];
      mockPrismaService.notification.findMany.mockResolvedValue(rows);

      const result = await service.findAllForUser('user-1');

      expect(mockPrismaService.notification.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toBe(rows);
    });
  });

  describe('markAsRead', () => {
    it('stamps readAt when the notification belongs to the user', async () => {
      mockPrismaService.notification.findFirst.mockResolvedValue({ id: 'n-1' });
      mockPrismaService.notification.update.mockResolvedValue({ id: 'n-1' });

      await service.markAsRead('user-1', 'n-1');

      expect(mockPrismaService.notification.findFirst).toHaveBeenCalledWith({
        where: { id: 'n-1', userId: 'user-1' },
      });
      expect(mockPrismaService.notification.update).toHaveBeenCalledWith({
        where: { id: 'n-1' },
        data: { readAt: expect.any(Date) },
      });
    });

    it('throws NotFound when the notification is missing or not owned', async () => {
      mockPrismaService.notification.findFirst.mockResolvedValue(null);

      await expect(service.markAsRead('user-1', 'n-x')).rejects.toThrow(
        NotFoundException,
      );
      expect(mockPrismaService.notification.update).not.toHaveBeenCalled();
    });
  });

  describe('createNotification', () => {
    it('persists a notification with the given fields', async () => {
      mockPrismaService.notification.create.mockResolvedValue({ id: 'n-1' });

      await service.createNotification(
        'user-1',
        NotificationType.APPOINTMENT_CONFIRMED,
        'Confirmed',
        'Your appointment is confirmed.',
      );

      expect(mockPrismaService.notification.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          type: NotificationType.APPOINTMENT_CONFIRMED,
          title: 'Confirmed',
          message: 'Your appointment is confirmed.',
        },
      });
    });
  });

  describe('stream$', () => {
    it('emits the created notification on the stream', async () => {
      const row = { id: 'n-1', userId: 'user-1' };
      mockPrismaService.notification.create.mockResolvedValue(row);
      const spy = jest.fn();
      const sub = (
        service as unknown as {
          stream$: {
            subscribe: (f: (v: unknown) => void) => { unsubscribe: () => void };
          };
        }
      ).stream$.subscribe(spy);

      await service.createNotification(
        'user-1',
        NotificationType.APPOINTMENT_CONFIRMED,
        't',
        'm',
      );

      expect(spy).toHaveBeenCalledWith(row);
      sub.unsubscribe();
    });
  });

  describe('streamForUser', () => {
    it('emits only the target user notifications, JSON-encoded', (done) => {
      const sub = service.streamForUser('user-1').subscribe((event) => {
        expect(event.type).toBe('notification');
        expect(JSON.parse(event.data as string).id).toBe('n-1');
        sub.unsubscribe();
        done();
      });

      const stream$ = (
        service as unknown as { stream$: { next: (v: unknown) => void } }
      ).stream$;
      stream$.next({ id: 'n-2', userId: 'user-2' }); // filtered out
      stream$.next({ id: 'n-1', userId: 'user-1' }); // delivered
    });
  });
});
