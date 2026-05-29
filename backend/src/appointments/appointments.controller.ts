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

@Controller('appointments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Post()
  @Roles('PATIENT')
  create(
    @Request() req: { user: { id: string } },
    @Body() createAppointmentDto: CreateAppointmentDto,
  ) {
    return this.appointmentsService.create(req.user.id, createAppointmentDto);
  }

  @Get('patient')
  @Roles('PATIENT')
  findAllForPatient(@Request() req: { user: { id: string } }) {
    return this.appointmentsService.findAllForPatient(req.user.id);
  }

  @Get('doctor')
  @Roles('DOCTOR')
  findAllForDoctor(@Request() req: { user: { id: string } }) {
    return this.appointmentsService.findAllForDoctor(req.user.id);
  }

  @Get('doctor/patients')
  @Roles('DOCTOR')
  findPatientsForDoctor(@Request() req: { user: { id: string } }) {
    return this.appointmentsService.findPatientsForDoctor(req.user.id);
  }

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

  @Get(':id')
  @Roles('DOCTOR')
  findOne(@Request() req: { user: { id: string } }, @Param('id') id: string) {
    return this.appointmentsService.findOne(req.user.id, id);
  }

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
