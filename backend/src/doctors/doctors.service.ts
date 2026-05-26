import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
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

  async findAllPublic(search?: string, specialization?: string) {
    const where: any = {};
    
    if (search) {
      where.fullName = { contains: search, mode: 'insensitive' };
    }
    
    if (specialization) {
      where.specialization = { contains: specialization, mode: 'insensitive' };
    }

    return this.prisma.doctorProfile.findMany({ where });
  }

  async findOnePublic(id: string) {
    const profile = await this.prisma.doctorProfile.findUnique({
      where: { id },
    });
    if (!profile) {
      throw new NotFoundException('Doctor profile not found');
    }
    return profile;
  }
}
