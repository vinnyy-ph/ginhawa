import { Test, TestingModule } from '@nestjs/testing';
import { DoctorsService } from './doctors.service';
import { PrismaService } from '../infrastructure/prisma/prisma.service';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { CreateDoctorDto } from './dto/create-doctor.dto';

describe('DoctorsService', () => {
  let service: DoctorsService;

  const mockUpsertTx = {
    doctorProfile: { upsert: jest.fn() },
    specialization: { upsert: jest.fn() },
    doctorSpecialization: {
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      upsert: jest.fn().mockResolvedValue({}),
    },
  };

  const mockPrismaService = {
    doctorProfile: {
      findUnique: jest.fn(),
      create: jest.fn(),
      upsert: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
    review: { groupBy: jest.fn().mockResolvedValue([]) },
    $transaction: jest.fn(),
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
    beforeEach(() => {
      const profile = {
        id: 'profile-1',
        userId: 'user-1',
        fullName: 'Dr. John',
      };
      mockUpsertTx.doctorProfile.upsert.mockResolvedValue(profile);
      mockUpsertTx.specialization.upsert.mockResolvedValue({
        id: 'spec-1',
        name: 'General',
      });
      mockPrismaService.$transaction.mockImplementation(async (cb) =>
        cb(mockUpsertTx),
      );
    });

    it('should create or return existing profile and set profileComplete', async () => {
      const userId = 'user-1';
      const dto = {
        fullName: 'Dr. John',
        professionalTitle: 'MD',
        specialization: 'General',
        bio: 'Hello',
      };

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
        prcLicenseNo: undefined,
        prcLicenseExpiry: undefined,
        ptrNo: undefined,
        region: undefined,
        city: undefined,
      };
      expect(mockUpsertTx.doctorProfile.upsert).toHaveBeenCalledWith({
        where: { userId },
        update: profileData,
        create: { userId, ...profileData },
      });
    });

    it('persists PRC license fields and coerces expiry to a Date', async () => {
      const userId = 'user-1';
      const dto = {
        fullName: 'Dr. John',
        professionalTitle: 'MD',
        specialization: 'General',
        prcLicenseNo: '1234567',
        prcLicenseExpiry: '2027-05-30',
        ptrNo: '12345678',
        region: 'NCR',
        city: 'Makati',
      };

      await service.upsertProfile(userId, dto);

      expect(mockUpsertTx.doctorProfile.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            prcLicenseNo: '1234567',
            prcLicenseExpiry: new Date('2027-05-30'),
            ptrNo: '12345678',
            region: 'NCR',
            city: 'Makati',
          }),
        }),
      );
    });
  });

  describe('upsertProfile junction', () => {
    const mockTx = {
      doctorProfile: {
        upsert: jest.fn().mockResolvedValue({ id: 'doctor-1' }),
      },
      specialization: {
        upsert: jest
          .fn()
          .mockResolvedValue({ id: 'spec-1', name: 'Cardiology' }),
      },
      doctorSpecialization: {
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        upsert: jest.fn().mockResolvedValue({}),
      },
    };

    beforeEach(() => {
      mockPrismaService.$transaction.mockImplementation(async (cb) =>
        cb(mockTx),
      );
    });

    it('creates a primary DoctorSpecialization row from the specialization string', async () => {
      await service.upsertProfile('user-1', {
        fullName: 'Dr. A',
        professionalTitle: 'MD',
        specialization: 'Cardiology',
      });

      expect(mockTx.specialization.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ where: { name: 'Cardiology' } }),
      );
      expect(mockTx.doctorSpecialization.deleteMany).toHaveBeenCalledWith({
        where: { doctorId: 'doctor-1', isPrimary: true },
      });
      expect(mockTx.doctorSpecialization.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: {
            doctorId: 'doctor-1',
            specializationId: 'spec-1',
            isPrimary: true,
          },
        }),
      );
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
    it('updates the profile and syncs the primary specialization', async () => {
      const existing = { id: '1', userId: 'user-1' };
      mockPrismaService.doctorProfile.findUnique.mockResolvedValue(existing);

      const mockTx = {
        doctorProfile: { update: jest.fn() },
        specialization: {
          upsert: jest
            .fn()
            .mockResolvedValue({ id: 'spec-1', name: 'Neurology' }),
        },
        doctorSpecialization: {
          deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
          upsert: jest.fn().mockResolvedValue({}),
        },
      };
      const updateDto = { specialization: 'Neurology' };
      const expected = { ...existing, ...updateDto };
      mockTx.doctorProfile.update.mockResolvedValue(expected);
      mockPrismaService.$transaction.mockImplementation(async (cb) =>
        cb(mockTx),
      );

      const result = await service.update('user-1', updateDto);

      expect(result).toEqual(expected);
      expect(mockTx.doctorProfile.update).toHaveBeenCalledWith({
        where: { id: existing.id },
        data: updateDto,
      });
      expect(mockTx.specialization.upsert).toHaveBeenCalled();
      expect(mockTx.doctorSpecialization.upsert).toHaveBeenCalled();
      expect(mockTx.doctorSpecialization.deleteMany).toHaveBeenCalled();
    });

    it('skips specialization sync when no specialization is provided', async () => {
      const existing = { id: '1', userId: 'user-1' };
      mockPrismaService.doctorProfile.findUnique.mockResolvedValue(existing);

      const mockTx = {
        doctorProfile: {
          update: jest.fn().mockResolvedValue({ ...existing, bio: 'x' }),
        },
        specialization: { upsert: jest.fn() },
        doctorSpecialization: { deleteMany: jest.fn(), upsert: jest.fn() },
      };
      mockPrismaService.$transaction.mockImplementation(async (cb) =>
        cb(mockTx),
      );

      await service.update('user-1', { bio: 'x' });

      expect(mockTx.specialization.upsert).not.toHaveBeenCalled();
    });
  });

  describe('searchAll', () => {
    it('should return a list of doctor profiles', async () => {
      const expected = [{ id: '1', fullName: 'Dr. Smith' }];
      mockPrismaService.doctorProfile.findMany.mockResolvedValue(expected);

      const result = await service.searchAll();
      expect(result).toEqual([
        { id: '1', fullName: 'Dr. Smith', avgRating: 0, reviewCount: 0 },
      ]);
    });

    it('should use search and specialization params', async () => {
      mockPrismaService.doctorProfile.findMany.mockResolvedValue([]);
      await service.searchAll('Smith', 'Cardio');

      expect(mockPrismaService.doctorProfile.findMany).toHaveBeenCalledWith({
        where: {
          isActive: true,
          isVerified: true,
          fullName: { contains: 'Smith', mode: 'insensitive' },
          specializations: {
            some: {
              specialization: {
                name: { contains: 'Cardio', mode: 'insensitive' },
              },
            },
          },
        },
        include: {
          availabilitySlots: true,
        },
      });
    });

    it('should filter by specialization via junction table when specialization query given', async () => {
      mockPrismaService.doctorProfile.findMany.mockResolvedValue([]);

      await service.searchAll(undefined, 'cardiology');

      expect(mockPrismaService.doctorProfile.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            specializations: {
              some: {
                specialization: {
                  name: { contains: 'cardiology', mode: 'insensitive' },
                },
              },
            },
          }),
        }),
      );
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

  describe('searchAll ratings', () => {
    it('attaches avgRating and reviewCount, and sorts by rating', async () => {
      mockPrismaService.doctorProfile.findMany.mockResolvedValue([
        { id: 'doctor-1', fullName: 'A' },
        { id: 'doctor-2', fullName: 'B' },
      ]);
      mockPrismaService.review.groupBy.mockResolvedValue([
        { doctorId: 'doctor-1', _avg: { rating: 3 }, _count: { rating: 2 } },
        { doctorId: 'doctor-2', _avg: { rating: 5 }, _count: { rating: 4 } },
      ]);

      const result = await service.searchAll(undefined, undefined, 'rating');

      expect(mockPrismaService.review.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ isVisible: true }),
        }),
      );
      expect(result[0].id).toBe('doctor-2');
      expect(result[0].avgRating).toBe(5);
      expect(result[0].reviewCount).toBe(4);
      expect(result[1].avgRating).toBe(3);
    });

    it('defaults missing ratings to zero', async () => {
      mockPrismaService.doctorProfile.findMany.mockResolvedValue([
        { id: 'doctor-3', fullName: 'C' },
      ]);
      mockPrismaService.review.groupBy.mockResolvedValue([]);

      const result = await service.searchAll();

      expect(result[0].avgRating).toBe(0);
      expect(result[0].reviewCount).toBe(0);
    });
  });

  describe('findById', () => {
    const profileId = '550e8400-e29b-41d4-a716-446655440000';

    it('should return a profile by id', async () => {
      const expected = { id: profileId, userId: 'user-1' };
      mockPrismaService.doctorProfile.findUnique.mockResolvedValue(expected);

      const result = await service.findById(profileId);
      expect(result).toEqual({ ...expected, avgRating: 0, reviewCount: 0 });
      expect(mockPrismaService.doctorProfile.findUnique).toHaveBeenCalledWith({
        where: { id: profileId },
        include: {
          availabilitySlots: true,
          specializations: { include: { specialization: true } },
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
