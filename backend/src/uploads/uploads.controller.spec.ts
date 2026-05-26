import { Test, TestingModule } from '@nestjs/testing';
import { UploadsController } from './uploads.controller';
import { UploadsService } from './uploads.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

describe('UploadsController', () => {
  let controller: UploadsController;

  const mockUploadsService = {
    uploadFile: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UploadsController],
      providers: [
        {
          provide: UploadsService,
          useValue: mockUploadsService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<UploadsController>(UploadsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('uploadProfilePicture', () => {
    it('should upload a profile picture and return the url', async () => {
      const mockFile = {
        originalname: 'test.jpg',
        buffer: Buffer.from('fake image data'),
        mimetype: 'image/jpeg',
      } as Express.Multer.File;
      const expectedUrl = '/uploads/unique-id.jpg';
      mockUploadsService.uploadFile.mockResolvedValue(expectedUrl);

      const result = await controller.uploadProfilePicture(mockFile);

      expect(mockUploadsService.uploadFile).toHaveBeenCalledWith(mockFile);
      expect(result).toEqual({ url: expectedUrl });
    });
  });
});
