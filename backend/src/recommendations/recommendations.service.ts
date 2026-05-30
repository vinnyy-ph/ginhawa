import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../infrastructure/prisma/prisma.service';
import { CreateRecommendationDto } from './dto/create-recommendation.dto';
import { Type } from '@google/genai';
import { GeminiService } from '../infrastructure/ai/gemini.service';

// Routing signal for life-threatening symptoms — not a real specialization,
// always offered alongside whatever specializations exist in the app.
const EMERGENCY = 'EMERGENCY';

// Used only if the specializations table is empty/unreachable.
const FALLBACK_SPECIALIZATIONS = [
  'General Practice',
  'Internal Medicine',
  'Pediatrics',
  'OB-GYN',
  'Dermatology',
  'Cardiology',
  'Orthopedics',
  'ENT',
  'Psychiatry',
  'Neurology',
  'Ophthalmology',
  'Surgery',
  'Family Medicine',
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

  private async getSpecializationNames(): Promise<string[]> {
    const rows = await this.prisma.specialization.findMany({
      select: { name: true },
      orderBy: { name: 'asc' },
    });
    const names = rows.map((r) => r.name);
    return names.length > 0 ? names : FALLBACK_SPECIALIZATIONS;
  }

  private buildPrompt(
    symptomInput: string,
    patientContext?: PatientContext,
    specializationNames: string[] = FALLBACK_SPECIALIZATIONS,
  ): string {
    const mh = patientContext?.medicalHistory;
    const hasHistory =
      !!mh &&
      (mh.allergies.length > 0 ||
        mh.chronicConditions.length > 0 ||
        mh.currentMedications.length > 0);
    const historyBlock = hasHistory
      ? `- Allergies: ${mh.allergies.join(', ') || 'none'}
- Chronic conditions: ${mh.chronicConditions.join(', ') || 'none'}
- Current medications: ${mh.currentMedications.join(', ') || 'none'}
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

Specialization must be EXACTLY one of these (these are the only specializations available in this app — do not invent or substitute others): ${specializationNames.join(', ')}, ${EMERGENCY}.

Use ${EMERGENCY} only if symptoms indicate life-threatening conditions (chest pain, stroke, difficulty breathing, heavy bleeding, unconscious, seizure, suicide, self-harm, poisoning).`;
  }

  private getAIRecommendationStream(
    symptomInput: string,
    patientContext: PatientContext | undefined,
    specializationNames: string[],
  ): AsyncGenerator<string, { specialization: string; explanation: string }> {
    const schema = {
      type: Type.OBJECT,
      properties: {
        specialization: {
          type: Type.STRING,
          enum: [...specializationNames, EMERGENCY],
        },
        explanation: { type: Type.STRING },
      },
      required: ['specialization', 'explanation'],
    };
    const prompt = this.buildPrompt(
      symptomInput,
      patientContext,
      specializationNames,
    );
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
      const patientProfile = await this.prisma.patientProfile.findUnique({
        where: { userId },
      });
      patientId = patientProfile?.id ?? null;
      if (patientId) {
        const recentLogs = await this.prisma.recommendationLog.findMany({
          where: { patientId },
          orderBy: { createdAt: 'desc' },
          take: 5,
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
          where: {
            patientId,
            symptomInput: {
              equals: createRecommendationDto.symptomInput,
              mode: 'insensitive',
            },
            aiExplanation: { not: null },
          },
          orderBy: { createdAt: 'desc' },
        })
      : null;

    const specializationNames = await this.getSpecializationNames();
    const prisma = this.prisma;
    const getAIRecommendationStream = this.getAIRecommendationStream.bind(this);
    async function* generateStream() {
      if (cachedLog && cachedLog.aiExplanation) {
        yield JSON.stringify({
          specialization: cachedLog.matchedSpecialization,
          explanation: cachedLog.aiExplanation,
        });
        await prisma.recommendationLog.create({
          data: {
            patientId,
            symptomInput: createRecommendationDto.symptomInput,
            matchedSpecialization: cachedLog.matchedSpecialization,
            aiExplanation: cachedLog.aiExplanation,
          },
        });
        return;
      }

      const streamGenerator = getAIRecommendationStream(
        createRecommendationDto.symptomInput,
        patientContext,
        specializationNames,
      );

      const parsedResult = yield* streamGenerator;
      try {
        await prisma.recommendationLog.create({
          data: {
            patientId,
            symptomInput: createRecommendationDto.symptomInput,
            matchedSpecialization: parsedResult.specialization,
            aiExplanation: parsedResult.explanation,
          },
        });
      } catch (error) {
        console.error('Failed to save recommendation log to database', error);
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
