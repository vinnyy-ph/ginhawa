/**
 * DoctorsModule — doctor profile & discovery ownership.
 *
 * Owns: `DoctorProfile`, its `DoctorSpecialization` links, public
 *   search/discovery (searchAll, findById), and review-rating aggregation
 *   (read-only roll-up of Review records). Keyed 1:1 to a User via userId.
 * Does NOT own: the User account/credentials (UsersModule), patient/clinical
 *   data (PatientsModule), or the Review records themselves (ReviewsModule) —
 *   only their aggregated ratings.
 */
import { Module } from '@nestjs/common';
import { DoctorsService } from './doctors.service';
import { DoctorsController } from './doctors.controller';

@Module({
  controllers: [DoctorsController],
  providers: [DoctorsService],
  exports: [DoctorsService],
})
export class DoctorsModule {}
