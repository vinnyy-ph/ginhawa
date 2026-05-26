import { Test, TestingModule } from '@nestjs/testing';
import { UploadsService } from './uploads.service';
import * as fs from 'fs';
import * as path from 'path';

describe('UploadsService', () => {
  let service: UploadsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UploadsService],
    }).compile();

    service = module.get<UploadsService>(UploadsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('uploadFile', () => {
    it('should save a file and return the path', async () => {
      const mockFile = {
        originalname: 'test.jpg',
        buffer: Buffer.from('fake image data'),
        mimetype: 'image/jpeg',
      } as Express.Multer.File;

      const result = await service.uploadFile(mockFile);

      expect(result).toContain('.jpg');
      expect(fs.existsSync(path.join(process.cwd(), 'uploads', path.basename(result)))).toBe(true);
      
      // Cleanup
      fs.unlinkSync(path.join(process.cwd(), 'uploads', path.basename(result)));
    });
  });
});
