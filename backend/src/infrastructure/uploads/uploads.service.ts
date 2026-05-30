import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';

/**
 * File storage abstraction with two backends selected by the `STORAGE` env var:
 *  - `cloudinary` → uploads to Cloudinary and returns its secure URL (used in
 *    production, where the container filesystem is ephemeral).
 *  - anything else → keeps the file on local disk and returns a `/uploads/*`
 *    URL served by the static-assets middleware (used in local dev).
 */
@Injectable()
export class UploadsService {
  constructor(private configService: ConfigService) {
    cloudinary.config({
      cloud_name: this.configService.get<string>('CLOUDINARY_CLOUD_NAME'),
      api_key: this.configService.get<string>('CLOUDINARY_API_KEY'),
      api_secret: this.configService.get<string>('CLOUDINARY_API_SECRET'),
    });
  }

  /** Stores the file using the configured backend and returns its public URL. */
  async uploadFile(file: Express.Multer.File): Promise<string> {
    if (this.configService.get<string>('STORAGE') === 'cloudinary') {
      return this.uploadToCloudinary(file);
    }
    return this.uploadToLocal(file);
  }

  /** Builds the public URL for a file already written to local disk by multer. */
  private uploadToLocal(file: Express.Multer.File): string {
    const baseUrl =
      this.configService.get<string>('BASE_URL') ?? 'http://localhost:3001';
    return `${baseUrl}/uploads/${file.filename}`;
  }

  /** Uploads to Cloudinary and resolves with the returned secure (https) URL. */
  private async uploadToCloudinary(file: Express.Multer.File): Promise<string> {
    return new Promise((resolve, reject) => {
      void cloudinary.uploader.upload(
        file.path,
        { folder: 'telehealth-profiles' },
        (error, result) => {
          if (error || !result)
            return reject(
              error instanceof Error
                ? error
                : new Error(error?.message ?? 'No result from Cloudinary'),
            );
          resolve(result.secure_url);
        },
      );
    });
  }
}
