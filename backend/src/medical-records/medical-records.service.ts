import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '@prisma/client';
import { CreateMedicalRecordDto } from './dto/create-medical-record.dto';
import { UpdateMedicalRecordDto } from './dto/update-medical-record.dto';

@Injectable()
export class MedicalRecordsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async create(userId: string, createMedicalRecordDto: CreateMedicalRecordDto) {
    const doctorProfile = await this.prisma.doctorProfile.findUnique({
      where: { userId },
    });

    if (!doctorProfile) {
      throw new NotFoundException('Doctor profile not found');
    }

    const appointment = await this.prisma.appointment.findUnique({
      where: { id: createMedicalRecordDto.appointmentId },
    });

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    if (appointment.doctorId !== doctorProfile.id) {
      throw new ForbiddenException(
        'You are not authorized to create a record for this appointment',
      );
    }

    const existingRecord = await this.prisma.medicalRecord.findUnique({
      where: { appointmentId: appointment.id },
    });

    if (existingRecord) {
      throw new ConflictException(
        'Medical record already exists for this appointment',
      );
    }

    if (createMedicalRecordDto.followUpAppointmentId) {
      const followUp = await this.prisma.appointment.findUnique({
        where: { id: createMedicalRecordDto.followUpAppointmentId },
      });
      if (!followUp || followUp.patientId !== appointment.patientId) {
        throw new BadRequestException('Invalid follow-up appointment');
      }
      const alreadyLinked = await this.prisma.medicalRecord.findUnique({
        where: {
          followUpAppointmentId: createMedicalRecordDto.followUpAppointmentId,
        },
      });
      if (alreadyLinked) {
        throw new ConflictException(
          'Follow-up appointment is already linked to another record',
        );
      }
    }

    const record = await this.prisma.medicalRecord.create({
      data: {
        appointmentId: appointment.id,
        patientId: appointment.patientId,
        doctorId: doctorProfile.id,
        notes: createMedicalRecordDto.notes,
        prescription: createMedicalRecordDto.prescription,
        recommendations: createMedicalRecordDto.recommendations,
        followUpAdvice: createMedicalRecordDto.followUpAdvice,
        followUpAppointmentId: createMedicalRecordDto.followUpAppointmentId,
        ...(createMedicalRecordDto.prescriptions?.length
          ? { prescriptions: { create: createMedicalRecordDto.prescriptions } }
          : {}),
      },
      include: {
        appointment: true,
        prescriptions: true,
        patient: {
          include: { user: { select: { email: true } } },
        },
      },
    });

    // Notify patient that a new medical record is available
    if (record.patient?.userId) {
      this.notifications
        .createNotification(
          record.patient.userId,
          NotificationType.MEDICAL_RECORD_CREATED,
          'New Medical Record',
          `${doctorProfile.fullName} has added consultation notes and a prescription to your records.`,
        )
        .catch(() => null);
    }

    return record;
  }

  async update(userId: string, recordId: string, dto: UpdateMedicalRecordDto) {
    const doctorProfile = await this.prisma.doctorProfile.findUnique({
      where: { userId },
    });
    if (!doctorProfile) {
      throw new NotFoundException('Doctor profile not found');
    }
    const record = await this.prisma.medicalRecord.findUnique({
      where: { id: recordId },
    });
    if (!record) {
      throw new NotFoundException('Medical record not found');
    }
    if (record.doctorId !== doctorProfile.id) {
      throw new ForbiddenException(
        'You are not authorized to amend this record',
      );
    }
    return this.prisma.medicalRecord.update({
      where: { id: recordId },
      data: {
        notes: dto.notes,
        prescription: dto.prescription,
        recommendations: dto.recommendations,
        followUpAdvice: dto.followUpAdvice,
      },
      include: {
        appointment: true,
        prescriptions: true,
        patient: { include: { user: { select: { email: true } } } },
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

    return this.prisma.medicalRecord.findMany({
      where: { patientId: patientProfile.id },
      include: {
        doctor: {
          include: { user: { select: { email: true } } },
        },
        appointment: true,
        prescriptions: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findAllForDoctor(userId: string) {
    const doctorProfile = await this.prisma.doctorProfile.findUnique({
      where: { userId },
    });

    if (!doctorProfile) {
      throw new NotFoundException('Doctor profile not found');
    }

    return this.prisma.medicalRecord.findMany({
      where: { doctorId: doctorProfile.id },
      include: {
        patient: {
          include: { user: { select: { email: true } } },
        },
        appointment: true,
        prescriptions: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
