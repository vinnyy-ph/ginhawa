import { Controller, Get, Post, Body, Patch, UseGuards, Request } from '@nestjs/common';
import { PatientsService } from './patients.service';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('patients')
@UseGuards(JwtAuthGuard)
export class PatientsController {
  constructor(private readonly patientsService: PatientsService) {}

  @Post('profile')
  create(@Request() req: any, @Body() createPatientDto: CreatePatientDto) {
    return this.patientsService.create(req.user.id, createPatientDto);
  }

  @Get('profile')
  getProfile(@Request() req: any) {
    return this.patientsService.findByUserId(req.user.id);
  }

  @Patch('profile')
  update(@Request() req: any, @Body() updatePatientDto: UpdatePatientDto) {
    return this.patientsService.update(req.user.id, updatePatientDto);
  }
}
