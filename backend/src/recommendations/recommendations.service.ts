import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRecommendationDto } from './dto/create-recommendation.dto';
import { SchemaType } from '@google/generative-ai';
import { GeminiService } from '../ai/gemini.service';

const VALID_SPECIALIZATIONS = [
  'Cardiology',
  'Dermatology',
  'Orthopedics',
  'Neurology',
  'Gastroenterology',
  'Ophthalmology',
  'Dentistry',
  'Pediatrics',
  'Gynecology',
  'Psychiatry',
  'General Practice',
  'EMERGENCY',
];

type PatientContext = {
  specializations: string[];
  symptoms: string[];
  medicalHistory?: {
    allergies: string[];
    chronicConditions: string[];
    currentMedications: string[];
  };
};

@Injectable()
export class RecommendationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gemini: GeminiService,
  ) {}

  private buildPrompt(
    symptomInput: string,
    patientContext?: PatientContext,
  ): string {
    const mh = patientContext?.medicalHistory;
    const hasHistory =
      !!mh &&
      (mh.allergies.length > 0 ||
        mh.chronicConditions.length > 0 ||
        mh.currentMedications.length > 0);
    const historyBlock = hasHistory
      ? `- Allergies: ${mh!.allergies.join(', ') || 'none'}
- Chronic conditions: ${mh!.chronicConditions.join(', ') || 'none'}
- Current medications: ${mh!.currentMedications.join(', ') || 'none'}
`
      : '';

    const contextBlock = patientContext
      ? `Patient context (use this to personalize your recommendation):
- Recent specializations consulted: ${patientContext.specializations.join(', ') || 'none'}
- Prior symptom history (brief): ${patientContext.symptoms.map((s) => s.slice(0, 100)).join(' | ') || 'none'}
${historyBlock}
`
      : '';

    return `You are a medical triage assistant. ${contextBlock}A patient describes their symptoms: "${symptomInput}".

Return ONLY valid JSON in this exact format, no markdown:
{ "specialization": "<name>", "explanation": "<2-3 sentence reasoning>" }

Specialization must be one of: Cardiology, Dermatology, Orthopedics, Neurology, Gastroenterology, Ophthalmology, Dentistry, Pediatrics, Gynecology, Psychiatry, General Practice, EMERGENCY.

Use EMERGENCY only if symptoms indicate life-threatening conditions (chest pain, stroke, difficulty breathing, heavy bleeding, unconscious, seizure, suicide, self-harm, poisoning).`;
  }

  private getAIRecommendationStream(
    symptomInput: string,
    patientContext?: PatientContext,
  ): AsyncGenerator<string, { specialization: string; explanation: string }> {
    const schema = {
      type: SchemaType.OBJECT,
      properties: {
        specialization: { type: SchemaType.STRING, enum: VALID_SPECIALIZATIONS },
        explanation: { type: SchemaType.STRING },
      },
      required: ['specialization', 'explanation'],
    };
    const prompt = this.buildPrompt(symptomInput, patientContext);
    return this.gemini.generateJsonStream<{
      specialization: string;
      explanation: string;
    }>(prompt, { schema });
  }

  async createStream(
    userId: string | null,
    createRecommendationDto: CreateRecommendationDto,
  ) {
    let patientId: string | null = null;
    let patientContext: PatientContext | undefined;

    if (userId) {
      const patientProfile = await this.prisma.patientProfile.findUnique({ where: { userId } });
      patientId = patientProfile?.id ?? null;
      if (patientId) {
        const recentLogs = await this.prisma.recommendationLog.findMany({
          where: { patientId }, orderBy: { createdAt: 'desc' }, take: 5,
          select: { matchedSpecialization: true, symptomInput: true },
        });
        const medHistory = await this.prisma.patientMedicalHistory.findUnique({
          where: { patientId },
        });
        patientContext = {
          specializations: recentLogs.map((l) => l.matchedSpecialization),
          symptoms: recentLogs.map((l) => l.symptomInput),
          medicalHistory: medHistory
            ? {
                allergies: medHistory.allergies,
                chronicConditions: medHistory.chronicConditions,
                currentMedications: medHistory.currentMedications,
              }
            : undefined,
        };
      }
    }

    const cachedLog = patientId 
      ? await this.prisma.recommendationLog.findFirst({
          where: { patientId, symptomInput: { equals: createRecommendationDto.symptomInput, mode: 'insensitive' }, aiExplanation: { not: null } },
          orderBy: { createdAt: 'desc' },
        })
      : null;
    
    const self = this;
    async function* generateStream() {
      if (cachedLog && cachedLog.aiExplanation) {
        yield JSON.stringify({ specialization: cachedLog.matchedSpecialization, explanation: cachedLog.aiExplanation });
        await self.prisma.recommendationLog.create({
          data: { patientId, symptomInput: createRecommendationDto.symptomInput, matchedSpecialization: cachedLog.matchedSpecialization, aiExplanation: cachedLog.aiExplanation },
        });
        return;
      }

      const streamGenerator = self.getAIRecommendationStream(createRecommendationDto.symptomInput, patientContext);
      
      const parsedResult = yield* streamGenerator;
      try {
        await self.prisma.recommendationLog.create({
          data: { patientId, symptomInput: createRecommendationDto.symptomInput, matchedSpecialization: parsedResult.specialization, aiExplanation: parsedResult.explanation },
        });
      } catch (error) {
        console.error("Failed to save recommendation log to database", error);
      }
    }

    return generateStream();
  }

  async findAllForPatient(userId: string) {
    const patientProfile = await this.prisma.patientProfile.findUnique({
      where: { userId },
    });

    if (!patientProfile) {
      throw new NotFoundException('Patient profile not found');
    }

    return this.prisma.recommendationLog.findMany({
      where: { patientId: patientProfile.id },
      orderBy: { createdAt: 'desc' },
    });
  }
}
