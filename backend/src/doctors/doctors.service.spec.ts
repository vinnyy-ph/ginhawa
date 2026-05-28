import { Test, TestingModule } from '@nestjs/testing';
import { DoctorsService } from './doctors.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { CreateDoctorDto } from './dto/create-doctor.dto';

describe('DoctorsService', () => {
  let service: DoctorsService;

  const mockPrismaService = {
    doctorProfile: {
      findUnique: jest.fn(),
      create: jest.fn(),
      upsert: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DoctorsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<DoctorsService>(DoctorsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a doctor profile', async () => {
      mockPrismaService.doctorProfile.findUnique.mockResolvedValue(null);
      const dto: CreateDoctorDto = {
        fullName: 'Dr. Smith',
        professionalTitle: 'MD',
        specialization: 'Cardiology',
      };
      const expected = { id: '1', userId: 'user-1', ...dto };
      mockPrismaService.doctorProfile.create.mockResolvedValue(expected);

      const result = await service.create('user-1', dto);
      expect(result).toEqual(expected);
      expect(mockPrismaService.doctorProfile.create).toHaveBeenCalledWith({
        data: { ...dto, userId: 'user-1' },
      });
    });

    it('should throw ConflictException if profile already exists', async () => {
      mockPrismaService.doctorProfile.findUnique.mockResolvedValue({
        id: '1',
      });
      const dto: CreateDoctorDto = {
        fullName: 'Dr. Smith',
        professionalTitle: 'MD',
        specialization: 'Cardiology',
      };

      await expect(service.create('user-1', dto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('upsertProfile', () => {
    it('should create or return existing profile and set profileComplete', async () => {
      const userId = 'user-1';
      const dto = {
        fullName: 'Dr. John',
        professionalTitle: 'MD',
        specialization: 'General',
        bio: 'Hello',
      };

      mockPrismaService.doctorProfile.upsert.mockResolvedValue({ ...dto, userId, id: 'profile-1' });

      const result = await service.upsertProfile(userId, dto);

      expect(result.profileComplete).toBe(true);
      expect(result.profile.fullName).toBe('Dr. John');
      const profileData = {
        fullName: dto.fullName,
        professionalTitle: dto.professionalTitle,
        specialization: dto.specialization,
        bio: dto.bio,
        yearsOfExperience: undefined,
        consultationFee: undefined,
        languagesSpoken: undefined,
        consultationFocusAreas: undefined,
        availabilitySummary: undefined,
        profilePictureUrl: undefined,
      };
      expect(mockPrismaService.doctorProfile.upsert).toHaveBeenCalledWith({
        where: { userId },
        update: profileData,
        create: { userId, ...profileData },
      });
    });
  });

  describe('findByUserId', () => {
    it('should return a profile by userId', async () => {
      const expected = { id: '1', userId: 'user-1' };
      mockPrismaService.doctorProfile.findUnique.mockResolvedValue(expected);

      const result = await service.findByUserId('user-1');
      expect(result).toEqual(expected);
    });

    it('should throw NotFoundException if profile not found', async () => {
      mockPrismaService.doctorProfile.findUnique.mockResolvedValue(null);
      await expect(service.findByUserId('user-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update a doctor profile', async () => {
      const existing = { id: '1', userId: 'user-1' };
      mockPrismaService.doctorProfile.findUnique.mockResolvedValue(existing);

      const updateDto = { specialization: 'Neurology' };
      const expected = { ...existing, ...updateDto };
      mockPrismaService.doctorProfile.update.mockResolvedValue(expected);

      const result = await service.update('user-1', updateDto);
      expect(result).toEqual(expected);
      expect(mockPrismaService.doctorProfile.update).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        data: updateDto,
      });
    });
  });

  describe('searchAll', () => {
    it('should return a list of doctor profiles', async () => {
      const expected = [{ id: '1', fullName: 'Dr. Smith' }];
      mockPrismaService.doctorProfile.findMany.mockResolvedValue(expected);

      const result = await service.searchAll();
      expect(result).toEqual(expected);
    });

    it('should use search and specialization params', async () => {
      mockPrismaService.doctorProfile.findMany.mockResolvedValue([]);
      await service.searchAll('Smith', 'Cardio');

      expect(mockPrismaService.doctorProfile.findMany).toHaveBeenCalledWith({
        where: {
          isActive: true,
          isVerified: true,
          fullName: { contains: 'Smith', mode: 'insensitive' },
          specialization: { contains: 'Cardio', mode: 'insensitive' },
        },
        include: {
          availabilitySlots: true,
        },
      });
    });

    it('should always filter by isActive: true and isVerified: true', async () => {
      mockPrismaService.doctorProfile.findMany.mockResolvedValue([]);

      await service.searchAll();

      expect(mockPrismaService.doctorProfile.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isActive: true,
            isVerified: true,
          }),
        }),
      );
    });
  });

  describe('findById', () => {
    const profileId = '550e8400-e29b-41d4-a716-446655440000';

    it('should return a profile by id', async () => {
      const expected = { id: profileId, userId: 'user-1' };
      mockPrismaService.doctorProfile.findUnique.mockResolvedValue(expected);

      const result = await service.findById(profileId);
      expect(result).toEqual(expected);
      expect(mockPrismaService.doctorProfile.findUnique).toHaveBeenCalledWith({
        where: { id: profileId },
        include: {
          availabilitySlots: true,
        },
      });
    });

    it('should throw NotFoundException if profile not found', async () => {
      mockPrismaService.doctorProfile.findUnique.mockResolvedValue(null);
      await expect(service.findById(profileId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException for non-UUID ids', async () => {
      await expect(service.findById('profile')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findById('1')).rejects.toThrow(NotFoundException);
    });
  });
});
