import { Test, TestingModule } from '@nestjs/testing';
import { SlotsService } from './slots.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

describe('SlotsService.createBulk', () => {
  let service: SlotsService;

  const mockPrisma = {
    doctorProfile: { findUnique: jest.fn() },
    availabilitySlot: { findMany: jest.fn(), createMany: jest.fn() },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SlotsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<SlotsService>(SlotsService);
  });

  const candidates = [
    { startTime: '2026-06-01T01:00:00.000Z', endTime: '2026-06-01T02:00:00.000Z' },
    { startTime: '2026-06-01T02:00:00.000Z', endTime: '2026-06-01T03:00:00.000Z' },
  ];

  it('throws when the doctor profile is missing', async () => {
    mockPrisma.doctorProfile.findUnique.mockResolvedValue(null);
    await expect(service.createBulk('user-1', candidates)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('inserts all candidates when none overlap', async () => {
    mockPrisma.doctorProfile.findUnique.mockResolvedValue({ id: 'doctor-1' });
    mockPrisma.availabilitySlot.findMany.mockResolvedValue([]);
    mockPrisma.availabilitySlot.createMany.mockResolvedValue({ count: 2 });

    const result = await service.createBulk('user-1', candidates);

    expect(result).toEqual({ created: 2, skipped: 0 });
    expect(mockPrisma.availabilitySlot.createMany).toHaveBeenCalledWith({
      data: [
        { doctorId: 'doctor-1', startTime: new Date(candidates[0].startTime), endTime: new Date(candidates[0].endTime) },
        { doctorId: 'doctor-1', startTime: new Date(candidates[1].startTime), endTime: new Date(candidates[1].endTime) },
      ],
    });
  });

  it('skips candidates overlapping an existing slot', async () => {
    mockPrisma.doctorProfile.findUnique.mockResolvedValue({ id: 'doctor-1' });
    mockPrisma.availabilitySlot.findMany.mockResolvedValue([
      { startTime: new Date('2026-06-01T01:30:00.000Z'), endTime: new Date('2026-06-01T02:30:00.000Z') },
    ]);
    mockPrisma.availabilitySlot.createMany.mockResolvedValue({ count: 0 });

    const result = await service.createBulk('user-1', candidates);

    expect(result).toEqual({ created: 0, skipped: 2 });
    expect(mockPrisma.availabilitySlot.createMany).not.toHaveBeenCalled();
  });

  it('skips a candidate overlapping an earlier accepted candidate in the same batch', async () => {
    mockPrisma.doctorProfile.findUnique.mockResolvedValue({ id: 'doctor-1' });
    mockPrisma.availabilitySlot.findMany.mockResolvedValue([]);
    mockPrisma.availabilitySlot.createMany.mockResolvedValue({ count: 1 });

    const dup = [
      { startTime: '2026-06-01T01:00:00.000Z', endTime: '2026-06-01T02:00:00.000Z' },
      { startTime: '2026-06-01T01:30:00.000Z', endTime: '2026-06-01T02:30:00.000Z' },
    ];
    const result = await service.createBulk('user-1', dup);

    expect(result).toEqual({ created: 1, skipped: 1 });
  });

  it('skips candidates with startTime >= endTime', async () => {
    mockPrisma.doctorProfile.findUnique.mockResolvedValue({ id: 'doctor-1' });
    mockPrisma.availabilitySlot.findMany.mockResolvedValue([]);
    mockPrisma.availabilitySlot.createMany.mockResolvedValue({ count: 0 });

    const bad = [
      { startTime: '2026-06-01T02:00:00.000Z', endTime: '2026-06-01T01:00:00.000Z' },
    ];
    const result = await service.createBulk('user-1', bad);

    expect(result).toEqual({ created: 0, skipped: 1 });
    expect(mockPrisma.availabilitySlot.createMany).not.toHaveBeenCalled();
  });
});
