import { Test, TestingModule } from '@nestjs/testing';
import { PatientsService } from './patients.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { PatientProfile } from '@prisma/client';

describe('PatientsService', () => {
  let service: PatientsService;

  const mockPrismaService = {
    patientProfile: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PatientsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<PatientsService>(PatientsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a patient profile', async () => {
      const userId = 'user123';
      const dto = {
        fullName: 'John Doe',
        birthdate: '1990-01-01',
        weight: 70,
        height: 175,
        profilePictureUrl: 'http://localhost:3001/uploads/profile-picture.png',
        contactDetails: 'john@example.com',
        medicalHistory: 'Conditions: None\nAllergies: None',
      };
      const expectedResult = {
        id: 'profile123',
        userId,
        ...dto,
        birthdate: new Date(dto.birthdate),
      };
      mockPrismaService.patientProfile.findUnique.mockResolvedValue(null);
      mockPrismaService.patientProfile.create.mockResolvedValue(expectedResult);

      const result = await service.create(userId, dto);

      expect(mockPrismaService.patientProfile.create).toHaveBeenCalledWith({
        data: {
          ...dto,
          birthdate: new Date(dto.birthdate),
          user: { connect: { id: userId } },
        },
      });
      expect(result).toEqual(expectedResult);
    });

    it('should throw ConflictException if profile already exists', async () => {
      const userId = 'user123';
      const dto = {
        fullName: 'John Doe',
        birthdate: '1990-01-01',
        weight: 70,
        height: 175,
        profilePictureUrl: 'http://localhost:3001/uploads/profile-picture.png',
        contactDetails: 'john@example.com',
        medicalHistory: 'Conditions: None\nAllergies: None',
      };
      mockPrismaService.patientProfile.findUnique.mockResolvedValue({
        id: 'existing-profile',
      });

      await expect(service.create(userId, dto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('findByUserId', () => {
    it('should return a profile if found', async () => {
      const userId = 'user123';
      const expectedResult = { id: 'profile123', userId };
      mockPrismaService.patientProfile.findUnique.mockResolvedValue(
        expectedResult,
      );

      const result = await service.findByUserId(userId);

      expect(mockPrismaService.patientProfile.findUnique).toHaveBeenCalledWith({
        where: { userId },
      });
      expect(result).toEqual(expectedResult);
    });

    it('should throw NotFoundException if not found', async () => {
      const userId = 'user123';
      mockPrismaService.patientProfile.findUnique.mockResolvedValue(null);

      await expect(service.findByUserId(userId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update a profile', async () => {
      const userId = 'user123';
      const profile = { id: 'profile123', userId } as PatientProfile;
      const dto = { fullName: 'Jane Doe' };
      const expectedResult = { ...profile, ...dto };

      jest.spyOn(service, 'findByUserId').mockResolvedValue(profile);
      mockPrismaService.patientProfile.update.mockResolvedValue(expectedResult);

      const result = await service.update(userId, dto);

      expect(mockPrismaService.patientProfile.update).toHaveBeenCalledWith({
        where: { id: profile.id },
        data: {
          ...dto,
          birthdate: undefined,
        },
      });
      expect(result).toEqual(expectedResult);
    });
  });
});
