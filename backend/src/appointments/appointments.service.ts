import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { AppointmentStatus, SlotStatus } from '@prisma/client';

@Injectable()
export class AppointmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async create(userId: string, createAppointmentDto: CreateAppointmentDto) {
    const patientProfile = await this.prisma.patientProfile.findUnique({
      where: { userId },
    });

    if (!patientProfile) {
      throw new NotFoundException('Patient profile not found');
    }

    const appointment = await this.prisma.$transaction(async (tx) => {
      const slot = await tx.availabilitySlot.findUnique({
        where: { id: createAppointmentDto.slotId },
      });

      if (!slot) {
        throw new NotFoundException('Availability slot not found');
      }

      if (slot.status !== SlotStatus.AVAILABLE) {
        throw new BadRequestException('Slot is not available');
      }

      await tx.availabilitySlot.update({
        where: { id: slot.id },
        data: { status: SlotStatus.BOOKED },
      });

      return tx.appointment.create({
        data: {
          patientId: patientProfile.id,
          doctorId: slot.doctorId,
          slotId: slot.id,
          reasonForVisit: createAppointmentDto.reasonForVisit,
          status: AppointmentStatus.PENDING,
        },
        include: { doctor: { include: { user: true } } },
      });
    });

    // Notify doctor of new booking (fire-and-forget)
    this.notifications
      .createNotification(
        appointment.doctor.userId,
        'APPOINTMENT_BOOKED',
        'New Appointment Request',
        `You have a new appointment request from ${patientProfile.fullName}.`,
      )
      .catch(() => null);

    // Notify patient of booking confirmation
    this.notifications
      .createNotification(
        userId,
        'APPOINTMENT_BOOKED',
        'Appointment Requested',
        `Your appointment with ${appointment.doctor.fullName} has been requested.`,
      )
      .catch(() => null);

    return appointment;
  }

  async findAllForPatient(userId: string) {
    const patientProfile = await this.prisma.patientProfile.findUnique({
      where: { userId },
    });

    if (!patientProfile) {
      throw new NotFoundException('Patient profile not found');
    }

    return this.prisma.appointment.findMany({
      where: { patientId: patientProfile.id },
      include: {
        doctor: true,
        slot: true,
      },
    });
  }

  async findAllForDoctor(userId: string) {
    const doctorProfile = await this.prisma.doctorProfile.findUnique({
      where: { userId },
    });

    if (!doctorProfile) {
      throw new NotFoundException('Doctor profile not found');
    }

    return this.prisma.appointment.findMany({
      where: { doctorId: doctorProfile.id },
      include: {
        patient: true,
        slot: true,
      },
    });
  }

  async findOne(userId: string, appointmentId: string) {
    const doctorProfile = await this.prisma.doctorProfile.findUnique({
      where: { userId },
    });

    if (!doctorProfile) {
      throw new NotFoundException('Doctor profile not found');
    }

    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: { patient: true, slot: true },
    });

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    if (appointment.doctorId !== doctorProfile.id) {
      throw new ForbiddenException(
        'You do not have access to this appointment',
      );
    }

    return appointment;
  }

  async updateStatus(userId: string, id: string, status: AppointmentStatus) {
    const doctorProfile = await this.prisma.doctorProfile.findUnique({
      where: { userId },
    });

    if (!doctorProfile) {
      throw new NotFoundException('Doctor profile not found');
    }

    const appointment = await this.prisma.appointment.findUnique({
      where: { id },
      include: { patient: { include: { user: true } } },
    });

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    if (appointment.doctorId !== doctorProfile.id) {
      throw new BadRequestException(
        'You can only update your own appointments',
      );
    }

    // Free the slot when cancelling
    if (status === AppointmentStatus.CANCELLED) {
      await this.prisma.availabilitySlot.update({
        where: { id: appointment.slotId },
        data: { status: SlotStatus.AVAILABLE },
      });
    }

    const updated = await this.prisma.appointment.update({
      where: { id },
      data: { status },
    });

    // Notify the patient about the status change
    const statusMessages: Partial<Record<AppointmentStatus, { title: string; message: string }>> = {
      [AppointmentStatus.CONFIRMED]: {
        title: 'Appointment Confirmed',
        message: `Your appointment with ${doctorProfile.fullName} has been confirmed.`,
      },
      [AppointmentStatus.CANCELLED]: {
        title: 'Appointment Cancelled',
        message: `Your appointment with ${doctorProfile.fullName} has been cancelled.`,
      },
      [AppointmentStatus.COMPLETED]: {
        title: 'Appointment Completed',
        message: `Your appointment with ${doctorProfile.fullName} is complete. Check your records for notes.`,
      },
    };

    const notif = statusMessages[status];
    if (notif && appointment.patient?.userId) {
      this.notifications
        .createNotification(appointment.patient.userId, `APPOINTMENT_${status}`, notif.title, notif.message)
        .catch(() => null);
    }

    return updated;
  }
}
