/**
 * Patients service — CRUD for PatientProfile and PatientMedicalHistory.
 *
 * Enforces the 1:1 constraint between a User and their PatientProfile and ensures
 * a blank MedicalHistoryRecord is always created alongside the initial profile.
 * Also consumed by other modules (e.g. RecommendationsModule) that need to read
 * a patient's clinical context.
 */
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../infrastructure/prisma/prisma.service';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { UpdateMedicalHistoryDto } from './dto/update-medical-history.dto';

/**
 * Manages the lifecycle of `PatientProfile` and its associated
 * `PatientMedicalHistory` record. All look-ups are keyed by `userId`
 * (the auth identity) rather than the internal profile id.
 */
@Injectable()
export class PatientsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Creates a patient profile for the given user.
   * Throws 409 if a profile already exists (one user → one profile).
   * A blank `medicalHistoryRecord` is always provisioned in the same transaction
   * so downstream reads never need to handle a missing history record.
   */
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
        // DTO carries birthdate as an ISO string; Prisma expects a Date object.
        birthdate: new Date(createPatientDto.birthdate),
        user: { connect: { id: userId } },
        medicalHistoryRecord: { create: {} },
      },
    });
  }

  /**
   * Fetches the patient profile (including medical history) for the given user.
   * Throws 404 if no profile exists yet.
   */
  async findByUserId(userId: string) {
    const profile = await this.prisma.patientProfile.findUnique({
      where: { userId },
      include: { medicalHistoryRecord: true },
    });
    if (!profile) throw new NotFoundException('Profile not found');
    return profile;
  }

  /**
   * Upserts the patient's structured medical history (allergies, conditions, etc.).
   * Resolves the profile first to obtain the internal `patientId` foreign key.
   */
  async updateMedicalHistory(userId: string, dto: UpdateMedicalHistoryDto) {
    const profile = await this.findByUserId(userId);
    return this.prisma.patientMedicalHistory.upsert({
      where: { patientId: profile.id },
      update: dto,
      create: { patientId: profile.id, ...dto },
    });
  }

  /** Partially updates demographic/contact fields on the patient profile. */
  async update(userId: string, updatePatientDto: UpdatePatientDto) {
    const profile = await this.findByUserId(userId);
    return this.prisma.patientProfile.update({
      where: { id: profile.id },
      data: {
        ...updatePatientDto,
        // Only re-parse birthdate when it was explicitly supplied in the payload.
        birthdate: updatePatientDto.birthdate
          ? new Date(updatePatientDto.birthdate)
          : undefined,
      },
    });
  }
}
