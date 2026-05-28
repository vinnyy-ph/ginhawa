import { Test, TestingModule } from '@nestjs/testing';
import { RecommendationsService } from './recommendations.service';
import { PrismaService } from '../prisma/prisma.service';
import { InternalServerErrorException, NotFoundException } from '@nestjs/common';

const mockGenerateContent = jest.fn();

jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: jest.fn().mockReturnValue({
      generateContent: mockGenerateContent,
    }),
  })),
}));

describe('RecommendationsService', () => {
  let service: RecommendationsService;

  const mockPrismaService = {
    patientProfile: { findUnique: jest.fn() },
    recommendationLog: { create: jest.fn(), findMany: jest.fn() },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecommendationsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<RecommendationsService>(RecommendationsService);
    jest.clearAllMocks();
  });

  describe('create (anonymous)', () => {
    it('calls Gemini and saves log with aiExplanation', async () => {
      mockGenerateContent.mockResolvedValue({
        response: { text: () => '{"specialization":"Neurology","explanation":"Test explanation."}' },
      });
      mockPrismaService.recommendationLog.create.mockResolvedValue({
        id: '1',
        patientId: null,
        symptomInput: 'headache',
        matchedSpecialization: 'Neurology',
        aiExplanation: 'Test explanation.',
        createdAt: new Date(),
      });

      const result = await service.create(null, { symptomInput: 'headache' });

      expect(mockGenerateContent).toHaveBeenCalledTimes(1);
      expect(mockPrismaService.recommendationLog.create).toHaveBeenCalledWith({
        data: {
          patientId: null,
          symptomInput: 'headache',
          matchedSpecialization: 'Neurology',
          aiExplanation: 'Test explanation.',
        },
      });
      expect(result.matchedSpecialization).toBe('Neurology');
      expect(result.aiExplanation).toBe('Test explanation.');
    });

    it('strips markdown code fences from Gemini response', async () => {
      mockGenerateContent.mockResolvedValue({
        response: {
          text: () =>
            '```json\n{"specialization":"Cardiology","explanation":"Heart related."}\n```',
        },
      });
      mockPrismaService.recommendationLog.create.mockResolvedValue({
        id: '2',
        patientId: null,
        symptomInput: 'chest pain',
        matchedSpecialization: 'Cardiology',
        aiExplanation: 'Heart related.',
        createdAt: new Date(),
      });

      const result = await service.create(null, { symptomInput: 'chest pain' });
      expect(result.matchedSpecialization).toBe('Cardiology');
    });

    it('throws InternalServerErrorException when Gemini API fails', async () => {
      mockGenerateContent.mockRejectedValue(new Error('API error'));

      await expect(
        service.create(null, { symptomInput: 'headache' }),
      ).rejects.toThrow(InternalServerErrorException);
    });

    it('throws InternalServerErrorException when Gemini returns invalid specialization', async () => {
      mockGenerateContent.mockResolvedValue({
        response: { text: () => '{"specialization":"InvalidSpec","explanation":"Test."}' },
      });

      await expect(
        service.create(null, { symptomInput: 'headache' }),
      ).rejects.toThrow(InternalServerErrorException);
    });

    it('throws InternalServerErrorException when Gemini returns invalid JSON', async () => {
      mockGenerateContent.mockResolvedValue({
        response: { text: () => 'not json at all' },
      });

      await expect(
        service.create(null, { symptomInput: 'headache' }),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('create (logged-in patient)', () => {
    it('fetches patient history and injects context into prompt', async () => {
      mockPrismaService.patientProfile.findUnique.mockResolvedValue({
        id: 'patient-1',
      });
      mockPrismaService.recommendationLog.findMany.mockResolvedValue([
        { matchedSpecialization: 'Cardiology', symptomInput: 'chest pain last month' },
      ]);
      mockGenerateContent.mockResolvedValue({
        response: { text: () => '{"specialization":"Cardiology","explanation":"Given your history of cardiology."}' },
      });
      mockPrismaService.recommendationLog.create.mockResolvedValue({
        id: '3',
        patientId: 'patient-1',
        symptomInput: 'chest tightness',
        matchedSpecialization: 'Cardiology',
        aiExplanation: 'Given your history of cardiology.',
        createdAt: new Date(),
      });

      await service.create('user-1', { symptomInput: 'chest tightness' });

      const promptArg = mockGenerateContent.mock.calls[0][0] as string;
      expect(promptArg).toContain('Patient context');
      expect(promptArg).toContain('Cardiology');
      expect(mockPrismaService.recommendationLog.create).toHaveBeenCalledWith({
        data: {
          patientId: 'patient-1',
          symptomInput: 'chest tightness',
          matchedSpecialization: 'Cardiology',
          aiExplanation: 'Given your history of cardiology.',
        },
      });
    });
  });

  describe('create (EMERGENCY)', () => {
    it('saves EMERGENCY specialization correctly', async () => {
      mockGenerateContent.mockResolvedValue({
        response: { text: () => '{"specialization":"EMERGENCY","explanation":"Seek immediate care."}' },
      });
      mockPrismaService.recommendationLog.create.mockResolvedValue({
        id: '4',
        patientId: null,
        symptomInput: 'chest pain difficulty breathing',
        matchedSpecialization: 'EMERGENCY',
        aiExplanation: 'Seek immediate care.',
        createdAt: new Date(),
      });

      const result = await service.create(null, { symptomInput: 'chest pain difficulty breathing' });
      expect(result.matchedSpecialization).toBe('EMERGENCY');
    });
  });

  describe('findAllForPatient', () => {
    it('returns logs for patient', async () => {
      mockPrismaService.patientProfile.findUnique.mockResolvedValue({ id: 'patient-1' });
      mockPrismaService.recommendationLog.findMany.mockResolvedValue([
        { id: '1', matchedSpecialization: 'Neurology', aiExplanation: 'Test', createdAt: new Date() },
      ]);

      const result = await service.findAllForPatient('user-1');
      expect(result).toHaveLength(1);
    });

    it('throws NotFoundException when patient profile not found', async () => {
      mockPrismaService.patientProfile.findUnique.mockResolvedValue(null);

      await expect(service.findAllForPatient('user-1')).rejects.toThrow(NotFoundException);
    });
  });
});
