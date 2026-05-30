/**
 * Exposes CRUD operations on medical records created by doctors after consultations.
 * Record creation and amendment are restricted to doctors; patients can only read
 * their own records. All routes require JWT authentication and role enforcement.
 */
import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  UseGuards,
  Request,
  Param,
} from '@nestjs/common';
import { MedicalRecordsService } from './medical-records.service';
import { CreateMedicalRecordDto } from './dto/create-medical-record.dto';
import { UpdateMedicalRecordDto } from './dto/update-medical-record.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

/**
 * Controller for the `/medical-records` route group.
 * All endpoints are protected by JWT + role-based access control.
 */
@Controller('medical-records')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MedicalRecordsController {
  constructor(private readonly medicalRecordsService: MedicalRecordsService) {}

  /**
   * POST /medical-records
   * Creates a new medical record for a completed appointment.
   * Restricted to the DOCTOR role; the caller must be the appointment's doctor.
   */
  @Post()
  @Roles('DOCTOR')
  create(
    @Request() req: { user: { id: string } },
    @Body() createMedicalRecordDto: CreateMedicalRecordDto,
  ) {
    return this.medicalRecordsService.create(
      req.user.id,
      createMedicalRecordDto,
    );
  }

  /**
   * PATCH /medical-records/:id
   * Amends the notes, prescription, recommendations, or follow-up advice on an
   * existing medical record. Restricted to the DOCTOR role; the caller must own
   * the record.
   */
  @Patch(':id')
  @Roles('DOCTOR')
  update(
    @Request() req: { user: { id: string } },
    @Param('id') id: string,
    @Body() updateMedicalRecordDto: UpdateMedicalRecordDto,
  ) {
    return this.medicalRecordsService.update(
      req.user.id,
      id,
      updateMedicalRecordDto,
    );
  }

  /**
   * GET /medical-records/patient
   * Returns all medical records belonging to the authenticated patient,
   * ordered newest-first.
   */
  @Get('patient')
  @Roles('PATIENT')
  findAllForPatient(@Request() req: { user: { id: string } }) {
    return this.medicalRecordsService.findAllForPatient(req.user.id);
  }

  /**
   * GET /medical-records/doctor
   * Returns all medical records created by the authenticated doctor,
   * ordered newest-first.
   */
  @Get('doctor')
  @Roles('DOCTOR')
  findAllForDoctor(@Request() req: { user: { id: string } }) {
    return this.medicalRecordsService.findAllForDoctor(req.user.id);
  }
}
