import { Test, TestingModule } from '@nestjs/testing';
import { RecommendationsService } from './recommendations.service';
import { PrismaService } from '../infrastructure/prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';
import { GeminiService } from '../infrastructure/ai/gemini.service';
import { DoctorsService } from '../doctors/doctors.service';
import { DoctorRankingService } from './doctor-ranking.service';

const mockGenerateContentStream = jest.fn();

jest.mock('@google/genai', () => ({
  GoogleGenAI: jest.fn().mockImplementation(() => ({
    models: {
      generateContentStream: mockGenerateContentStream,
    },
  })),
  Type: {
    STRING: 'STRING',
    OBJECT: 'OBJECT',
    NUMBER: 'NUMBER',
    BOOLEAN: 'BOOLEAN',
  },
}));

describe('RecommendationsService', () => {
  let service: RecommendationsService;

  const mockPrismaService = {
    patientProfile: { findUnique: jest.fn() },
    recommendationLog: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
    patientMedicalHistory: { findUnique: jest.fn() },
  };

  // The existing createStream tests rely on the real GeminiService backed by the
  // mocked @google/genai client (mockGenerateContentStream). So we keep the real
  // GeminiService provider and expose generateJson via a spy for the match tests.
  const mockGeminiService = {
    generateJson: jest.fn(),
  };

  const mockDoctorsService = {
    findRankingCandidates: jest.fn(),
  };

  const mockRankingService = {
    rank: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecommendationsService,
        GeminiService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: DoctorsService, useValue: mockDoctorsService },
        { provide: DoctorRankingService, useValue: mockRankingService },
      ],
    }).compile();

    service = module.get<RecommendationsService>(RecommendationsService);
    jest.clearAllMocks();
    jest
      .spyOn(service['gemini'], 'generateJson')
      .mockImplementation(mockGeminiService.generateJson);
  });

  async function consumeStream(
    stream: AsyncGenerator<string, any, unknown> | AsyncIterable<string>,
  ): Promise<string> {
    let output = '';
    for await (const chunk of stream) {
      output += chunk;
    }
    return output;
  }

  describe('createStream (anonymous)', () => {
    it('calls Gemini and saves log with aiExplanation', async () => {
      mockGenerateContentStream.mockResolvedValue([
        {
          text: '{"specialization":"Neurology","explanation":"Test explanation."}',
        },
      ]);
      mockPrismaService.recommendationLog.create.mockResolvedValue({
        id: '1',
        patientId: null,
        symptomInput: 'headache',
        matchedSpecialization: 'Neurology',
        aiExplanation: 'Test explanation.',
        createdAt: new Date(),
      });

      const stream = await service.createStream(null, {
        symptomInput: 'headache',
      });
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
      expect(output).toBe(
        '{"specialization":"Neurology","explanation":"Test explanation."}',
      );
    });

    it('bubbles up the error when Gemini API fails', async () => {
      mockGenerateContentStream.mockRejectedValue(new Error('API error'));

      const stream = await service.createStream(null, {
        symptomInput: 'headache',
      });
      await expect(consumeStream(stream)).rejects.toThrow(Error);
    });

    it('should throw error when JSON parsing fails', async () => {
      mockGenerateContentStream.mockResolvedValue([
        { text: 'not json at all' },
      ]);

      const consoleSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      const stream = await service.createStream(null, {
        symptomInput: 'headache',
      });

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
        {
          matchedSpecialization: 'Cardiology',
          symptomInput: 'chest pain last month',
        },
      ]);
      mockGenerateContentStream.mockResolvedValue([
        {
          text: '{"specialization":"Cardiology","explanation":"Given your history of cardiology."}',
        },
      ]);
      mockPrismaService.recommendationLog.create.mockResolvedValue({
        id: '3',
        patientId: 'patient-1',
        symptomInput: 'chest tightness',
        matchedSpecialization: 'Cardiology',
        aiExplanation: 'Given your history of cardiology.',
        createdAt: new Date(),
      });

      const stream = await service.createStream('user-1', {
        symptomInput: 'chest tightness',
      });
      await consumeStream(stream);

      const promptArg = (
        mockGenerateContentStream.mock.calls[0][0] as { contents: string }
      ).contents;
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

      const stream = await service.createStream('user-1', {
        symptomInput: 'rash',
      });
      const output = await consumeStream(stream);

      expect(
        mockPrismaService.recommendationLog.findFirst,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            patientId: 'patient-1',
          }),
        }),
      );
      expect(mockGenerateContentStream).not.toHaveBeenCalled();
      expect(output).toBe(
        '{"specialization":"Dermatology","explanation":"Cached explanation for user"}',
      );
    });
  });

  describe('createStream (EMERGENCY)', () => {
    it('saves EMERGENCY specialization correctly', async () => {
      mockGenerateContentStream.mockResolvedValue([
        {
          text: '{"specialization":"EMERGENCY","explanation":"Seek immediate care."}',
        },
      ]);
      mockPrismaService.recommendationLog.create.mockResolvedValue({
        id: '4',
        patientId: null,
        symptomInput: 'chest pain difficulty breathing',
        matchedSpecialization: 'EMERGENCY',
        aiExplanation: 'Seek immediate care.',
        createdAt: new Date(),
      });

      const stream = await service.createStream(null, {
        symptomInput: 'chest pain difficulty breathing',
      });
      const output = await consumeStream(stream);
      expect(output).toBe(
        '{"specialization":"EMERGENCY","explanation":"Seek immediate care."}',
      );
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
        medicalHistory: {
          allergies: [],
          chronicConditions: [],
          currentMedications: [],
        },
      });
      expect(prompt).not.toContain('Allergies:');
    });
  });

  describe('findAllForPatient', () => {
    it('returns logs for patient', async () => {
      mockPrismaService.patientProfile.findUnique.mockResolvedValue({
        id: 'patient-1',
      });
      mockPrismaService.recommendationLog.findMany.mockResolvedValue([
        {
          id: '1',
          matchedSpecialization: 'Neurology',
          aiExplanation: 'Test',
          createdAt: new Date(),
        },
      ]);

      const result = await service.findAllForPatient('user-1');
      expect(result).toHaveLength(1);
    });

    it('throws NotFoundException when patient profile not found', async () => {
      mockPrismaService.patientProfile.findUnique.mockResolvedValue(null);

      await expect(service.findAllForPatient('user-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('match', () => {
    it('returns ranked doctors for a non-emergency query', async () => {
      mockGeminiService.generateJson.mockResolvedValue({
        specialization: 'Dentistry',
        city: 'Manila',
        region: null,
        minYears: 5,
        minRating: null,
        emergency: false,
        explanation: 'A dentist suits your request.',
      });
      mockPrismaService.patientProfile.findUnique.mockResolvedValue(null);
      mockPrismaService.recommendationLog.create.mockResolvedValue({});
      const candidates = [{ id: 'doc-1', avgRating: 4, reviewCount: 2 }];
      mockDoctorsService.findRankingCandidates.mockResolvedValue(candidates);
      mockRankingService.rank.mockReturnValue([
        { id: 'doc-1', avgRating: 4, reviewCount: 2, matchScore: 1, matchReason: 'Dentistry' },
      ]);

      const result = await service.match(null, { symptomInput: 'dentist in Manila 5 years' });

      expect(result.emergency).toBe(false);
      expect(result.explanation).toBe('A dentist suits your request.');
      expect(result.criteria.specialization).toBe('Dentistry');
      expect(result.doctors).toHaveLength(1);
      expect(result.doctors[0].matchReason).toBe('Dentistry');
      expect(mockRankingService.rank).toHaveBeenCalledWith(
        expect.objectContaining({ specialization: 'Dentistry', city: 'Manila', minYears: 5 }),
        candidates,
      );
    });

    it('short-circuits on emergency and returns no doctors', async () => {
      mockGeminiService.generateJson.mockResolvedValue({
        specialization: 'EMERGENCY',
        city: null,
        region: null,
        minYears: null,
        minRating: null,
        emergency: true,
        explanation: 'Call 911.',
      });
      mockPrismaService.patientProfile.findUnique.mockResolvedValue(null);
      mockPrismaService.recommendationLog.create.mockResolvedValue({});

      const result = await service.match(null, { symptomInput: 'crushing chest pain' });

      expect(result.emergency).toBe(true);
      expect(result.doctors).toEqual([]);
      expect(mockDoctorsService.findRankingCandidates).not.toHaveBeenCalled();
    });

    it('does not throw when the log write fails', async () => {
      mockGeminiService.generateJson.mockResolvedValue({
        specialization: null,
        city: null,
        region: null,
        minYears: null,
        minRating: null,
        emergency: false,
        explanation: 'ok',
      });
      mockPrismaService.patientProfile.findUnique.mockResolvedValue(null);
      mockPrismaService.recommendationLog.create.mockRejectedValue(new Error('db down'));
      mockDoctorsService.findRankingCandidates.mockResolvedValue([]);
      mockRankingService.rank.mockReturnValue([]);

      await expect(
        service.match(null, { symptomInput: 'just a checkup please' }),
      ).resolves.toBeDefined();
    });
  });
});
