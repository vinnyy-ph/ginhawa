import {
  Controller,
  Post,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UploadsService } from './uploads.service';
import { multerLocalConfig } from './multer.config';

@Controller('uploads')
@UseGuards(JwtAuthGuard)
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post('profile-picture')
  @UseInterceptors(FileInterceptor('file', multerLocalConfig))
  async uploadProfilePicture(@UploadedFile() file: Express.Multer.File) {
    const url = await this.uploadsService.uploadFile(file);
    return { url };
  }
}
