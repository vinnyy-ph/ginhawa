/**
 * Uploads module: profile-picture upload endpoint plus the storage service
 * (local disk or Cloudinary). Exports UploadsService for reuse by other
 * modules that need to persist files.
 */
import { Module } from '@nestjs/common';
import { UploadsService } from './uploads.service';
import { UploadsController } from './uploads.controller';

@Module({
  providers: [UploadsService],
  controllers: [UploadsController],
  exports: [UploadsService],
})
export class UploadsModule {}
