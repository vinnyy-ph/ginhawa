/**
 * Business logic for doctor reviews.
 * Enforces the invariant that only the patient who attended a COMPLETED appointment
 * can leave exactly one review; subsequent attempts are rejected as conflicts.
 * Public retrieval filters by `isVisible` to support moderation workflows.
 */
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { AppointmentStatus } from '@prisma/client';
import { PrismaService } from '../infrastructure/prisma/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';

/**
 * Service that manages the creation and retrieval of doctor reviews.
 */
@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Creates a review for a completed appointment.
   * Guards:
   * - Only the patient who attended the appointment may review it.
   * - The appointment must be in COMPLETED status.
   * - One review per appointment (unique constraint enforced at both app and DB level).
   *
   * @throws NotFoundException if the patient profile or appointment is not found.
   * @throws ForbiddenException if the caller did not attend the appointment.
   * @throws BadRequestException if the appointment is not yet completed.
   * @throws ConflictException if a review already exists for this appointment.
   */
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
    // Reviews are only meaningful once a consultation has taken place.
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

  /**
   * Returns all visible reviews for a given doctor, ordered newest-first.
   * Only reviews where `isVisible = true` are returned, allowing admins to
   * hide inappropriate content without deleting records.
   */
  findByDoctor(doctorId: string) {
    return this.prisma.review.findMany({
      where: { doctorId, isVisible: true },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        rating: true,
        comment: true,
        createdAt: true,
        patient: { select: { fullName: true, profilePictureUrl: true } },
      },
    });
  }
}
