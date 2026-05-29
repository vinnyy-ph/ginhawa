import { Test, TestingModule } from '@nestjs/testing';
import { ConsultationService } from './consultation.service';
import { GeminiService } from '../ai/gemini.service';
import { PrismaService } from '../prisma/prisma.service';

const mockGenerateContent = jest.fn();

jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: jest.fn().mockReturnValue({
      generateContent: mockGenerateContent,
    }),
  })),
  SchemaType: { STRING: 'STRING', OBJECT: 'OBJECT' },
}));

describe('ConsultationService', () => {
  let service: ConsultationService;

  const mockPrismaService = {
    appointment: { findUnique: jest.fn(), update: jest.fn() },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConsultationService,
        GeminiService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();
    service = module.get<ConsultationService>(ConsultationService);
    jest.clearAllMocks();
  });

  describe('summarize', () => {
    const appointment = {
      id: 'appt-1',
      liveNotes: 'patient has a cough',
      doctor: { userId: 'doc-1' },
      patient: {},
    };

    it('returns the parsed summary for the owning doctor', async () => {
      mockPrismaService.appointment.findUnique.mockResolvedValue(appointment);
      mockGenerateContent.mockResolvedValue({
        response: {
          text: () =>
            '{"doctorSummary":"d","patientSummary":"p","prescriptions":"","followUp":"f"}',
        },
      });

      const result = await service.summarize('appt-1', 'doc-1');
      expect(result).toEqual({
        doctorSummary: 'd',
        patientSummary: 'p',
        prescriptions: '',
        followUp: 'f',
      });
    });

    it('throws when the AI response is unparseable', async () => {
      mockPrismaService.appointment.findUnique.mockResolvedValue(appointment);
      mockGenerateContent.mockResolvedValue({
        response: { text: () => 'garbage' },
      });

      await expect(service.summarize('appt-1', 'doc-1')).rejects.toThrow(
        'AI returned an unparseable response. Please try again.',
      );
    });
  });
});
