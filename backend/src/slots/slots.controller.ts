/**
 * HTTP controller for doctor availability-slot management, mounted under /doctors.
 *
 * Auth posture: slot writes (create, bulk create, update, delete) require the
 * DOCTOR role. The public slot-listing endpoint (`GET /doctors/:id/slots`) is
 * unauthenticated so patients and anonymous visitors can browse a doctor's
 * calendar before booking.
 *
 * Note: the controller base path is `doctors` (not `slots`) so that slot routes
 * are nested naturally under the doctor resource (e.g. `/doctors/slots`,
 * `/doctors/:id/slots`).
 */
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Request,
} from '@nestjs/common';
import { SlotsService } from './slots.service';
import { CreateSlotDto } from './dto/create-slot.dto';
import { UpdateSlotDto } from './dto/update-slot.dto';
import { CreateBulkSlotsDto } from './dto/create-bulk-slots.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';

/**
 * Handles doctor availability slot CRUD and bulk creation.
 * All mutating endpoints resolve the doctor's profile from the JWT `userId`
 * and enforce that the slot being modified belongs to that doctor.
 */
@Controller('doctors')
export class SlotsController {
  constructor(private readonly slotsService: SlotsService) {}

  /**
   * POST /doctors/slots — create a single availability slot for the authenticated doctor.
   * Validates no overlap with existing slots before persisting. Requires DOCTOR role.
   */
  @Post('slots')
  @Roles('DOCTOR')
  create(
    @Request() req: { user: { id: string } },
    @Body() createSlotDto: CreateSlotDto,
  ) {
    return this.slotsService.create(req.user.id, createSlotDto);
  }

  /**
   * POST /doctors/slots/bulk — create up to 1 000 slots in one request.
   * Slots that overlap with each other or with existing slots are silently skipped;
   * the response reports `created` and `skipped` counts. Requires DOCTOR role.
   */
  @Post('slots/bulk')
  @Roles('DOCTOR')
  createBulk(
    @Request() req: { user: { id: string } },
    @Body() dto: CreateBulkSlotsDto,
  ) {
    return this.slotsService.createBulk(req.user.id, dto.slots);
  }

  /**
   * GET /doctors/:id/slots — list all availability slots for a doctor by DoctorProfile ID.
   * Public endpoint; no authentication required.
   */
  @Public()
  @Get(':id/slots')
  findAll(@Param('id') id: string) {
    return this.slotsService.findAllByDoctorProfileId(id);
  }

  /**
   * PATCH /doctors/slots/:id — update an existing slot (e.g. change status).
   * Requires DOCTOR role; ownership of the slot is verified before updating.
   */
  @Patch('slots/:id')
  @Roles('DOCTOR')
  update(
    @Request() req: { user: { id: string } },
    @Param('id') id: string,
    @Body() updateSlotDto: UpdateSlotDto,
  ) {
    return this.slotsService.update(req.user.id, id, updateSlotDto);
  }

  /**
   * DELETE /doctors/slots/:id — remove a slot owned by the authenticated doctor.
   * Throws `BadRequestException` if the slot is currently BOOKED — the associated
   * appointment must be cancelled first. Requires DOCTOR role.
   */
  @Delete('slots/:id')
  @Roles('DOCTOR')
  remove(@Request() req: { user: { id: string } }, @Param('id') id: string) {
    return this.slotsService.remove(req.user.id, id);
  }
}
