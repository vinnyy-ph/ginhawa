import { Test, TestingModule } from '@nestjs/testing';
import { DoctorsController } from './doctors.controller';
import { DoctorsService } from './doctors.service';
import { CreateDoctorDto } from './dto/create-doctor.dto';
import { UpdateDoctorDto } from './dto/update-doctor.dto';

describe('DoctorsController', () => {
  let controller: DoctorsController;

  const mockDoctorsService = {
    create: jest.fn(),
    upsertProfile: jest.fn(),
    findByUserId: jest.fn(),
    update: jest.fn(),
    searchAll: jest.fn(),
    findById: jest.fn(),
  };

  beforeEach(async () => {
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
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create or update a doctor profile using upsertProfile', async () => {
      const createDto: import('./dto/create-doctor-profile.dto').CreateDoctorProfileDto =
        {
          fullName: 'Dr. Test User',
          professionalTitle: 'MD',
          specialization: 'Cardiology',
          bio: 'Test bio',
        };

      const req = { user: { id: 'user-id' } };
      mockDoctorsService.upsertProfile.mockResolvedValue({
        profileComplete: true,
      });

      const result = await controller.create(req, createDto);

      expect(mockDoctorsService.upsertProfile).toHaveBeenCalledWith(
        'user-id',
        createDto,
      );
      expect(result).toEqual({ profileComplete: true });
    });
  });

  describe('getProfile', () => {
    it('should return a doctor profile by user ID', async () => {
      const req = { user: { id: 'user-id' } };
      mockDoctorsService.findByUserId.mockResolvedValue('mockProfile');

      const result = await controller.getProfile(req);

      expect(mockDoctorsService.findByUserId).toHaveBeenCalledWith('user-id');
      expect(result).toBe('mockProfile');
    });
  });

  describe('update', () => {
    it('should update a doctor profile', async () => {
      const updateDto: UpdateDoctorDto = {
        bio: 'Updated bio',
      };
      const req = { user: { id: 'user-id' } };
      mockDoctorsService.update.mockResolvedValue('mockUpdatedProfile');

      const result = await controller.update(req, updateDto);

      expect(mockDoctorsService.update).toHaveBeenCalledWith(
        'user-id',
        updateDto,
      );
      expect(result).toBe('mockUpdatedProfile');
    });
  });

  describe('findAll', () => {
    it('should return all doctor profiles formatted publicly', async () => {
      const mockProfiles = [
        { id: '1', avgRating: 5, reviewCount: 2 },
        { id: '2', avgRating: 0, reviewCount: 0 },
      ];
      mockDoctorsService.searchAll.mockResolvedValue(mockProfiles);

      const result = await controller.findAll(
        'search',
        'specialization',
        'rating',
      );

      expect(mockDoctorsService.searchAll).toHaveBeenCalledWith(
        'search',
        'specialization',
        'rating',
      );
      expect(result).toEqual([
        { id: '1', avgRating: 5, reviewCount: 2 },
        { id: '2', avgRating: 0, reviewCount: 0 },
      ]);
    });
  });

  describe('findOne', () => {
    it('should return one doctor profile formatted publicly', async () => {
      const mockProfile = { id: '1', avgRating: 4, reviewCount: 3 };
      mockDoctorsService.findById.mockResolvedValue(mockProfile);

      const result = await controller.findOne('1');

      expect(mockDoctorsService.findById).toHaveBeenCalledWith('1');
      expect(result).toEqual({ id: '1', avgRating: 4, reviewCount: 3 });
    });
  });
});
