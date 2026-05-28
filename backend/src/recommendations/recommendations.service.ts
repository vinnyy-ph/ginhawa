import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRecommendationDto } from './dto/create-recommendation.dto';
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';

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

  constructor(private readonly prisma: PrismaService) {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? '');
  }

  private buildPrompt(
    symptomInput: string,
    patientContext?: { specializations: string[]; symptoms: string[] },
  ): string {
    const contextBlock = patientContext
      ? `Patient context (use this to personalize your recommendation):
- Recent specializations consulted: ${patientContext.specializations.join(', ') || 'none'}
- Prior symptom history (brief): ${patientContext.symptoms.map((s) => s.slice(0, 100)).join(' | ') || 'none'}

`
      : '';

    return `You are a medical triage assistant. ${contextBlock}A patient describes their symptoms: "${symptomInput}".

Return ONLY valid JSON in this exact format, no markdown:
{ "specialization": "<name>", "explanation": "<2-3 sentence reasoning>" }

Specialization must be one of: Cardiology, Dermatology, Orthopedics, Neurology, Gastroenterology, Ophthalmology, Dentistry, Pediatrics, Gynecology, Psychiatry, General Practice, EMERGENCY.

Use EMERGENCY only if symptoms indicate life-threatening conditions (chest pain, stroke, difficulty breathing, heavy bleeding, unconscious, seizure, suicide, self-harm, poisoning).`;
  }

  private async *getAIRecommendationStream(
    symptomInput: string,
    patientContext?: { specializations: string[]; symptoms: string[] },
  ): AsyncGenerator<string, { specialization: string; explanation: string }> {
    const model = this.genAI.getGenerativeModel({
      model: 'gemini-3.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            specialization: { type: SchemaType.STRING, format: 'enum', enum: VALID_SPECIALIZATIONS },
            explanation: { type: SchemaType.STRING },
          },
          required: ['specialization', 'explanation'],
        },
      },
    });

    const prompt = this.buildPrompt(symptomInput, patientContext);

    let result;
    const maxRetries = 3;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        result = await model.generateContentStream(prompt);
        break;
      } catch (error) {
        if (attempt === maxRetries) {
          throw new InternalServerErrorException('AI recommendation service unavailable');
        }
      }
    }

    if (!result) {
      throw new InternalServerErrorException('AI recommendation service unavailable');
    }

    let fullText = '';
    for await (const chunk of result.stream) {
      const chunkText = chunk.text();
      fullText += chunkText;
      yield chunkText;
    }

    try {
      const parsed = JSON.parse(fullText);
      return parsed;
    } catch (e) {
      console.error("Failed to parse AI response", e);
      throw e;
    }
  }

  async createStream(
    userId: string | null,
    createRecommendationDto: CreateRecommendationDto,
  ) {
    let patientId: string | null = null;
    let patientContext: { specializations: string[]; symptoms: string[] } | undefined;

    if (userId) {
      const patientProfile = await this.prisma.patientProfile.findUnique({ where: { userId } });
      patientId = patientProfile?.id ?? null;
      if (patientId) {
        const recentLogs = await this.prisma.recommendationLog.findMany({
          where: { patientId }, orderBy: { createdAt: 'desc' }, take: 5,
          select: { matchedSpecialization: true, symptomInput: true },
        });
        patientContext = { specializations: recentLogs.map((l) => l.matchedSpecialization), symptoms: recentLogs.map((l) => l.symptomInput) };
      }
    }

    const cachedLog = await this.prisma.recommendationLog.findFirst({
      where: { patientId, symptomInput: { equals: createRecommendationDto.symptomInput, mode: 'insensitive' }, aiExplanation: { not: null } },
      orderBy: { createdAt: 'desc' },
    });
    
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
      
      try {
        const parsedResult = yield* streamGenerator;
        await self.prisma.recommendationLog.create({
          data: { patientId, symptomInput: createRecommendationDto.symptomInput, matchedSpecialization: parsedResult.specialization, aiExplanation: parsedResult.explanation },
        });
      } catch (error) {
        throw error;
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
