import { Test, TestingModule } from '@nestjs/testing';
import { DoctorsService } from './doctors.service';
import { PrismaService } from '../prisma/prisma.service';

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
});
