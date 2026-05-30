import { Test, TestingModule } from '@nestjs/testing';
import { SpecializationsService } from './specializations.service';
import { PrismaService } from '../infrastructure/prisma/prisma.service';

describe('SpecializationsService', () => {
  let service: SpecializationsService;

  const mockPrismaService = {
    specialization: { findMany: jest.fn() },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SpecializationsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();
    service = module.get<SpecializationsService>(SpecializationsService);
    jest.clearAllMocks();
  });

  it('returns specializations ordered by name', async () => {
    const rows = [
      { id: '1', name: 'Cardiology', description: null, createdAt: new Date() },
    ];
    mockPrismaService.specialization.findMany.mockResolvedValue(rows);

    const result = await service.findAll();

    expect(result).toBe(rows);
    expect(mockPrismaService.specialization.findMany).toHaveBeenCalledWith({
      orderBy: { name: 'asc' },
    });
  });
});
