/**
 * Root application module.
 *
 * Wires together every feature module and registers the two app-wide guards.
 * The guard order matters: JwtAuthGuard runs first to authenticate the request
 * and attach `req.user`, then RolesGuard runs to authorize based on that user's
 * role. Both are registered as APP_GUARD so they apply to every route by
 * default; endpoints opt out with `@Public()` or relax auth with `@OptionalJwt()`.
 */
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { PrismaModule } from './infrastructure/prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { PatientsModule } from './patients/patients.module';
import { UploadsModule } from './infrastructure/uploads/uploads.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { RolesGuard } from './auth/guards/roles.guard';
import { DoctorsModule } from './doctors/doctors.module';
import { AppointmentsModule } from './appointments/appointments.module';
import { SlotsModule } from './slots/slots.module';
import { RecommendationsModule } from './recommendations/recommendations.module';
import { NotificationsModule } from './notifications/notifications.module';
import { MedicalRecordsModule } from './medical-records/medical-records.module';
import { ConsultationModule } from './consultation/consultation.module';
import { SpeechModule } from './infrastructure/speech/speech.module';
import { ReviewsModule } from './reviews/reviews.module';
import { SpecializationsModule } from './specializations/specializations.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    UsersModule,
    AuthModule,
    PatientsModule,
    UploadsModule,
    DoctorsModule,
    AppointmentsModule,
    SlotsModule,
    RecommendationsModule,
    NotificationsModule,
    MedicalRecordsModule,
    ConsultationModule,
    SpeechModule,
    ReviewsModule,
    SpecializationsModule,
  ],
  controllers: [HealthController],
  providers: [
    HealthService,
    // Authentication runs before authorization: JwtAuthGuard populates
    // `req.user`, then RolesGuard checks that user against `@Roles(...)`.
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
