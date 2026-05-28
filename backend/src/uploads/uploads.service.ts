import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';

@Injectable()
export class UploadsService {
  constructor(private configService: ConfigService) {
    cloudinary.config({
      cloud_name: this.configService.get<string>('CLOUDINARY_CLOUD_NAME'),
      api_key: this.configService.get<string>('CLOUDINARY_API_KEY'),
      api_secret: this.configService.get<string>('CLOUDINARY_API_SECRET'),
    });
  }

  async uploadFile(file: Express.Multer.File): Promise<string> {
    if (this.configService.get<string>('STORAGE') === 'cloudinary') {
      return this.uploadToCloudinary(file);
    }
    return this.uploadToLocal(file);
  }

  private uploadToLocal(file: Express.Multer.File): string {
    const baseUrl =
      this.configService.get<string>('BASE_URL') ?? 'http://localhost:3001';
    return `${baseUrl}/uploads/${file.filename}`;
  }

  private async uploadToCloudinary(file: Express.Multer.File): Promise<string> {
    return new Promise((resolve, reject) => {
      cloudinary.uploader.upload(
        file.path,
        { folder: 'telehealth-profiles' },
        (error, result) => {
          if (error || !result) return reject(error ?? new Error('No result from Cloudinary'));
          resolve(result.secure_url);
        },
      );
    });
  }
}
