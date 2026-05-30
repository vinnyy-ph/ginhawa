/**
 * PatientsModule — patient profile & clinical data ownership.
 *
 * Owns: `PatientProfile` and its `MedicalHistoryRecord` — demographics,
 *   contact/insurance, and protected health information (PHI). Keyed 1:1
 *   to a User via userId.
 * Does NOT own: the User account/credentials (UsersModule) or any doctor
 *   data (DoctorsModule). Clinical data stays isolated here — never fold
 *   PHI into the identity record.
 */
import { Module } from '@nestjs/common';
import { PatientsService } from './patients.service';
import { PatientsController } from './patients.controller';
import { PrismaModule } from '../infrastructure/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PatientsController],
  providers: [PatientsService],
  exports: [PatientsService],
})
export class PatientsModule {}
