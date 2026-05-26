import { Controller, Get, Post, Body, Patch, Param, Query, UseGuards, Request } from '@nestjs/common';
import { DoctorsService } from './doctors.service';
import { CreateDoctorDto } from './dto/create-doctor.dto';
import { UpdateDoctorDto } from './dto/update-doctor.dto';
import { toPublicDoctorProfile } from './dto/public-doctor.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('doctors')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DoctorsController {
  constructor(private readonly doctorsService: DoctorsService) {}

  @Post('profile')
  @Roles('DOCTOR')
  create(@Request() req: any, @Body() createDoctorDto: CreateDoctorDto) {
    return this.doctorsService.create(req.user.id, createDoctorDto);
  }

  @Get('profile')
  @Roles('DOCTOR')
  getProfile(@Request() req: any) {
    return this.doctorsService.findByUserId(req.user.id);
  }

  @Patch('profile')
  @Roles('DOCTOR')
  update(@Request() req: any, @Body() updateDoctorDto: UpdateDoctorDto) {
    return this.doctorsService.update(req.user.id, updateDoctorDto);
  }

  @Get()
  async findAll(@Query('search') search?: string, @Query('specialization') specialization?: string) {
    const profiles = await this.doctorsService.searchAll(search, specialization);
    return profiles.map(toPublicDoctorProfile);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const profile = await this.doctorsService.findById(id);
    return toPublicDoctorProfile(profile);
  }
}
