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
      findMany: jest.fn(),
    },
    doctorProfile: {
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

    mockPrismaService.patientProfile.findUnique.mockResolvedValue({
      id: 'patient-1',
      fullName: 'Jane Doe',
    });
    mockPrismaService.$transaction.mockImplementation(async (cb) => cb(mockTx));
    mockTx.availabilitySlot.findUnique.mockResolvedValue(mockSlot);
    mockTx.availabilitySlot.update.mockResolvedValue({
      ...mockSlot,
      status: SlotStatus.BOOKED,
    });
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

  it('includes payment when listing patient appointments', async () => {
    mockPrismaService.patientProfile.findUnique.mockResolvedValue({
      id: 'patient-1',
    });
    mockPrismaService.appointment.findMany = jest.fn().mockResolvedValue([]);

    await service.findAllForPatient('user-1');

    expect(mockPrismaService.appointment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({ payment: true }),
      }),
    );
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
      mockPrismaService.appointment.findUnique = jest
        .fn()
        .mockResolvedValue(oldAppt);
      rtx.availabilitySlot.findUnique.mockResolvedValue(newSlot);
      rtx.appointment.create.mockResolvedValue({
        id: 'appt-2',
        rescheduledFromId: 'appt-1',
      });
      mockPrismaService.$transaction.mockImplementation(async (cb) => cb(rtx));
    });

    it('links the new appointment to the old and marks the old RESCHEDULED', async () => {
      const result = await service.reschedule(
        'user-patient-1',
        'PATIENT',
        'appt-1',
        'slot-new',
      );

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
      rtx.availabilitySlot.findUnique.mockResolvedValue({
        ...newSlot,
        doctorId: 'doctor-2',
      });
      await expect(
        service.reschedule('user-patient-1', 'PATIENT', 'appt-1', 'slot-new'),
      ).rejects.toThrow('Slot belongs to a different doctor');
    });
  });

  describe('findPatientsForDoctor', () => {
    beforeEach(() => {
      mockPrismaService.doctorProfile.findUnique.mockResolvedValue({
        id: 'doctor-1',
      });
    });

    it('builds searchText from reason, record notes and prescriptions', async () => {
      mockPrismaService.appointment.findMany.mockResolvedValue([
        {
          patientId: 'patient-1',
          patient: {
            id: 'patient-1',
            fullName: 'Maria Santos',
            profilePictureUrl: null,
          },
          status: AppointmentStatus.COMPLETED,
          reasonForVisit: 'follow up',
          slot: { startTime: new Date(Date.now() - 86400000) },
          medicalRecord: {
            notes: 'patient appeared distressed',
            recommendations: 'rest',
            followUpAdvice: null,
            prescription: null,
            prescriptions: [
              {
                drugName: 'Paracetamol',
                dosage: '500mg',
                frequency: 'BID',
                instructions: 'after meals',
              },
            ],
          },
        },
      ]);

      const rows = await service.findPatientsForDoctor('user-doctor-1');

      expect(rows).toHaveLength(1);
      const text = rows[0].searchText.toLowerCase();
      expect(text).toContain('follow up');
      expect(text).toContain('distressed');
      expect(text).toContain('rest');
      expect(text).toContain('paracetamol');
      expect(text).toContain('after meals');
    });

    it('handles appointments with no medical record', async () => {
      mockPrismaService.appointment.findMany.mockResolvedValue([
        {
          patientId: 'patient-2',
          patient: {
            id: 'patient-2',
            fullName: 'Jose Cruz',
            profilePictureUrl: null,
          },
          status: AppointmentStatus.PENDING,
          reasonForVisit: 'cough',
          slot: { startTime: new Date(Date.now() + 86400000) },
          medicalRecord: null,
        },
      ]);

      const rows = await service.findPatientsForDoctor('user-doctor-1');

      expect(rows[0].searchText.toLowerCase()).toContain('cough');
    });
  });

  describe('findDoctorsForPatient', () => {
    const pastTime1 = new Date(Date.now() - 86400000); // yesterday
    const pastTime2 = new Date(Date.now() - 172800000); // 2 days ago
    const futureTime = new Date(Date.now() + 86400000); // tomorrow

    function makeAppt(
      doctorId: string,
      slotTime: Date,
      status: AppointmentStatus,
      doctorName: string,
    ) {
      return {
        id: `appt-${doctorId}-${slotTime.getTime()}`,
        patientId: 'patient-1',
        doctorId,
        status,
        doctor: {
          id: doctorId,
          fullName: doctorName,
          professionalTitle: 'MD',
          specialization: 'General Practice',
          profilePictureUrl: null,
        },
        slot: { startTime: slotTime },
      };
    }

    it('aggregates totalVisits per doctor', async () => {
      mockPrismaService.appointment.findMany.mockResolvedValue([
        makeAppt('doc-1', pastTime1, AppointmentStatus.COMPLETED, 'Dr. A'),
        makeAppt('doc-1', pastTime2, AppointmentStatus.COMPLETED, 'Dr. A'),
        makeAppt('doc-2', pastTime1, AppointmentStatus.COMPLETED, 'Dr. B'),
      ]);

      const result = await service.findDoctorsForPatient('user-1');

      expect(result).toHaveLength(2);
      const docA = result.find((r) => r.doctor.id === 'doc-1')!;
      expect(docA.totalVisits).toBe(2);
      expect(docA.upcomingCount).toBe(0);
    });

    it('counts upcoming (PENDING or CONFIRMED future) appointments', async () => {
      mockPrismaService.appointment.findMany.mockResolvedValue([
        makeAppt('doc-1', futureTime, AppointmentStatus.CONFIRMED, 'Dr. A'),
        makeAppt('doc-1', pastTime1, AppointmentStatus.COMPLETED, 'Dr. A'),
      ]);

      const result = await service.findDoctorsForPatient('user-1');

      expect(result[0].upcomingCount).toBe(1);
      expect(result[0].totalVisits).toBe(2);
    });

    it('sets lastVisit to most recent past slot', async () => {
      mockPrismaService.appointment.findMany.mockResolvedValue([
        makeAppt('doc-1', pastTime2, AppointmentStatus.COMPLETED, 'Dr. A'),
        makeAppt('doc-1', pastTime1, AppointmentStatus.COMPLETED, 'Dr. A'),
      ]);

      const result = await service.findDoctorsForPatient('user-1');

      expect(result[0].lastVisit).toBe(pastTime1.toISOString());
    });

    it('sorts results by lastVisit descending', async () => {
      mockPrismaService.appointment.findMany.mockResolvedValue([
        makeAppt('doc-2', pastTime2, AppointmentStatus.COMPLETED, 'Dr. B'),
        makeAppt('doc-1', pastTime1, AppointmentStatus.COMPLETED, 'Dr. A'),
      ]);

      const result = await service.findDoctorsForPatient('user-1');

      expect(result[0].doctor.id).toBe('doc-1');
      expect(result[1].doctor.id).toBe('doc-2');
    });

    it('throws NotFoundException when patient profile not found', async () => {
      mockPrismaService.patientProfile.findUnique.mockResolvedValueOnce(null);

      await expect(
        service.findDoctorsForPatient('no-such-user'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
