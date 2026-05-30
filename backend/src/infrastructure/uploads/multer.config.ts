import { diskStorage } from 'multer';
import { extname } from 'path';
import { randomUUID } from 'crypto';
import { Request } from 'express';

/**
 * Multer options for profile-picture uploads to local disk.
 *
 * - Files are renamed to a random UUID to avoid collisions and prevent callers
 *   from controlling the on-disk path via the original filename.
 * - Capped at 5 MB and restricted to JPEG/PNG/WebP image types.
 */
export const multerLocalConfig = {
  storage: diskStorage({
    destination: './uploads',
    filename: (
      _req: Request,
      file: Express.Multer.File,
      callback: (error: Error | null, filename: string) => void,
    ) => {
      const uniqueName = `${randomUUID()}${extname(file.originalname)}`;
      callback(null, uniqueName);
    },
  }),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB max
  },
  fileFilter: (
    _req: Request,
    file: Express.Multer.File,
    callback: (error: Error | null, acceptFile: boolean) => void,
  ) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowed.includes(file.mimetype)) {
      callback(null, true);
    } else {
      callback(
        new Error('Only JPEG, PNG, and WebP images are allowed.'),
        false,
      );
    }
  },
};
