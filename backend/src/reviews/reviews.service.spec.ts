import { Test, TestingModule } from '@nestjs/testing';
import { ReviewsService } from './reviews.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { AppointmentStatus } from '@prisma/client';

describe('ReviewsService', () => {
  let service: ReviewsService;

  const mockPrismaService = {
    patientProfile: { findUnique: jest.fn() },
    appointment: { findUnique: jest.fn() },
    review: { findUnique: jest.fn(), create: jest.fn() },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReviewsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();
    service = module.get<ReviewsService>(ReviewsService);
    jest.clearAllMocks();
  });

  const dto = { appointmentId: 'appt-1', rating: 5, comment: 'great' };

  it('creates a review for a completed, owned appointment', async () => {
    mockPrismaService.patientProfile.findUnique.mockResolvedValue({ id: 'patient-1' });
    mockPrismaService.appointment.findUnique.mockResolvedValue({
      id: 'appt-1', patientId: 'patient-1', doctorId: 'doctor-1', status: AppointmentStatus.COMPLETED,
    });
    mockPrismaService.review.findUnique.mockResolvedValue(null);
    mockPrismaService.review.create.mockResolvedValue({ id: 'rev-1' });

    const result = await service.create('user-1', dto);

    expect(mockPrismaService.review.create).toHaveBeenCalledWith({
      data: { appointmentId: 'appt-1', patientId: 'patient-1', doctorId: 'doctor-1', rating: 5, comment: 'great' },
    });
    expect(result.id).toBe('rev-1');
  });

  it('rejects a review on a non-completed appointment', async () => {
    mockPrismaService.patientProfile.findUnique.mockResolvedValue({ id: 'patient-1' });
    mockPrismaService.appointment.findUnique.mockResolvedValue({
      id: 'appt-1', patientId: 'patient-1', doctorId: 'doctor-1', status: AppointmentStatus.CONFIRMED,
    });
    await expect(service.create('user-1', dto)).rejects.toThrow(BadRequestException);
  });

  it('rejects a review on an appointment the patient does not own', async () => {
    mockPrismaService.patientProfile.findUnique.mockResolvedValue({ id: 'patient-1' });
    mockPrismaService.appointment.findUnique.mockResolvedValue({
      id: 'appt-1', patientId: 'patient-2', doctorId: 'doctor-1', status: AppointmentStatus.COMPLETED,
    });
    await expect(service.create('user-1', dto)).rejects.toThrow(ForbiddenException);
  });

  it('rejects a duplicate review', async () => {
    mockPrismaService.patientProfile.findUnique.mockResolvedValue({ id: 'patient-1' });
    mockPrismaService.appointment.findUnique.mockResolvedValue({
      id: 'appt-1', patientId: 'patient-1', doctorId: 'doctor-1', status: AppointmentStatus.COMPLETED,
    });
    mockPrismaService.review.findUnique.mockResolvedValue({ id: 'existing' });
    await expect(service.create('user-1', dto)).rejects.toThrow(ConflictException);
  });
});
