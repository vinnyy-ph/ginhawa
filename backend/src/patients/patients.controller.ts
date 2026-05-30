/**
 * Patients controller — patient profile and medical history management.
 *
 * All routes are protected by JwtAuthGuard + RolesGuard and restricted to users
 * with the PATIENT role. The authenticated user's id is extracted from the JWT
 * payload so patients can only read and modify their own data.
 */
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  UseGuards,
  Request,
} from '@nestjs/common';
import { PatientsService } from './patients.service';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { UpdateMedicalHistoryDto } from './dto/update-medical-history.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

/**
 * Handles `/patients` routes. Restricted to authenticated users with role PATIENT.
 * Every operation is implicitly scoped to the requesting user — no patient can
 * access another patient's profile or medical history.
 */
@Controller('patients')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('PATIENT')
export class PatientsController {
  constructor(private readonly patientsService: PatientsService) {}

  /** POST /patients/profile — creates the patient profile linked to the current user. Throws 409 if a profile already exists. */
  @Post('profile')
  create(
    @Request() req: { user: { id: string } },
    @Body() createPatientDto: CreatePatientDto,
  ) {
    return this.patientsService.create(req.user.id, createPatientDto);
  }

  /** GET /patients/profile — returns the current user's patient profile including the medical history record. */
  @Get('profile')
  getProfile(@Request() req: { user: { id: string } }) {
    return this.patientsService.findByUserId(req.user.id);
  }

  /** PATCH /patients/profile — partially updates demographic/contact fields on the current user's profile. */
  @Patch('profile')
  update(
    @Request() req: { user: { id: string } },
    @Body() updatePatientDto: UpdatePatientDto,
  ) {
    return this.patientsService.update(req.user.id, updatePatientDto);
  }

  /** PATCH /patients/medical-history — upserts the structured medical history record for the current user. */
  @Patch('medical-history')
  updateMedicalHistory(
    @Request() req: { user: { id: string } },
    @Body() updateMedicalHistoryDto: UpdateMedicalHistoryDto,
  ) {
    return this.patientsService.updateMedicalHistory(
      req.user.id,
      updateMedicalHistoryDto,
    );
  }
}
