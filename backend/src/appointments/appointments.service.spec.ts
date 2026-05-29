import { Test, TestingModule } from '@nestjs/testing';
import { AppointmentsService } from './appointments.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotFoundException } from '@nestjs/common';
import { AppointmentStatus, SlotStatus } from '@prisma/client';

describe('AppointmentsService', () => {
  let service: AppointmentsService;

  const mockSlot = {
    id: 'slot-1',
    doctorId: 'doctor-1',
    status: SlotStatus.AVAILABLE,
    startTime: new Date(Date.now() + 86400000),
    endTime: new Date(Date.now() + 90000000),
  };

  const mockAppointment = {
    id: 'appt-1',
    patientId: 'patient-1',
    doctorId: 'doctor-1',
    slotId: 'slot-1',
    status: AppointmentStatus.PENDING,
    doctor: {
      fullName: 'Dr. Smith',
      userId: 'user-doctor-1',
      consultationFee: 500,
    },
  };

  const mockTx = {
    availabilitySlot: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    appointment: {
      create: jest.fn(),
    },
    payment: {
      create: jest.fn(),
    },
  };

  const mockPrismaService = {
    patientProfile: {
      findUnique: jest.fn(),
    },
    appointment: {
      findUnique: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockNotificationsService = {
    createNotification: jest.fn().mockResolvedValue(null),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppointmentsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: NotificationsService, useValue: mockNotificationsService },
      ],
    }).compile();

    service = module.get<AppointmentsService>(AppointmentsService);
    jest.clearAllMocks();

    mockPrismaService.patientProfile.findUnique.mockResolvedValue({ id: 'patient-1', fullName: 'Jane Doe' });
    mockPrismaService.$transaction.mockImplementation(async (cb) => cb(mockTx));
    mockTx.availabilitySlot.findUnique.mockResolvedValue(mockSlot);
    mockTx.availabilitySlot.update.mockResolvedValue({ ...mockSlot, status: SlotStatus.BOOKED });
    mockTx.appointment.create.mockResolvedValue(mockAppointment);
    mockTx.payment.create.mockResolvedValue({ id: 'payment-1' });
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should auto-create a PAID payment when consultationFee > 0', async () => {
      await service.create('user-patient-1', { slotId: 'slot-1' });

      expect(mockTx.payment.create).toHaveBeenCalledWith({
        data: {
          appointmentId: 'appt-1',
          amount: 500,
          status: 'PAID',
        },
      });
    });

    it('should auto-create a WAIVED payment when consultationFee is null', async () => {
      mockTx.appointment.create.mockResolvedValue({
        ...mockAppointment,
        doctor: { ...mockAppointment.doctor, consultationFee: null },
      });

      await service.create('user-patient-1', { slotId: 'slot-1' });

      expect(mockTx.payment.create).toHaveBeenCalledWith({
        data: {
          appointmentId: 'appt-1',
          amount: 0,
          status: 'WAIVED',
        },
      });
    });

    it('should throw NotFoundException when patient profile not found', async () => {
      mockPrismaService.patientProfile.findUnique.mockResolvedValue(null);

      await expect(
        service.create('user-patient-1', { slotId: 'slot-1' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('reschedule', () => {
    const oldAppt = {
      id: 'appt-1',
      patientId: 'patient-1',
      doctorId: 'doctor-1',
      slotId: 'slot-old',
      status: AppointmentStatus.CONFIRMED,
      reasonForVisit: 'checkup',
      patient: { userId: 'user-patient-1' },
      doctor: { userId: 'user-doctor-1', consultationFee: 500 },
    };
    const newSlot = {
      id: 'slot-new',
      doctorId: 'doctor-1',
      status: SlotStatus.AVAILABLE,
      startTime: new Date(Date.now() + 86400000),
    };
    const rtx = {
      availabilitySlot: { findUnique: jest.fn(), update: jest.fn() },
      appointment: { update: jest.fn(), create: jest.fn() },
      payment: { create: jest.fn() },
    };

    beforeEach(() => {
      mockPrismaService.appointment.findUnique = jest.fn().mockResolvedValue(oldAppt);
      rtx.availabilitySlot.findUnique.mockResolvedValue(newSlot);
      rtx.appointment.create.mockResolvedValue({ id: 'appt-2', rescheduledFromId: 'appt-1' });
      mockPrismaService.$transaction.mockImplementation(async (cb) => cb(rtx));
    });

    it('links the new appointment to the old and marks the old RESCHEDULED', async () => {
      const result = await service.reschedule('user-patient-1', 'PATIENT', 'appt-1', 'slot-new');

      expect(rtx.appointment.update).toHaveBeenCalledWith({
        where: { id: 'appt-1' },
        data: { status: AppointmentStatus.RESCHEDULED },
      });
      expect(rtx.appointment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            slotId: 'slot-new',
            rescheduledFromId: 'appt-1',
            status: AppointmentStatus.PENDING,
          }),
        }),
      );
      expect(result.rescheduledFromId).toBe('appt-1');
    });

    it('rejects a slot belonging to a different doctor', async () => {
      rtx.availabilitySlot.findUnique.mockResolvedValue({ ...newSlot, doctorId: 'doctor-2' });
      await expect(
        service.reschedule('user-patient-1', 'PATIENT', 'appt-1', 'slot-new'),
      ).rejects.toThrow('Slot belongs to a different doctor');
    });
  });
});
