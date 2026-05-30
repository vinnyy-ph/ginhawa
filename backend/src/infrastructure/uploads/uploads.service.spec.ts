import { Test, TestingModule } from '@nestjs/testing';
import { UploadsService } from './uploads.service';
import { ConfigModule } from '@nestjs/config';

describe('UploadsService', () => {
  let service: UploadsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forRoot()],
      providers: [UploadsService],
    }).compile();

    service = module.get<UploadsService>(UploadsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('uploadFile', () => {
    it('should return a local URL for the uploaded file', async () => {
      const mockFile = {
        originalname: 'test.jpg',
        filename: 'test.jpg',
        buffer: Buffer.from('fake image data'),
        mimetype: 'image/jpeg',
      } as Express.Multer.File;

      const result = await service.uploadFile(mockFile);

      expect(result).toBe('http://localhost:3001/uploads/test.jpg');
    });
  });
});
