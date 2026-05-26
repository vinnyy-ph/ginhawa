import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';

@Injectable()
export class UploadsService {
  private readonly uploadDir = path.join(process.cwd(), 'uploads');

  constructor() {
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async saveFile(file: Express.Multer.File): Promise<string> {
    const fileExt = path.extname(file.originalname);
    const fileName = `${randomUUID()}${fileExt}`;
    const filePath = path.join(this.uploadDir, fileName);

    fs.writeFileSync(filePath, file.buffer);

    // Return a URL-friendly path
    return `/uploads/${fileName}`;
  }
}
