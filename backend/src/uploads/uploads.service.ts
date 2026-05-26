import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class UploadsService {
  constructor(private configService: ConfigService) {}

  async uploadFile(file: Express.Multer.File): Promise<string> {
    if (this.configService.get('STORAGE') === 'cloudinary') {
      return this.uploadToCloudinary(file);
    }
    return this.uploadToLocal(file);
  }

  private uploadToLocal(file: Express.Multer.File): string {
    const baseUrl = this.configService.get('BASE_URL') ?? 'http://localhost:3001';
    return `${baseUrl}/uploads/${file.filename}`;
  }

  private async uploadToCloudinary(file: Express.Multer.File): Promise<string> {
    // Deferred to deployment time as per docs/STORAGE-SPECS.md
    throw new Error('Cloudinary not configured yet.');
  }
}
