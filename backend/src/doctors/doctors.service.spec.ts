import { Test, TestingModule } from '@nestjs/testing';
import { DoctorsService } from './doctors.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConflictException, NotFoundException } from '@nestjs/common';

describe('DoctorsService', () => {
  let service: DoctorsService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DoctorsService,
        {
          provide: PrismaService,
          useValue: {
            doctorProfile: {
              findUnique: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              findMany: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<DoctorsService>(DoctorsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a doctor profile', async () => {
      (prisma.doctorProfile.findUnique as jest.Mock).mockResolvedValue(null);
      const dto = { fullName: 'Dr. Smith', specialization: 'Cardiology' };
      const expected = { id: '1', userId: 'user-1', ...dto };
      (prisma.doctorProfile.create as jest.Mock).mockResolvedValue(expected);

      const result = await service.create('user-1', dto as any);
      expect(result).toEqual(expected);
      expect(prisma.doctorProfile.create).toHaveBeenCalledWith({
        data: { ...dto, userId: 'user-1' },
      });
    });

    it('should throw ConflictException if profile already exists', async () => {
      (prisma.doctorProfile.findUnique as jest.Mock).mockResolvedValue({ id: '1' });
      const dto = { fullName: 'Dr. Smith', specialization: 'Cardiology' };

      await expect(service.create('user-1', dto as any)).rejects.toThrow(ConflictException);
    });
  });

  describe('findByUserId', () => {
    it('should return a profile by userId', async () => {
      const expected = { id: '1', userId: 'user-1' };
      (prisma.doctorProfile.findUnique as jest.Mock).mockResolvedValue(expected);

      const result = await service.findByUserId('user-1');
      expect(result).toEqual(expected);
    });

    it('should throw NotFoundException if profile not found', async () => {
      (prisma.doctorProfile.findUnique as jest.Mock).mockResolvedValue(null);
      await expect(service.findByUserId('user-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update a doctor profile', async () => {
      const existing = { id: '1', userId: 'user-1' };
      (prisma.doctorProfile.findUnique as jest.Mock).mockResolvedValue(existing);
      
      const updateDto = { specialization: 'Neurology' };
      const expected = { ...existing, ...updateDto };
      (prisma.doctorProfile.update as jest.Mock).mockResolvedValue(expected);

      const result = await service.update('user-1', updateDto);
      expect(result).toEqual(expected);
      expect(prisma.doctorProfile.update).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        data: updateDto,
      });
    });
  });

  describe('searchAll', () => {
    it('should return a list of doctor profiles', async () => {
      const expected = [{ id: '1', fullName: 'Dr. Smith' }];
      (prisma.doctorProfile.findMany as jest.Mock).mockResolvedValue(expected);

      const result = await service.searchAll();
      expect(result).toEqual(expected);
    });

    it('should use search and specialization params', async () => {
      (prisma.doctorProfile.findMany as jest.Mock).mockResolvedValue([]);
      await service.searchAll('Smith', 'Cardio');

      expect(prisma.doctorProfile.findMany).toHaveBeenCalledWith({
        where: {
          fullName: { contains: 'Smith', mode: 'insensitive' },
          specialization: { contains: 'Cardio', mode: 'insensitive' },
        },
      });
    });
  });

  describe('findById', () => {
    it('should return a profile by id', async () => {
      const expected = { id: '1', userId: 'user-1' };
      (prisma.doctorProfile.findUnique as jest.Mock).mockResolvedValue(expected);

      const result = await service.findById('1');
      expect(result).toEqual(expected);
      expect(prisma.doctorProfile.findUnique).toHaveBeenCalledWith({ where: { id: '1' } });
    });

    it('should throw NotFoundException if profile not found', async () => {
      (prisma.doctorProfile.findUnique as jest.Mock).mockResolvedValue(null);
      await expect(service.findById('1')).rejects.toThrow(NotFoundException);
    });
  });
});
