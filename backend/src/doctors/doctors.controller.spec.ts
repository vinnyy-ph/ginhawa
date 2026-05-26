import { Test, TestingModule } from '@nestjs/testing';
import { DoctorsController } from './doctors.controller';
import { DoctorsService } from './doctors.service';
import { CreateDoctorDto } from './dto/create-doctor.dto';
import { UpdateDoctorDto } from './dto/update-doctor.dto';
import * as publicDoctorDto from './dto/public-doctor.dto';

describe('DoctorsController', () => {
  let controller: DoctorsController;
  let service: DoctorsService;

  const mockDoctorsService = {
    create: jest.fn(),
    findByUserId: jest.fn(),
    update: jest.fn(),
    searchAll: jest.fn(),
    findById: jest.fn(),
  };

  beforeEach(async () => {
    jest.spyOn(publicDoctorDto, 'toPublicDoctorProfile').mockImplementation((p) => ({ ...p, isPublic: true }) as any);

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DoctorsController],
      providers: [
        {
          provide: DoctorsService,
          useValue: mockDoctorsService,
        },
      ],
    }).compile();

    controller = module.get<DoctorsController>(DoctorsController);
    service = module.get<DoctorsService>(DoctorsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a doctor profile', async () => {
      const createDto: CreateDoctorDto = {
        fullName: 'Dr. Test User',
        professionalTitle: 'MD',
        specialization: 'Cardiology',
        bio: 'Test bio',
        consultationFee: 100,
      };
      
      const req = { user: { id: 'user-id' } };
      mockDoctorsService.create.mockResolvedValue('mockProfile');

      const result = await controller.create(req, createDto);

      expect(service.create).toHaveBeenCalledWith('user-id', createDto);
      expect(result).toBe('mockProfile');
    });
  });

  describe('getProfile', () => {
    it('should return a doctor profile by user ID', async () => {
      const req = { user: { id: 'user-id' } };
      mockDoctorsService.findByUserId.mockResolvedValue('mockProfile');

      const result = await controller.getProfile(req);

      expect(service.findByUserId).toHaveBeenCalledWith('user-id');
      expect(result).toBe('mockProfile');
    });
  });

  describe('update', () => {
    it('should update a doctor profile', async () => {
      const updateDto: UpdateDoctorDto = {
        bio: 'Updated bio'
      };
      const req = { user: { id: 'user-id' } };
      mockDoctorsService.update.mockResolvedValue('mockUpdatedProfile');

      const result = await controller.update(req, updateDto);

      expect(service.update).toHaveBeenCalledWith('user-id', updateDto);
      expect(result).toBe('mockUpdatedProfile');
    });
  });

  describe('findAll', () => {
    it('should return all doctor profiles formatted publicly', async () => {
      const mockProfiles = [
        { id: '1' },
        { id: '2' }
      ];
      mockDoctorsService.searchAll.mockResolvedValue(mockProfiles);

      const result = await controller.findAll('search', 'specialization');

      expect(service.searchAll).toHaveBeenCalledWith('search', 'specialization');
      expect(result).toEqual([
        { id: '1', isPublic: true },
        { id: '2', isPublic: true }
      ]);
    });
  });

  describe('findOne', () => {
    it('should return one doctor profile formatted publicly', async () => {
      const mockProfile = { id: '1' };
      mockDoctorsService.findById.mockResolvedValue(mockProfile);

      const result = await controller.findOne('1');

      expect(service.findById).toHaveBeenCalledWith('1');
      expect(result).toEqual({ id: '1', isPublic: true });
    });
  });
});
