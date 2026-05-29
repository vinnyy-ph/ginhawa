import { Test, TestingModule } from '@nestjs/testing';
import { MedicalRecordsService } from './medical-records.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotFoundException, ForbiddenException, ConflictException, BadRequestException } from '@nestjs/common';

describe('MedicalRecordsService', () => {
  let service: MedicalRecordsService;

  const mockPrismaService = {
    doctorProfile: { findUnique: jest.fn() },
    patientProfile: { findUnique: jest.fn() },
    appointment: { findUnique: jest.fn() },
    medicalRecord: {
      findUnique: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
    },
  };

  const mockNotificationsService = {
    createNotification: jest.fn().mockResolvedValue(null),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MedicalRecordsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: NotificationsService, useValue: mockNotificationsService },
      ],
    }).compile();

    service = module.get<MedicalRecordsService>(MedicalRecordsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('throws NotFoundException when doctor profile not found', async () => {
      mockPrismaService.doctorProfile.findUnique.mockResolvedValue(null);

      await expect(
        service.create('user-doctor-1', { appointmentId: 'appt-1' } as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when appointment not found', async () => {
      mockPrismaService.doctorProfile.findUnique.mockResolvedValue({ id: 'doctor-1', fullName: 'Dr. S' });
      mockPrismaService.appointment.findUnique.mockResolvedValue(null);

      await expect(
        service.create('user-doctor-1', { appointmentId: 'appt-1' } as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when appointment belongs to different doctor', async () => {
      mockPrismaService.doctorProfile.findUnique.mockResolvedValue({ id: 'doctor-1', fullName: 'Dr. S' });
      mockPrismaService.appointment.findUnique.mockResolvedValue({ id: 'appt-1', doctorId: 'doctor-2', patientId: 'patient-1' });

      await expect(
        service.create('user-doctor-1', { appointmentId: 'appt-1' } as any),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws ConflictException when record already exists', async () => {
      mockPrismaService.doctorProfile.findUnique.mockResolvedValue({ id: 'doctor-1', fullName: 'Dr. S' });
      mockPrismaService.appointment.findUnique.mockResolvedValue({ id: 'appt-1', doctorId: 'doctor-1', patientId: 'patient-1' });
      mockPrismaService.medicalRecord.findUnique.mockResolvedValue({ id: 'existing-rec' });

      await expect(
        service.create('user-doctor-1', { appointmentId: 'appt-1' } as any),
      ).rejects.toThrow(ConflictException);
    });

    it('creates structured prescription rows when provided', async () => {
      mockPrismaService.doctorProfile.findUnique.mockResolvedValue({ id: 'doctor-1', fullName: 'Dr. S' });
      mockPrismaService.appointment.findUnique.mockResolvedValue({ id: 'appt-1', doctorId: 'doctor-1', patientId: 'patient-1' });
      mockPrismaService.medicalRecord.findUnique.mockResolvedValue(null);
      mockPrismaService.medicalRecord.create.mockResolvedValue({ id: 'rec-1', patient: { userId: 'u1' } });

      await service.create('user-doctor-1', {
        appointmentId: 'appt-1',
        prescriptions: [{ drugName: 'Amoxicillin', dosage: '500mg', frequency: 'TID' }],
      } as any);

      expect(mockPrismaService.medicalRecord.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            prescriptions: { create: [{ drugName: 'Amoxicillin', dosage: '500mg', frequency: 'TID' }] },
          }),
        }),
      );
    });

    it('rejects a follow-up appointment belonging to another patient', async () => {
      mockPrismaService.doctorProfile.findUnique.mockResolvedValue({ id: 'doctor-1', fullName: 'Dr. S' });
      mockPrismaService.appointment.findUnique
        .mockResolvedValueOnce({ id: 'appt-1', doctorId: 'doctor-1', patientId: 'patient-1' })
        .mockResolvedValueOnce({ id: 'followup-1', patientId: 'patient-2' });
      mockPrismaService.medicalRecord.findUnique.mockResolvedValue(null);

      await expect(
        service.create('user-doctor-1', {
          appointmentId: 'appt-1',
          followUpAppointmentId: 'followup-1',
        } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects a follow-up appointment that does not exist', async () => {
      mockPrismaService.doctorProfile.findUnique.mockResolvedValue({ id: 'doctor-1', fullName: 'Dr. S' });
      mockPrismaService.appointment.findUnique
        .mockResolvedValueOnce({ id: 'appt-1', doctorId: 'doctor-1', patientId: 'patient-1' })
        .mockResolvedValueOnce(null);
      mockPrismaService.medicalRecord.findUnique.mockResolvedValue(null);

      await expect(
        service.create('user-doctor-1', {
          appointmentId: 'appt-1',
          followUpAppointmentId: 'followup-missing',
        } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('links a valid follow-up appointment', async () => {
      mockPrismaService.doctorProfile.findUnique.mockResolvedValue({ id: 'doctor-1', fullName: 'Dr. S' });
      mockPrismaService.appointment.findUnique
        .mockResolvedValueOnce({ id: 'appt-1', doctorId: 'doctor-1', patientId: 'patient-1' })
        .mockResolvedValueOnce({ id: 'followup-1', patientId: 'patient-1' });
      mockPrismaService.medicalRecord.findUnique.mockResolvedValue(null);
      mockPrismaService.medicalRecord.create.mockResolvedValue({ id: 'rec-1', patient: { userId: 'u1' } });

      await service.create('user-doctor-1', {
        appointmentId: 'appt-1',
        followUpAppointmentId: 'followup-1',
      } as any);

      expect(mockPrismaService.medicalRecord.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ followUpAppointmentId: 'followup-1' }),
        }),
      );
    });
  });
});
