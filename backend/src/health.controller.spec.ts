import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

describe('HealthController', () => {
  let healthController: HealthController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [HealthService],
    }).compile();

    healthController = app.get<HealthController>(HealthController);
  });

  describe('check', () => {
    it('reports ok with an ISO timestamp', () => {
      const result = healthController.check();
      expect(result.status).toBe('ok');
      expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp);
    });
  });
});
