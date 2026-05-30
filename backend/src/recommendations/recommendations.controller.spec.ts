import { Test, TestingModule } from '@nestjs/testing';
import { RecommendationsController } from './recommendations.controller';
import { RecommendationsService } from './recommendations.service';

describe('RecommendationsController', () => {
  let controller: RecommendationsController;

  const mockService = {
    createStream: jest.fn(),
    findAllForPatient: jest.fn(),
    match: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RecommendationsController],
      providers: [{ provide: RecommendationsService, useValue: mockService }],
    }).compile();
    controller = module.get<RecommendationsController>(
      RecommendationsController,
    );
    jest.clearAllMocks();
  });

  describe('match', () => {
    it('passes the authenticated user id to the service', async () => {
      const payload = {
        explanation: 'x',
        criteria: {},
        emergency: false,
        doctors: [],
      };
      mockService.match.mockResolvedValue(payload);

      const result = await controller.match(
        { user: { id: 'user-1' } },
        { symptomInput: 'dentist in Manila' },
      );

      expect(mockService.match).toHaveBeenCalledWith('user-1', {
        symptomInput: 'dentist in Manila',
      });
      expect(result).toBe(payload);
    });

    it('passes null when the request is anonymous', async () => {
      mockService.match.mockResolvedValue({ doctors: [] });

      await controller.match({}, { symptomInput: 'skin rash help' });

      expect(mockService.match).toHaveBeenCalledWith(null, {
        symptomInput: 'skin rash help',
      });
    });
  });
});
