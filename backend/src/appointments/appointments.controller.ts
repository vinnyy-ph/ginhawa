/**
 * HTTP controller for the /appointments resource.
 *
 * All routes require JWT authentication (applied at the controller level).
 * Role-based guards split the surface: booking and patient-facing reads are
 * PATIENT-only; doctor queue and patient-history reads are DOCTOR-only;
 * status updates and rescheduling are open to both roles with role-aware logic
 * enforced in the service.
 */
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentStatusDto } from './dto/update-appointment-status.dto';
import { RescheduleAppointmentDto } from './dto/reschedule-appointment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

/**
 * Exposes appointment booking, status transitions, rescheduling, and
 * role-scoped history/queue views. Every endpoint passes the caller's user ID
 * (and role for shared endpoints) to the service, which enforces ownership.
 */
@Controller('appointments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  /**
   * POST /appointments — book a new appointment for the authenticated patient.
   * Requires PATIENT role. Atomically marks the slot as BOOKED and creates the
   * payment record inside a transaction.
   */
  @Post()
  @Roles('PATIENT')
  create(
    @Request() req: { user: { id: string } },
    @Body() createAppointmentDto: CreateAppointmentDto,
  ) {
    return this.appointmentsService.create(req.user.id, createAppointmentDto);
  }

  /**
   * GET /appointments/patient — list all appointments for the authenticated patient,
   * including doctor, slot, and payment records. Requires PATIENT role.
   */
  @Get('patient')
  @Roles('PATIENT')
  findAllForPatient(@Request() req: { user: { id: string } }) {
    return this.appointmentsService.findAllForPatient(req.user.id);
  }

  /**
   * GET /appointments/doctor — list all appointments in the authenticated doctor's
   * queue, including patient, slot, and payment records. Requires DOCTOR role.
   */
  @Get('doctor')
  @Roles('DOCTOR')
  findAllForDoctor(@Request() req: { user: { id: string } }) {
    return this.appointmentsService.findAllForDoctor(req.user.id);
  }

  /**
   * GET /appointments/doctor/patients — list distinct patients who have booked
   * with the authenticated doctor, with per-patient visit aggregates (totalVisits,
   * upcomingCount, lastVisit, searchText). Requires DOCTOR role.
   */
  @Get('doctor/patients')
  @Roles('DOCTOR')
  findPatientsForDoctor(@Request() req: { user: { id: string } }) {
    return this.appointmentsService.findPatientsForDoctor(req.user.id);
  }

  /**
   * GET /appointments/doctor/patients/:patientId — fetch one patient's full profile
   * plus their complete appointment history (with records) with this doctor.
   * Throws `ForbiddenException` if the patient has never had an appointment with
   * this doctor (enforces care-relationship ownership). Requires DOCTOR role.
   */
  @Get('doctor/patients/:patientId')
  @Roles('DOCTOR')
  findPatientHistory(
    @Request() req: { user: { id: string } },
    @Param('patientId') patientId: string,
  ) {
    return this.appointmentsService.findPatientHistoryForDoctor(
      req.user.id,
      patientId,
    );
  }

  /**
   * GET /appointments/patient/doctors — list distinct doctors the authenticated
   * patient has booked with, with per-doctor visit aggregates sorted by most
   * recent visit. Requires PATIENT role.
   */
  @Get('patient/doctors')
  @Roles('PATIENT')
  findDoctorsForPatient(@Request() req: { user: { id: string } }) {
    return this.appointmentsService.findDoctorsForPatient(req.user.id);
  }

  /**
   * GET /appointments/:id — fetch a single appointment by ID.
   * Requires DOCTOR role; the service enforces that the appointment belongs to
   * the calling doctor.
   */
  @Get(':id')
  @Roles('DOCTOR')
  findOne(@Request() req: { user: { id: string } }, @Param('id') id: string) {
    return this.appointmentsService.findOne(req.user.id, id);
  }

  /**
   * PATCH /appointments/:id/status — transition an appointment to a new status.
   * Both DOCTOR and PATIENT roles are permitted; allowed transitions differ by role
   * (patients may only cancel; doctors drive the full lifecycle). The caller's role
   * is forwarded to the service for transition validation.
   */
  @Patch(':id/status')
  @Roles('DOCTOR', 'PATIENT')
  updateStatus(
    @Request() req: { user: { id: string; role: Role } },
    @Param('id') id: string,
    @Body() updateAppointmentStatusDto: UpdateAppointmentStatusDto,
  ) {
    return this.appointmentsService.updateStatus(
      req.user.id,
      req.user.role,
      id,
      updateAppointmentStatusDto.status,
      updateAppointmentStatusDto.cancelReason,
    );
  }

  /**
   * POST /appointments/:id/reschedule — move an appointment to a different slot.
   * Both DOCTOR and PATIENT roles are permitted. The old slot is freed and a new
   * appointment record is created atomically; the original is marked RESCHEDULED.
   */
  @Post(':id/reschedule')
  @Roles('DOCTOR', 'PATIENT')
  reschedule(
    @Request() req: { user: { id: string; role: Role } },
    @Param('id') id: string,
    @Body() rescheduleAppointmentDto: RescheduleAppointmentDto,
  ) {
    return this.appointmentsService.reschedule(
      req.user.id,
      req.user.role,
      id,
      rescheduleAppointmentDto.newSlotId,
    );
  }
}
