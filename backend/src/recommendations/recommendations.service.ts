import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRecommendationDto } from './dto/create-recommendation.dto';
import { GoogleGenerativeAI } from '@google/generative-ai';

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

  private async getAIRecommendation(
    symptomInput: string,
    patientContext?: { specializations: string[]; symptoms: string[] },
  ): Promise<{ specialization: string; explanation: string }> {
    const model = this.genAI.getGenerativeModel({ model: 'gemini-3.5-flash' });
    const prompt = this.buildPrompt(symptomInput, patientContext);

    let raw: string;
    try {
      const result = await model.generateContent(prompt);
      raw = result.response.text();
    } catch {
      throw new InternalServerErrorException(
        'AI recommendation service unavailable',
      );
    }

    const cleaned = raw
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    let parsed: { specialization: string; explanation: string };
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      throw new InternalServerErrorException(
        'AI recommendation service unavailable',
      );
    }

    if (!VALID_SPECIALIZATIONS.includes(parsed.specialization)) {
      throw new InternalServerErrorException(
        'AI recommendation service unavailable',
      );
    }

    return parsed;
  }

  async create(
    userId: string | null,
    createRecommendationDto: CreateRecommendationDto,
  ) {
    let patientId: string | null = null;
    let patientContext:
      | { specializations: string[]; symptoms: string[] }
      | undefined;

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
        patientContext = {
          specializations: recentLogs.map((l) => l.matchedSpecialization),
          symptoms: recentLogs.map((l) => l.symptomInput),
        };
      }
    }

    const cachedLog = await this.prisma.recommendationLog.findFirst({
      where: {
        symptomInput: { equals: createRecommendationDto.symptomInput, mode: 'insensitive' },
        aiExplanation: { not: null },
      },
      orderBy: { createdAt: 'desc' },
    });

    let specialization: string;
    let explanation: string | null = null;

    if (cachedLog && cachedLog.aiExplanation) {
      specialization = cachedLog.matchedSpecialization;
      explanation = cachedLog.aiExplanation;
    } else {
      const aiResult = await this.getAIRecommendation(
        createRecommendationDto.symptomInput,
        patientContext,
      );
      specialization = aiResult.specialization;
      explanation = aiResult.explanation;
    }

    return this.prisma.recommendationLog.create({
      data: {
        patientId,
        symptomInput: createRecommendationDto.symptomInput,
        matchedSpecialization: specialization,
        aiExplanation: explanation,
      },
    });
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
