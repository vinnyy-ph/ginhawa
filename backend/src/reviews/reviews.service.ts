import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { AppointmentStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateReviewDto) {
    const patient = await this.prisma.patientProfile.findUnique({
      where: { userId },
    });
    if (!patient) {
      throw new NotFoundException('Patient profile not found');
    }

    const appointment = await this.prisma.appointment.findUnique({
      where: { id: dto.appointmentId },
    });
    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }
    if (appointment.patientId !== patient.id) {
      throw new ForbiddenException('You can only review your own appointments');
    }
    if (appointment.status !== AppointmentStatus.COMPLETED) {
      throw new BadRequestException(
        'You can only review completed appointments',
      );
    }

    const existing = await this.prisma.review.findUnique({
      where: { appointmentId: dto.appointmentId },
    });
    if (existing) {
      throw new ConflictException(
        'A review already exists for this appointment',
      );
    }

    return this.prisma.review.create({
      data: {
        appointmentId: dto.appointmentId,
        patientId: patient.id,
        doctorId: appointment.doctorId,
        rating: dto.rating,
        comment: dto.comment,
      },
    });
  }
}
