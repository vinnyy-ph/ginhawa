/**
 * Database access module.
 *
 * Marked `@Global()` so PrismaService can be injected anywhere without each
 * feature module re-importing PrismaModule.
 */
import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
