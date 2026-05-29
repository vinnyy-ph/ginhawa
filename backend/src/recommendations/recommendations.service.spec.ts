import { Test, TestingModule } from '@nestjs/testing';
import { RecommendationsService } from './recommendations.service';
import { PrismaService } from '../prisma/prisma.service';
import { InternalServerErrorException, NotFoundException } from '@nestjs/common';

const mockGenerateContentStream = jest.fn();

jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: jest.fn().mockReturnValue({
      generateContentStream: mockGenerateContentStream,
    }),
  })),
  SchemaType: { STRING: 'STRING', OBJECT: 'OBJECT' },
}));

describe('RecommendationsService', () => {
  let service: RecommendationsService;

  const mockPrismaService = {
    patientProfile: { findUnique: jest.fn() },
    recommendationLog: { create: jest.fn(), findMany: jest.fn(), findFirst: jest.fn() },
    patientMedicalHistory: { findUnique: jest.fn() },
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

  async function consumeStream(stream: AsyncGenerator<string, any, unknown> | AsyncIterable<string>): Promise<string> {
    let output = '';
    for await (const chunk of stream) {
      output += chunk;
    }
    return output;
  }

  describe('createStream (anonymous)', () => {
    it('calls Gemini and saves log with aiExplanation', async () => {
      mockGenerateContentStream.mockResolvedValue({
        stream: [{ text: () => '{"specialization":"Neurology","explanation":"Test explanation."}' }],
      });
      mockPrismaService.recommendationLog.create.mockResolvedValue({
        id: '1',
        patientId: null,
        symptomInput: 'headache',
        matchedSpecialization: 'Neurology',
        aiExplanation: 'Test explanation.',
        createdAt: new Date(),
      });

      const stream = await service.createStream(null, { symptomInput: 'headache' });
      const output = await consumeStream(stream);

      expect(mockGenerateContentStream).toHaveBeenCalledTimes(1);
      expect(mockPrismaService.recommendationLog.create).toHaveBeenCalledWith({
        data: {
          patientId: null,
          symptomInput: 'headache',
          matchedSpecialization: 'Neurology',
          aiExplanation: 'Test explanation.',
        },
      });
      expect(output).toBe('{"specialization":"Neurology","explanation":"Test explanation."}');
    });

    it('bubbles up the error when Gemini API fails', async () => {
      mockGenerateContentStream.mockRejectedValue(new Error('API error'));

      const stream = await service.createStream(null, { symptomInput: 'headache' });
      await expect(consumeStream(stream)).rejects.toThrow(Error);
    });

    it('should throw error when JSON parsing fails', async () => {
      mockGenerateContentStream.mockResolvedValue({
        stream: [{ text: () => 'not json at all' }],
      });
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const stream = await service.createStream(null, { symptomInput: 'headache' });
      
      await expect(consumeStream(stream)).rejects.toThrow(SyntaxError);

      // DB log create is NOT called due to parse error
      expect(mockPrismaService.recommendationLog.create).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

  });

  describe('createStream (logged-in patient)', () => {
    it('fetches patient history and injects context into prompt', async () => {
      mockPrismaService.patientProfile.findUnique.mockResolvedValue({
        id: 'patient-1',
      });
      mockPrismaService.recommendationLog.findMany.mockResolvedValue([
        { matchedSpecialization: 'Cardiology', symptomInput: 'chest pain last month' },
      ]);
      mockGenerateContentStream.mockResolvedValue({
        stream: [{ text: () => '{"specialization":"Cardiology","explanation":"Given your history of cardiology."}' }],
      });
      mockPrismaService.recommendationLog.create.mockResolvedValue({
        id: '3',
        patientId: 'patient-1',
        symptomInput: 'chest tightness',
        matchedSpecialization: 'Cardiology',
        aiExplanation: 'Given your history of cardiology.',
        createdAt: new Date(),
      });

      const stream = await service.createStream('user-1', { symptomInput: 'chest tightness' });
      const output = await consumeStream(stream);

      const promptArg = mockGenerateContentStream.mock.calls[0][0] as string;
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

    it('should return cached recommendation for logged-in user if exact match exists', async () => {
      mockPrismaService.patientProfile.findUnique.mockResolvedValue({
        id: 'patient-1',
      });
      mockPrismaService.recommendationLog.findFirst.mockResolvedValueOnce({
        id: 'cached-log-2',
        patientId: 'patient-1',
        matchedSpecialization: 'Dermatology',
        aiExplanation: 'Cached explanation for user',
      });
      mockPrismaService.recommendationLog.create.mockResolvedValueOnce({
        id: 'new-log-2',
        patientId: 'patient-1',
        matchedSpecialization: 'Dermatology',
        aiExplanation: 'Cached explanation for user',
      });

      const stream = await service.createStream('user-1', { symptomInput: 'rash' });
      const output = await consumeStream(stream);
      
      expect(mockPrismaService.recommendationLog.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            patientId: 'patient-1',
          }),
        })
      );
      expect(mockGenerateContentStream).not.toHaveBeenCalled();
      expect(output).toBe('{"specialization":"Dermatology","explanation":"Cached explanation for user"}');
    });
  });

  describe('createStream (EMERGENCY)', () => {
    it('saves EMERGENCY specialization correctly', async () => {
      mockGenerateContentStream.mockResolvedValue({
        stream: [{ text: () => '{"specialization":"EMERGENCY","explanation":"Seek immediate care."}' }],
      });
      mockPrismaService.recommendationLog.create.mockResolvedValue({
        id: '4',
        patientId: null,
        symptomInput: 'chest pain difficulty breathing',
        matchedSpecialization: 'EMERGENCY',
        aiExplanation: 'Seek immediate care.',
        createdAt: new Date(),
      });

      const stream = await service.createStream(null, { symptomInput: 'chest pain difficulty breathing' });
      const output = await consumeStream(stream);
      expect(output).toBe('{"specialization":"EMERGENCY","explanation":"Seek immediate care."}');
    });
  });

  describe('buildPrompt medical history', () => {
    it('includes allergies, chronic conditions, and current medications when present', () => {
      const prompt = (service as any).buildPrompt('headache', {
        specializations: ['Neurology'],
        symptoms: ['dizzy'],
        medicalHistory: {
          allergies: ['penicillin'],
          chronicConditions: ['hypertension'],
          currentMedications: ['losartan'],
        },
      });
      expect(prompt).toContain('penicillin');
      expect(prompt).toContain('hypertension');
      expect(prompt).toContain('losartan');
    });

    it('omits the medical-history block when arrays are empty', () => {
      const prompt = (service as any).buildPrompt('headache', {
        specializations: [],
        symptoms: [],
        medicalHistory: { allergies: [], chronicConditions: [], currentMedications: [] },
      });
      expect(prompt).not.toContain('Allergies:');
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
