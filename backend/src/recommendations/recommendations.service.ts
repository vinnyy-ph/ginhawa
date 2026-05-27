import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRecommendationDto } from './dto/create-recommendation.dto';

const keywordMap: Record<string, string> = {
  heart: 'Cardiology',
  chest: 'Cardiology',
  blood: 'Cardiology',
  skin: 'Dermatology',
  rash: 'Dermatology',
  itch: 'Dermatology',
  bone: 'Orthopedics',
  fracture: 'Orthopedics',
  joint: 'Orthopedics',
  muscle: 'Orthopedics',
  brain: 'Neurology',
  headache: 'Neurology',
  nerve: 'Neurology',
  stomach: 'Gastroenterology',
  digestion: 'Gastroenterology',
  acid: 'Gastroenterology',
  eye: 'Ophthalmology',
  vision: 'Ophthalmology',
  tooth: 'Dentistry',
  dental: 'Dentistry',
  child: 'Pediatrics',
  baby: 'Pediatrics',
  women: 'Gynecology',
  pregnancy: 'Gynecology',
  mental: 'Psychiatry',
  depression: 'Psychiatry',
  anxiety: 'Psychiatry',
};

@Injectable()
export class RecommendationsService {
  constructor(private readonly prisma: PrismaService) {}

  private determineSpecialization(symptoms: string): string {
    const lowerSymptoms = symptoms.toLowerCase();
    for (const [keyword, specialization] of Object.entries(keywordMap)) {
      if (lowerSymptoms.includes(keyword)) {
        return specialization;
      }
    }
    return 'General Practice';
  }

  async create(userId: string | null, createRecommendationDto: CreateRecommendationDto) {
    const matchedSpecialization = this.determineSpecialization(
      createRecommendationDto.symptomInput,
    );

    let patientId: string | null = null;
    if (userId) {
      const patientProfile = await this.prisma.patientProfile.findUnique({
        where: { userId },
      });
      patientId = patientProfile?.id ?? null;
    }

    return this.prisma.recommendationLog.create({
      data: {
        patientId,
        symptomInput: createRecommendationDto.symptomInput,
        matchedSpecialization,
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
