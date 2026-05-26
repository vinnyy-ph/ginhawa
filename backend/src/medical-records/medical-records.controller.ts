import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { MedicalRecordsService } from './medical-records.service';
import { CreateMedicalRecordDto } from './dto/create-medical-record.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('medical-records')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MedicalRecordsController {
  constructor(private readonly medicalRecordsService: MedicalRecordsService) {}

  @Post()
  @Roles('DOCTOR')
  create(
    @Request() req: { user: { id: string } },
    @Body() createMedicalRecordDto: CreateMedicalRecordDto,
  ) {
    return this.medicalRecordsService.create(req.user.id, createMedicalRecordDto);
  }

  @Get('patient')
  @Roles('PATIENT')
  findAllForPatient(@Request() req: { user: { id: string } }) {
    return this.medicalRecordsService.findAllForPatient(req.user.id);
  }

  @Get('doctor')
  @Roles('DOCTOR')
  findAllForDoctor(@Request() req: { user: { id: string } }) {
    return this.medicalRecordsService.findAllForDoctor(req.user.id);
  }
}
