/**
 * Profile-picture upload endpoint.
 *
 * Requires authentication. The multer interceptor enforces the size/type
 * limits (see multer.config) before the handler runs; the service then stores
 * the file and returns its public URL.
 */
import {
  Controller,
  Post,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { UploadsService } from './uploads.service';
import { multerLocalConfig } from './multer.config';

@Controller('uploads')
@UseGuards(JwtAuthGuard)
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  /** Accepts a single `file` field and returns `{ url }` of the stored image. */
  @Post('profile-picture')
  @UseInterceptors(FileInterceptor('file', multerLocalConfig))
  async uploadProfilePicture(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    const url = await this.uploadsService.uploadFile(file);
    return { url };
  }
}
