import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDoctorDto } from './dto/create-doctor.dto';
import { UpdateDoctorDto } from './dto/update-doctor.dto';

@Injectable()
export class DoctorsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, data: CreateDoctorDto) {
    const existing = await this.prisma.doctorProfile.findUnique({
      where: { userId },
    });
    if (existing) {
      throw new ConflictException('Doctor profile already exists');
    }
    return this.prisma.doctorProfile.create({
      data: { ...data, userId },
    });
  }

  async upsertProfile(
    userId: string,
    dto: import('./dto/create-doctor-profile.dto').CreateDoctorProfileDto,
  ) {
    const profileData = {
      fullName: dto.fullName,
      professionalTitle: dto.professionalTitle,
      specialization: dto.specialization,
      bio: dto.bio,
      yearsOfExperience: dto.yearsOfExperience,
      consultationFee: dto.consultationFee,
      languagesSpoken: dto.languagesSpoken,
      consultationFocusAreas: dto.consultationFocusAreas,
      availabilitySummary: dto.availabilitySummary,
      profilePictureUrl: dto.profilePictureUrl,
    };

    const profile = await this.prisma.$transaction(async (tx) => {
      const saved = await tx.doctorProfile.upsert({
        where: { userId },
        update: profileData,
        create: { userId, ...profileData },
      });
      await this.syncPrimarySpecialization(tx, saved.id, dto.specialization);
      return saved;
    });

    return {
      profileComplete: true,
      profile,
    };
  }

  private async syncPrimarySpecialization(
    tx: Prisma.TransactionClient,
    doctorId: string,
    name: string,
  ) {
    const spec = await tx.specialization.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    await tx.doctorSpecialization.deleteMany({
      where: { doctorId, isPrimary: true },
    });
    await tx.doctorSpecialization.upsert({
      where: {
        doctorId_specializationId: { doctorId, specializationId: spec.id },
      },
      update: { isPrimary: true },
      create: { doctorId, specializationId: spec.id, isPrimary: true },
    });
  }

  async findByUserId(userId: string) {
    const profile = await this.prisma.doctorProfile.findUnique({
      where: { userId },
    });
    if (!profile) {
      throw new NotFoundException('Doctor profile not found');
    }
    return profile;
  }

  async update(userId: string, data: UpdateDoctorDto) {
    await this.findByUserId(userId);
    return this.prisma.doctorProfile.update({
      where: { userId },
      data,
    });
  }

  async searchAll(search?: string, specialization?: string) {
    const where: Prisma.DoctorProfileWhereInput = {
      isActive: true,
      isVerified: true,
    };

    if (search) {
      where.fullName = { contains: search, mode: 'insensitive' };
    }

    if (specialization) {
      where.specializations = {
        some: {
          specialization: {
            name: { contains: specialization, mode: 'insensitive' },
          },
        },
      };
    }

    return this.prisma.doctorProfile.findMany({
      where,
      include: {
        availabilitySlots: true,
      },
    });
  }

  async findById(id: string) {
    const profile = await this.prisma.doctorProfile.findUnique({
      where: { id },
      include: {
        availabilitySlots: true,
      },
    });
    if (!profile) {
      throw new NotFoundException('Doctor profile not found');
    }
    return profile;
  }
}
