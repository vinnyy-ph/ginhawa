import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../infrastructure/prisma/prisma.service';
import { CreateRecommendationDto } from './dto/create-recommendation.dto';
import { Type } from '@google/genai';
import { GeminiService } from '../infrastructure/ai/gemini.service';
import { DoctorsService } from '../doctors/doctors.service';
import { DoctorRankingService, MatchCriteria } from './doctor-ranking.service';
import { toPublicDoctorProfile } from '../doctors/dto/public-doctor.dto';
import { MatchResult, MatchedDoctor } from './dto/match-result.dto';

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

type RawCriteria = MatchCriteria & {
  emergency: boolean;
  explanation: string;
};

@Injectable()
export class RecommendationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gemini: GeminiService,
    private readonly doctors: DoctorsService,
    private readonly ranking: DoctorRankingService,
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

  private async resolvePatientContext(userId: string | null): Promise<{
    patientId: string | null;
    patientContext?: PatientContext;
  }> {
    if (!userId) return { patientId: null };
    const patientProfile = await this.prisma.patientProfile.findUnique({
      where: { userId },
    });
    const patientId = patientProfile?.id ?? null;
    if (!patientId) return { patientId: null };

    const recentLogs = await this.prisma.recommendationLog.findMany({
      where: { patientId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { matchedSpecialization: true, symptomInput: true },
    });
    const medHistory = await this.prisma.patientMedicalHistory.findUnique({
      where: { patientId },
    });
    return {
      patientId,
      patientContext: {
        specializations: recentLogs.map((l) => l.matchedSpecialization),
        symptoms: recentLogs.map((l) => l.symptomInput),
        medicalHistory: medHistory
          ? {
              allergies: medHistory.allergies,
              chronicConditions: medHistory.chronicConditions,
              currentMedications: medHistory.currentMedications,
            }
          : undefined,
      },
    };
  }

  private buildMatchPrompt(
    symptomInput: string,
    patientContext: PatientContext | undefined,
    specializationNames: string[],
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
      ? `Patient context (use to personalize):
- Recent specializations consulted: ${patientContext.specializations.join(', ') || 'none'}
- Prior symptom history (brief): ${patientContext.symptoms.map((s) => s.slice(0, 100)).join(' | ') || 'none'}
${historyBlock}
`
      : '';

    return `You are a medical triage and doctor-matching assistant. ${contextBlock}A patient writes: "${symptomInput}".

This text may describe symptoms, an explicit doctor preference, or both. Do two things:
1. Infer the single most relevant medical specialization (or null if truly unclear).
2. Extract any explicit filters the patient mentions: city, region, minimum years of experience (minYears), minimum star rating 1-5 (minRating). Leave a field null if not mentioned.

Return ONLY valid JSON, no markdown:
{ "specialization": <name or null>, "city": <string|null>, "region": <string|null>, "minYears": <number|null>, "minRating": <number|null>, "emergency": <boolean>, "explanation": "<2-3 sentence reasoning>" }

specialization must be EXACTLY one of these (these are the only specializations available in this app — do not invent or substitute others): ${specializationNames.join(', ')}, ${EMERGENCY} — or null.

Set emergency true ONLY for life-threatening symptoms (chest pain, stroke, difficulty breathing, heavy bleeding, unconscious, seizure, suicide, self-harm, poisoning).`;
  }

  private async extractCriteria(
    symptomInput: string,
    patientContext: PatientContext | undefined,
    specializationNames: string[],
  ): Promise<RawCriteria> {
    const schema = {
      type: Type.OBJECT,
      properties: {
        specialization: { type: Type.STRING, nullable: true },
        city: { type: Type.STRING, nullable: true },
        region: { type: Type.STRING, nullable: true },
        minYears: { type: Type.NUMBER, nullable: true },
        minRating: { type: Type.NUMBER, nullable: true },
        emergency: { type: Type.BOOLEAN },
        explanation: { type: Type.STRING },
      },
      required: ['emergency', 'explanation'],
    };
    const prompt = this.buildMatchPrompt(
      symptomInput,
      patientContext,
      specializationNames,
    );
    return this.gemini.generateJson<RawCriteria>(prompt, { schema });
  }

  private normalizeCriteria(
    raw: RawCriteria,
    specializationNames: string[],
  ): MatchCriteria {
    const known = specializationNames.map((s) => s.toLowerCase());
    const spec =
      raw.specialization &&
      known.includes(raw.specialization.toLowerCase()) &&
      raw.specialization.toUpperCase() !== EMERGENCY
        ? raw.specialization
        : null;
    return {
      specialization: spec,
      city: raw.city ?? null,
      region: raw.region ?? null,
      minYears: raw.minYears ?? null,
      minRating: raw.minRating ?? null,
    };
  }

  async match(
    userId: string | null,
    dto: CreateRecommendationDto,
  ): Promise<MatchResult> {
    const { patientId, patientContext } =
      await this.resolvePatientContext(userId);

    const specializationNames = await this.getSpecializationNames();
    const raw = await this.extractCriteria(
      dto.symptomInput,
      patientContext,
      specializationNames,
    );
    const emergency =
      raw.emergency || raw.specialization?.toUpperCase() === EMERGENCY;
    const criteria = this.normalizeCriteria(raw, specializationNames);

    try {
      await this.prisma.recommendationLog.create({
        data: {
          patientId,
          symptomInput: dto.symptomInput,
          matchedSpecialization: emergency
            ? 'EMERGENCY'
            : (criteria.specialization ?? 'General Practice'),
          aiExplanation: raw.explanation,
        },
      });
    } catch (error) {
      console.error('Failed to save recommendation log to database', error);
    }

    if (emergency) {
      return {
        explanation: raw.explanation,
        criteria,
        emergency: true,
        doctors: [],
      };
    }

    const candidates = await this.doctors.findRankingCandidates();
    const ranked = this.ranking.rank(criteria, candidates).slice(0, 20);
    const doctors: MatchedDoctor[] = ranked.map((d) => ({
      ...toPublicDoctorProfile(d),
      avgRating: d.avgRating,
      reviewCount: d.reviewCount,
      matchScore: d.matchScore,
      matchReason: d.matchReason,
    }));

    return {
      explanation: raw.explanation,
      criteria,
      emergency: false,
      doctors,
    };
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
