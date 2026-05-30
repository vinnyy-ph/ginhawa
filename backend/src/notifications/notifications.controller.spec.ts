import { Test, TestingModule } from '@nestjs/testing';
import { of } from 'rxjs';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

describe('NotificationsController', () => {
  let controller: NotificationsController;

  const mockService = {
    findAllForUser: jest.fn(),
    markAsRead: jest.fn(),
    streamForUser: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationsController],
      providers: [{ provide: NotificationsService, useValue: mockService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();
    controller = module.get<NotificationsController>(NotificationsController);
    jest.clearAllMocks();
  });

  it("returns the authed user's SSE stream", () => {
    const stream = of({ type: 'notification', data: '{}' });
    mockService.streamForUser.mockReturnValue(stream);

    const result = controller.stream({ user: { id: 'user-1' } });

    expect(mockService.streamForUser).toHaveBeenCalledWith('user-1');
    expect(result).toBe(stream);
  });
});
