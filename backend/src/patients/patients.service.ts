import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { UpdateMedicalHistoryDto } from './dto/update-medical-history.dto';

@Injectable()
export class PatientsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, createPatientDto: CreatePatientDto) {
    const existingProfile = await this.prisma.patientProfile.findUnique({
      where: { userId },
    });

    if (existingProfile) {
      throw new ConflictException(
        'Patient profile already exists for this user',
      );
    }

    return this.prisma.patientProfile.create({
      data: {
        ...createPatientDto,
        birthdate: new Date(createPatientDto.birthdate),
        user: { connect: { id: userId } },
        medicalHistoryRecord: { create: {} },
      },
    });
  }

  async findByUserId(userId: string) {
    const profile = await this.prisma.patientProfile.findUnique({
      where: { userId },
    });
    if (!profile) throw new NotFoundException('Profile not found');
    return profile;
  }

  async updateMedicalHistory(userId: string, dto: UpdateMedicalHistoryDto) {
    const profile = await this.findByUserId(userId);
    return this.prisma.patientMedicalHistory.update({
      where: { patientId: profile.id },
      data: dto,
    });
  }

  async update(userId: string, updatePatientDto: UpdatePatientDto) {
    const profile = await this.findByUserId(userId);
    return this.prisma.patientProfile.update({
      where: { id: profile.id },
      data: {
        ...updatePatientDto,
        birthdate: updatePatientDto.birthdate
          ? new Date(updatePatientDto.birthdate)
          : undefined,
      },
    });
  }
}
