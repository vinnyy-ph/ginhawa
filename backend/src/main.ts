/**
 * Application entry point.
 *
 * Bootstraps the NestJS HTTP server with the cross-cutting concerns that must
 * apply to every request: DTO validation, CORS, and static file serving for
 * locally stored uploads.
 */
import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Validate and reject malformed request bodies globally so individual
  // controllers never have to re-check DTO shape (class-validator decorators
  // on each DTO are the source of truth).
  app.useGlobalPipes(new ValidationPipe());

  // Browser clients are served from a different origin (Next.js app), so the
  // API must allow cross-origin requests.
  app.enableCors();

  // Serve the local `uploads/` directory at /uploads/* — used as the fallback
  // storage backend when Cloudinary is not configured (see UploadsService).
  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads/',
  });

  // Bind to 0.0.0.0 (not just localhost) so the container is reachable on the
  // platform's published port in production (e.g. Railway).
  await app.listen(process.env.PORT ?? 3001, '0.0.0.0');
}
void bootstrap();
