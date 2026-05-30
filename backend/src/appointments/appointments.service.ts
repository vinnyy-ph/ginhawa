/**
 * Business logic for appointment booking, status lifecycle management,
 * rescheduling, and role-scoped history/queue views.
 *
 * Integrates with `NotificationsService` for fire-and-forget push notifications
 * after every state-changing operation. All slot mutations (BOOKED ↔ AVAILABLE)
 * and payment record creation are performed inside Prisma transactions to
 * guarantee consistency.
 */
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../infrastructure/prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import {
  AppointmentStatus,
  SlotStatus,
  NotificationType,
} from '@prisma/client';
import {
  isAllowedTransition,
  buildStatusNotification,
  paymentStatusFor,
} from './appointments.helpers';

/**
 * Orchestrates the full appointment lifecycle: booking, status transitions,
 * rescheduling, and cross-role history reads. Ownership checks are performed
 * on every mutation to ensure a user can only affect their own appointments.
 */
@Injectable()
export class AppointmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  /** Resolve a patient profile by auth user ID, throwing `NotFoundException` if absent. */
  private async getPatientProfileOrThrow(userId: string) {
    const profile = await this.prisma.patientProfile.findUnique({
      where: { userId },
    });
    if (!profile) {
      throw new NotFoundException('Patient profile not found');
    }
    return profile;
  }

  /** Resolve a doctor profile by auth user ID, throwing `NotFoundException` if absent. */
  private async getDoctorProfileOrThrow(userId: string) {
    const profile = await this.prisma.doctorProfile.findUnique({
      where: { userId },
    });
    if (!profile) {
      throw new NotFoundException('Doctor profile not found');
    }
    return profile;
  }

  /** Fire-and-forget notification; never blocks or fails the request. */
  private notify(
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
  ): void {
    this.notifications
      .createNotification(userId, type, title, message)
      .catch(() => null);
  }

  /**
   * Book a new appointment for the given patient user.
   *
   * Inside a transaction: validates the slot is AVAILABLE and in the future,
   * marks it BOOKED, creates the appointment (status PENDING), and creates the
   * payment record (PAID for non-zero fee, WAIVED for free consultations).
   * After commit, notifies both doctor and patient via fire-and-forget.
   *
   * @throws `NotFoundException` if the slot does not exist.
   * @throws `BadRequestException` if the slot is already taken or in the past.
   */
  async create(userId: string, createAppointmentDto: CreateAppointmentDto) {
    const patientProfile = await this.getPatientProfileOrThrow(userId);

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
      if (new Date(slot.startTime) < new Date()) {
        throw new BadRequestException('Cannot book a slot in the past');
      }

      await tx.availabilitySlot.update({
        where: { id: slot.id },
        data: { status: SlotStatus.BOOKED },
      });

      const newAppointment = await tx.appointment.create({
        data: {
          patientId: patientProfile.id,
          doctorId: slot.doctorId,
          slotId: slot.id,
          reasonForVisit: createAppointmentDto.reasonForVisit,
          status: AppointmentStatus.PENDING,
        },
        include: {
          doctor: {
            include: {
              user: { select: { id: true, email: true, role: true } },
            },
          },
        },
      });

      const fee = newAppointment.doctor.consultationFee ?? 0;
      await tx.payment.create({
        data: {
          appointmentId: newAppointment.id,
          amount: fee,
          status: paymentStatusFor(fee),
        },
      });

      return newAppointment;
    });

    // Notify doctor of the new booking, and the patient of their request.
    this.notify(
      appointment.doctor.userId,
      NotificationType.APPOINTMENT_BOOKED,
      'New Appointment Request',
      `You have a new appointment request from ${patientProfile.fullName}.`,
    );
    this.notify(
      userId,
      NotificationType.APPOINTMENT_BOOKED,
      'Appointment Requested',
      `Your appointment with ${appointment.doctor.fullName} has been requested.`,
    );

    return appointment;
  }

  /** Return all appointments for a patient, including doctor, slot, and payment details. */
  async findAllForPatient(userId: string) {
    const patientProfile = await this.getPatientProfileOrThrow(userId);

    return this.prisma.appointment.findMany({
      where: { patientId: patientProfile.id },
      include: {
        doctor: true,
        slot: true,
        payment: true,
      },
    });
  }

  /**
   * Return the distinct doctors a patient has ever booked with, along with
   * per-doctor aggregates (`totalVisits`, `upcomingCount`, `lastVisit`).
   * Results are sorted by most recent past visit so the patient's most active
   * care relationships appear first.
   */
  async findDoctorsForPatient(userId: string) {
    const patientProfile = await this.getPatientProfileOrThrow(userId);

    const appointments = await this.prisma.appointment.findMany({
      where: { patientId: patientProfile.id },
      include: {
        doctor: {
          select: {
            id: true,
            fullName: true,
            professionalTitle: true,
            specialization: true,
            profilePictureUrl: true,
          },
        },
        slot: { select: { startTime: true } },
      },
    });

    const now = Date.now();
    const map = new Map<
      string,
      {
        doctor: (typeof appointments)[number]['doctor'];
        totalVisits: number;
        upcomingCount: number;
        lastVisit: string | null;
      }
    >();

    for (const appt of appointments) {
      const start = appt.slot ? appt.slot.startTime.getTime() : 0;
      const isUpcoming =
        (appt.status === AppointmentStatus.PENDING ||
          appt.status === AppointmentStatus.CONFIRMED) &&
        start >= now;

      let row = map.get(appt.doctorId);
      if (!row) {
        row = {
          doctor: appt.doctor,
          totalVisits: 0,
          upcomingCount: 0,
          lastVisit: null,
        };
        map.set(appt.doctorId, row);
      }

      row.totalVisits += 1;
      if (isUpcoming) row.upcomingCount += 1;
      if (start && start <= now) {
        const startIso = appt.slot.startTime.toISOString();
        if (!row.lastVisit || start > new Date(row.lastVisit).getTime()) {
          row.lastVisit = startIso;
        }
      }
    }

    return Array.from(map.values()).sort((a, b) => {
      if (!a.lastVisit && !b.lastVisit) return 0;
      if (!a.lastVisit) return 1;
      if (!b.lastVisit) return -1;
      return new Date(b.lastVisit).getTime() - new Date(a.lastVisit).getTime();
    });
  }

  /** Return all appointments in the doctor's queue, including patient, slot, and payment details. */
  async findAllForDoctor(userId: string) {
    const doctorProfile = await this.getDoctorProfileOrThrow(userId);

    return this.prisma.appointment.findMany({
      where: { doctorId: doctorProfile.id },
      include: {
        patient: true,
        slot: true,
        payment: true,
      },
    });
  }

  // Distinct patients who have booked with this doctor, with light aggregates.
  async findPatientsForDoctor(userId: string) {
    const doctorProfile = await this.getDoctorProfileOrThrow(userId);

    const appointments = await this.prisma.appointment.findMany({
      where: { doctorId: doctorProfile.id },
      include: {
        patient: {
          select: { id: true, fullName: true, profilePictureUrl: true },
        },
        slot: { select: { startTime: true } },
        medicalRecord: { include: { prescriptions: true } },
      },
    });

    const now = Date.now();
    const map = new Map<
      string,
      {
        patient: (typeof appointments)[number]['patient'];
        totalVisits: number;
        upcomingCount: number;
        lastVisit: string | null;
        searchText: string;
      }
    >();

    for (const appt of appointments) {
      const start = appt.slot ? appt.slot.startTime.getTime() : 0;
      const isUpcoming =
        (appt.status === AppointmentStatus.PENDING ||
          appt.status === AppointmentStatus.CONFIRMED) &&
        start >= now;

      let row = map.get(appt.patientId);
      if (!row) {
        row = {
          patient: appt.patient,
          totalVisits: 0,
          upcomingCount: 0,
          lastVisit: null,
          searchText: '',
        };
        map.set(appt.patientId, row);
      }

      row.totalVisits += 1;
      if (isUpcoming) row.upcomingCount += 1;
      if (start && start <= now) {
        const startIso = appt.slot.startTime.toISOString();
        if (!row.lastVisit || start > new Date(row.lastVisit).getTime()) {
          row.lastVisit = startIso;
        }
      }

      const rec = appt.medicalRecord;
      const parts = [
        appt.reasonForVisit,
        rec?.notes,
        rec?.recommendations,
        rec?.followUpAdvice,
        rec?.prescription,
        ...(rec?.prescriptions ?? []).flatMap((rx) => [
          rx.drugName,
          rx.dosage,
          rx.frequency,
          rx.instructions,
        ]),
      ].filter((p): p is string => !!p && p.trim().length > 0);

      if (parts.length > 0) {
        row.searchText = row.searchText
          ? `${row.searchText} · ${parts.join(' · ')}`
          : parts.join(' · ');
      }
    }

    return Array.from(map.values()).sort((a, b) =>
      a.patient.fullName.localeCompare(b.patient.fullName),
    );
  }

  // One patient's full profile + every appointment with this doctor, including
  // the consultation record (medical record + prescriptions). Doctor-scoped.
  async findPatientHistoryForDoctor(userId: string, patientId: string) {
    const doctorProfile = await this.getDoctorProfileOrThrow(userId);

    const patient = await this.prisma.patientProfile.findUnique({
      where: { id: patientId },
    });

    if (!patient) {
      throw new NotFoundException('Patient not found');
    }

    const appointments = await this.prisma.appointment.findMany({
      where: { doctorId: doctorProfile.id, patientId },
      include: {
        slot: true,
        medicalRecord: { include: { prescriptions: true } },
      },
      orderBy: { slot: { startTime: 'desc' } },
    });

    // Enforce ownership: a doctor may only view patients they have treated.
    if (appointments.length === 0) {
      throw new ForbiddenException('This patient is not in your care');
    }

    return { patient, appointments };
  }

  /**
   * Fetch a single appointment by ID, verifying the calling doctor owns it.
   *
   * @throws `NotFoundException` if the appointment does not exist.
   * @throws `ForbiddenException` if the appointment belongs to a different doctor.
   */
  async findOne(userId: string, appointmentId: string) {
    const doctorProfile = await this.getDoctorProfileOrThrow(userId);

    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: { patient: true, slot: true, payment: true },
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

  /**
   * Transition an appointment to a new status, enforcing role-based ownership
   * and the allowed transition matrix from `appointments.helpers`.
   *
   * When cancelling, the underlying slot is freed back to AVAILABLE so it can be
   * rebooked. Notifies the other party (doctor notifies patient, patient notifies
   * doctor) via fire-and-forget after the DB write commits.
   *
   * @throws `BadRequestException` if the transition is not permitted or a patient
   *   attempts to set a status other than CANCELLED.
   * @throws `ForbiddenException` if the caller does not own the appointment.
   */
  async updateStatus(
    userId: string,
    role: string,
    id: string,
    status: AppointmentStatus,
    cancelReason?: string,
  ) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id },
      include: {
        patient: {
          include: {
            user: { select: { id: true, email: true, role: true } },
          },
        },
        doctor: {
          include: {
            user: { select: { id: true, email: true, role: true } },
          },
        },
      },
    });

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    // Authorization & validation
    if (role === 'DOCTOR') {
      if (appointment.doctor.userId !== userId) {
        throw new ForbiddenException(
          'You can only update your own appointments',
        );
      }
    } else if (role === 'PATIENT') {
      if (appointment.patient.userId !== userId) {
        throw new ForbiddenException(
          'You can only update your own appointments',
        );
      }
      if (status !== AppointmentStatus.CANCELLED) {
        throw new BadRequestException(
          'Patients can only cancel their appointments',
        );
      }
    } else {
      throw new ForbiddenException('Unauthorized role');
    }

    if (!isAllowedTransition(role, appointment.status, status)) {
      throw new BadRequestException(
        `Invalid status transition: ${appointment.status} → ${status}`,
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
      data: {
        status,
        ...(status === AppointmentStatus.CANCELLED && {
          cancelledAt: new Date(),
          cancelReason: cancelReason ?? null,
        }),
      },
    });

    // Notify the other party about the status change.
    const notif = buildStatusNotification(status, {
      role,
      doctorName: appointment.doctor.fullName,
      patientName: appointment.patient.fullName,
      patientUserId: appointment.patient.userId,
      doctorUserId: appointment.doctor.userId,
    });
    if (notif) {
      this.notify(notif.targetUserId, notif.type, notif.title, notif.message);
    }

    return updated;
  }

  /**
   * Move an appointment to a new time slot. Only PENDING or CONFIRMED appointments
   * can be rescheduled. The new slot must belong to the same doctor and be AVAILABLE.
   *
   * Atomically: marks the original appointment RESCHEDULED, frees its slot, marks
   * the new slot BOOKED, creates a replacement appointment (status PENDING), and
   * creates a new payment record. Notifies the other party after the transaction.
   *
   * @throws `BadRequestException` if the slot belongs to a different doctor, is
   *   taken, is in the past, or the appointment is not in a reschedulable state.
   * @throws `ForbiddenException` if the caller does not own the appointment.
   */
  async reschedule(
    userId: string,
    role: string,
    appointmentId: string,
    newSlotId: string,
  ) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        patient: true,
        doctor: true,
      },
    });

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    const isOwner =
      role === 'DOCTOR'
        ? appointment.doctor.userId === userId
        : appointment.patient.userId === userId;
    if (!isOwner) {
      throw new ForbiddenException(
        'You can only reschedule your own appointments',
      );
    }

    if (
      appointment.status !== AppointmentStatus.PENDING &&
      appointment.status !== AppointmentStatus.CONFIRMED
    ) {
      throw new BadRequestException(
        'Only pending or confirmed appointments can be rescheduled',
      );
    }

    const newAppointment = await this.prisma.$transaction(async (tx) => {
      const slot = await tx.availabilitySlot.findUnique({
        where: { id: newSlotId },
      });

      if (!slot) {
        throw new NotFoundException('Availability slot not found');
      }
      if (slot.doctorId !== appointment.doctorId) {
        throw new BadRequestException('Slot belongs to a different doctor');
      }
      if (slot.status !== SlotStatus.AVAILABLE) {
        throw new BadRequestException('Slot is not available');
      }
      if (new Date(slot.startTime) < new Date()) {
        throw new BadRequestException('Cannot book a slot in the past');
      }

      await tx.availabilitySlot.update({
        where: { id: newSlotId },
        data: { status: SlotStatus.BOOKED },
      });
      await tx.availabilitySlot.update({
        where: { id: appointment.slotId },
        data: { status: SlotStatus.AVAILABLE },
      });
      await tx.appointment.update({
        where: { id: appointmentId },
        data: { status: AppointmentStatus.RESCHEDULED },
      });

      const created = await tx.appointment.create({
        data: {
          patientId: appointment.patientId,
          doctorId: appointment.doctorId,
          slotId: newSlotId,
          reasonForVisit: appointment.reasonForVisit,
          status: AppointmentStatus.PENDING,
          rescheduledFromId: appointmentId,
        },
      });

      const fee = appointment.doctor.consultationFee ?? 0;
      await tx.payment.create({
        data: {
          appointmentId: created.id,
          amount: fee,
          status: paymentStatusFor(fee),
        },
      });

      return created;
    });

    const targetUserId =
      role === 'DOCTOR'
        ? appointment.patient.userId
        : appointment.doctor.userId;
    const message =
      role === 'DOCTOR'
        ? `Your appointment with ${appointment.doctor.fullName} has been rescheduled to a new time slot.`
        : `Patient ${appointment.patient.fullName} has rescheduled their appointment.`;
    this.notify(
      targetUserId,
      NotificationType.APPOINTMENT_RESCHEDULED,
      'Appointment Rescheduled',
      message,
    );

    return newAppointment;
  }
}
