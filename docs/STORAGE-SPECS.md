# Ginhawa — Local Storage Workflow

This document supplements `SPECS.md` by defining how file storage is handled during **local development**. The production storage strategy (Cloudinary) is intentionally deferred to deployment time. This workflow allows the full application to be built and tested without any external storage dependencies.

***

## Overview

The SPECS defines `profilepictureurl` as a string field in both `PatientProfile` and `DoctorProfile` database entities. During local development, this URL will point to a file served from the backend's static `/uploads` directory. On production deployment, the same field will hold a Cloudinary CDN URL — no schema or frontend changes are required.

***

## What Needs File Storage

Based on the SPECS, the only binary file asset in the MVP scope is:

| Asset | Entity | DB Field | Required |
|-------|--------|----------|----------|
| Patient profile picture | `PatientProfile` | `profilepictureurl` | Yes |
| Doctor profile picture | `DoctorProfile` | `profilepictureurl` | Yes |

All other records (prescriptions, consultation notes, medical history, recommendations) are stored as **structured text fields** in the database and do not require file storage.

***

## Local Directory Structure

Add an `uploads/` folder at the root of your backend project:

```
backend/
├── src/
├── uploads/           ← uploaded files land here (gitignored)
│   └── .gitkeep       ← keeps the folder tracked by Git
├── .env
└── ...
```

Add to `.gitignore`:

```gitignore
/uploads/*
!/uploads/.gitkeep
```

***

## Environment Variables

Use a `STORAGE` flag in `.env` to switch between local and Cloudinary without touching code:

```env
# .env (local development)
STORAGE=local
BASE_URL=http://localhost:3000

# .env.production (deployment)
STORAGE=cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

***

## Backend Setup (NestJS)

### 1. Serve the `/uploads` Folder as Static

In `main.ts`, register the uploads directory as a static asset path:

```typescript
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads',
  });

  await app.listen(3000);
}
bootstrap();
```

This makes uploaded files accessible at `http://localhost:3000/uploads/<filename>`.

### 2. Install Multer

```bash
npm install multer @types/multer
```

### 3. Abstract the Upload Service

Create a single `UploadService` that handles both local and Cloudinary logic. The `STORAGE` env variable determines which path runs — swapping to Cloudinary at deployment requires no changes to controllers or modules.

```typescript
// src/upload/upload.service.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Express } from 'express';

@Injectable()
export class UploadService {
  constructor(private config: ConfigService) {}

  async uploadFile(file: Express.Multer.File): Promise<string> {
    if (this.config.get('STORAGE') === 'cloudinary') {
      return this.uploadToCloudinary(file);
    }
    return this.uploadToLocal(file);
  }

  private uploadToLocal(file: Express.Multer.File): string {
    const baseUrl = this.config.get('BASE_URL') ?? 'http://localhost:3000';
    return `${baseUrl}/uploads/${file.filename}`;
  }

  private async uploadToCloudinary(file: Express.Multer.File): Promise<string> {
    // TODO: implement when switching to production
    // const result = await cloudinary.uploader.upload(file.path);
    // return result.secure_url;
    throw new Error('Cloudinary not configured yet.');
  }
}
```

### 4. Configure Multer for Local Disk Storage

```typescript
// src/upload/multer.config.ts
import { diskStorage } from 'multer';
import { extname } from 'path';
import { v4 as uuidv4 } from 'uuid';

export const multerLocalConfig = {
  storage: diskStorage({
    destination: './uploads',
    filename: (_req, file, callback) => {
      const uniqueName = `${uuidv4()}${extname(file.originalname)}`;
      callback(null, uniqueName);
    },
  }),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB max
  },
  fileFilter: (_req: any, file: Express.Multer.File, callback: any) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowed.includes(file.mimetype)) {
      callback(null, true);
    } else {
      callback(new Error('Only JPEG, PNG, and WebP images are allowed.'), false);
    }
  },
};
```

### 5. Wire It Into a Profile Controller

```typescript
// src/profile/profile.controller.ts (excerpt)
import { Controller, Post, UploadedFile, UseInterceptors, Req } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { multerLocalConfig } from '../upload/multer.config';
import { UploadService } from '../upload/upload.service';

@Controller('profile')
export class ProfileController {
  constructor(private uploadService: UploadService) {}

  @Post('avatar')
  @UseInterceptors(FileInterceptor('file', multerLocalConfig))
  async uploadAvatar(@UploadedFile() file: Express.Multer.File) {
    const url = await this.uploadService.uploadFile(file);
    // Save `url` to PatientProfile.profilepictureurl or DoctorProfile.profilepictureurl
    return { profilepictureurl: url };
  }
}
```

***

## How the DB Field Gets Populated

After a successful upload, the returned URL string is saved directly into the database:

```
PatientProfile.profilepictureurl = "http://localhost:3000/uploads/uuid-filename.jpg"
DoctorProfile.profilepictureurl  = "http://localhost:3000/uploads/uuid-filename.jpg"
```

The frontend reads this field and sets it as the `<img src>` for profile pictures anywhere in the UI — patient profile page, doctor discovery cards, consultation room header, etc.

***

## Frontend Usage

No special handling is needed on the frontend. The `profilepictureurl` value is used as a direct image source:

```tsx
// Works for both local and Cloudinary URLs
<img
  src={profile.profilepictureurl ?? '/default-avatar.png'}
  alt={`${profile.fullname} profile picture`}
  width={80}
  height={80}
/>
```

Always provide a fallback (`/default-avatar.png` or a placeholder) for profiles where no picture has been uploaded yet, matching the SPECS guidance on empty profile states.

***

## Switching to Cloudinary (Pre-Deployment Checklist)

When ready to deploy, complete the following steps — no code changes are needed beyond filling in the `UploadService.uploadToCloudinary()` method:

- [ ] Create a free Cloudinary account at [cloudinary.com](https://cloudinary.com)
- [ ] Copy `CLOUD_NAME`, `API_KEY`, and `API_SECRET` from the Cloudinary dashboard
- [ ] Install the Cloudinary SDK: `npm install cloudinary`
- [ ] Implement `uploadToCloudinary()` in `UploadService`:
  ```typescript
  import { v2 as cloudinary } from 'cloudinary';

  private async uploadToCloudinary(file: Express.Multer.File): Promise<string> {
    cloudinary.config({
      cloud_name: this.config.get('CLOUDINARY_CLOUD_NAME'),
      api_key: this.config.get('CLOUDINARY_API_KEY'),
      api_secret: this.config.get('CLOUDINARY_API_SECRET'),
    });
    const result = await cloudinary.uploader.upload(file.path, {
      folder: 'ginhawa/avatars',
      transformation: [{ width: 400, height: 400, crop: 'fill', gravity: 'face' }],
    });
    return result.secure_url;
  }
  ```
- [ ] Set `STORAGE=cloudinary` and the three Cloudinary env vars in your production environment
- [ ] Verify that a profile picture upload in production returns a `https://res.cloudinary.com/...` URL

***

## Notes

- The `/uploads` folder is **ephemeral** on most free deployment platforms (Vercel, Fly.io, Heroku). Do not rely on local disk storage in production.
- Uploaded files should never be committed to Git. The `.gitkeep` pattern ensures the directory exists without tracking its contents.
- File size is capped at **5 MB** and restricted to image MIME types (`image/jpeg`, `image/png`, `image/webp`) to prevent abuse and keep the upload flow predictable.
- Multer's `diskStorage` assigns a UUID-based filename to prevent collisions and avoid exposing original filenames.