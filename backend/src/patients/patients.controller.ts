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

@Controller('patients')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('PATIENT')
export class PatientsController {
  constructor(private readonly patientsService: PatientsService) {}

  @Post('profile')
  create(
    @Request() req: { user: { id: string } },
    @Body() createPatientDto: CreatePatientDto,
  ) {
    return this.patientsService.create(req.user.id, createPatientDto);
  }

  @Get('profile')
  getProfile(@Request() req: { user: { id: string } }) {
    return this.patientsService.findByUserId(req.user.id);
  }

  @Patch('profile')
  update(
    @Request() req: { user: { id: string } },
    @Body() updatePatientDto: UpdatePatientDto,
  ) {
    return this.patientsService.update(req.user.id, updatePatientDto);
  }

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
