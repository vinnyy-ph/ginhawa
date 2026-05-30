/**
 * HTTP controller for the /doctors resource.
 *
 * Auth posture: profile management routes (POST/GET/PATCH /doctors/profile)
 * are DOCTOR-only behind JWT + RolesGuard. Discovery routes (GET /doctors,
 * GET /doctors/:id) are public — no authentication required.
 */
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { DoctorsService } from './doctors.service';
import { UpdateDoctorDto } from './dto/update-doctor.dto';
import { toPublicDoctorProfile } from './dto/public-doctor.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';

/**
 * Handles doctor profile creation/management and public discovery.
 *
 * Protected endpoints require the DOCTOR role. Discovery endpoints are public
 * and strip sensitive fields via `toPublicDoctorProfile` before responding.
 */
@Controller('doctors')
export class DoctorsController {
  constructor(private readonly doctorsService: DoctorsService) {}

  /**
   * POST /doctors/profile — create or update the authenticated doctor's profile.
   * Uses upsert semantics so a doctor can call this endpoint idempotently.
   * Requires DOCTOR role.
   */
  @Post('profile')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('DOCTOR')
  create(
    @Request() req: { user: { id: string } },
    @Body()
    createDoctorDto: import('./dto/create-doctor-profile.dto').CreateDoctorProfileDto,
  ) {
    return this.doctorsService.upsertProfile(req.user.id, createDoctorDto);
  }

  /**
   * GET /doctors/profile — fetch the authenticated doctor's own profile record.
   * Requires DOCTOR role.
   */
  @Get('profile')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('DOCTOR')
  getProfile(@Request() req: { user: { id: string } }) {
    return this.doctorsService.findByUserId(req.user.id);
  }

  /**
   * PATCH /doctors/profile — partially update the authenticated doctor's profile.
   * Requires DOCTOR role.
   */
  @Patch('profile')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('DOCTOR')
  update(
    @Request() req: { user: { id: string } },
    @Body() updateDoctorDto: UpdateDoctorDto,
  ) {
    return this.doctorsService.update(req.user.id, updateDoctorDto);
  }

  /**
   * GET /doctors — public doctor discovery with optional filtering and sorting.
   *
   * @param search - Case-insensitive substring match on the doctor's full name.
   * @param specialization - Case-insensitive substring match on specialization name.
   * @param sortBy - Pass `'rating'` to sort by descending average review rating.
   * @returns Array of public doctor profiles, each augmented with `avgRating` and `reviewCount`.
   */
  @Public()
  @Get()
  async findAll(
    @Query('search') search?: string,
    @Query('specialization') specialization?: string,
    @Query('sortBy') sortBy?: string,
  ) {
    const profiles = await this.doctorsService.searchAll(
      search,
      specialization,
      sortBy,
    );
    return profiles.map((p) => ({
      ...toPublicDoctorProfile(p),
      avgRating: p.avgRating,
      reviewCount: p.reviewCount,
    }));
  }

  /**
   * GET /doctors/:id — retrieve a single doctor's public profile by DoctorProfile ID.
   * Includes availability slots, specializations, and aggregated rating data.
   */
  @Public()
  @Get(':id')
  async findOne(@Param('id') id: string) {
    const profile = await this.doctorsService.findById(id);
    return {
      ...toPublicDoctorProfile(profile),
      avgRating: profile.avgRating,
      reviewCount: profile.reviewCount,
    };
  }
}
