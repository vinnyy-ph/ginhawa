import {
  Injectable,
  NotFoundException,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRecommendationDto } from './dto/create-recommendation.dto';
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';

const FALLBACK_MODELS = [
  'gemini-3.5-flash',
  'gemini-3.1-flash-lite',
  'gemini-3-flash',
  'gemini-2.5-flash',
] as const;

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

@Injectable()
export class RecommendationsService {
  private readonly genAI: GoogleGenerativeAI;
  private readonly logger = new Logger(RecommendationsService.name);

  constructor(private readonly prisma: PrismaService) {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? '');
  }

  private buildPrompt(
    symptomInput: string,
    patientContext?: {
      specializations: string[];
      symptoms: string[];
      medicalHistory?: {
        allergies: string[];
        chronicConditions: string[];
        currentMedications: string[];
      };
    },
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

  private isRateLimitError(error: unknown): boolean {
    if (typeof error !== 'object' || error === null) return false;
    const e = error as Record<string, unknown>;
    const status = e['status'];
    const msg = String(e['message'] ?? '');
    return status === 429 || status === 503 || msg.includes('429') || msg.includes('503');
  }

  private getRetryDelay(error: unknown): number {
    if (typeof error === 'object' && error !== null) {
      const delay = (error as Record<string, unknown>)['retryDelay'];
      if (typeof delay === 'number' && delay > 0) return delay;
    }
    return 1000;
  }

  private async *getAIRecommendationStream(
    symptomInput: string,
    patientContext?: {
      specializations: string[];
      symptoms: string[];
      medicalHistory?: {
        allergies: string[];
        chronicConditions: string[];
        currentMedications: string[];
      };
    },
  ): AsyncGenerator<string, { specialization: string; explanation: string }> {
    const generationConfig = {
      responseMimeType: 'application/json',
      responseSchema: {
        type: SchemaType.OBJECT,
        properties: {
          specialization: { type: SchemaType.STRING, enum: VALID_SPECIALIZATIONS },
          explanation: { type: SchemaType.STRING },
        },
        required: ['specialization', 'explanation'],
      } as any,
    };

    const prompt = this.buildPrompt(symptomInput, patientContext);

    for (let mi = 0; mi < FALLBACK_MODELS.length; mi++) {
      const modelName = FALLBACK_MODELS[mi];

      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const model = this.genAI.getGenerativeModel({ model: modelName, generationConfig });
          const result = await model.generateContentStream(prompt);

          let fullText = '';
          for await (const chunk of result.stream) {
            const chunkText = chunk.text();
            fullText += chunkText;
            yield chunkText;
          }

          if (mi > 0) {
            this.logger.log(`Successfully using fallback model: ${modelName}`);
          }
          return JSON.parse(fullText) as { specialization: string; explanation: string };
        } catch (error) {
          if (!this.isRateLimitError(error)) throw error;

          const delay = this.getRetryDelay(error);
          if (attempt === 0) {
            this.logger.warn(`${modelName} rate limited, retrying in ${delay}ms...`);
            await new Promise((resolve) => setTimeout(resolve, delay));
          } else if (mi < FALLBACK_MODELS.length - 1) {
            this.logger.warn(`${modelName} failed after retry, switching to ${FALLBACK_MODELS[mi + 1]}`);
          }
        }
      }
    }

    throw new HttpException(
      'Service is currently rate limited. Please try again in a moment.',
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }

  async createStream(
    userId: string | null,
    createRecommendationDto: CreateRecommendationDto,
  ) {
    let patientId: string | null = null;
    let patientContext: {
      specializations: string[];
      symptoms: string[];
      medicalHistory?: {
        allergies: string[];
        chronicConditions: string[];
        currentMedications: string[];
      };
    } | undefined;

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
