/**
 * UsersModule — identity & account ownership.
 *
 * Owns: the `User` record (id, email, passwordHash, role) — the auth anchor.
 *   Account lifecycle (create/find/update/remove) and credential lookup
 *   (findByEmail, consumed by AuthModule).
 * Does NOT own: role-specific profile or clinical data. A user's
 *   demographic/medical profile lives in PatientsModule; the professional
 *   profile lives in DoctorsModule (each linked 1:1 via User → profile.userId).
 */
import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';

@Module({
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
