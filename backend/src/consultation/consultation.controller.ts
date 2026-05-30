/**
 * Handles real-time telemedicine consultation features tied to a specific appointment:
 * video room provisioning, live doctor notes, and AI-powered post-consultation summaries.
 * All routes require a valid JWT. Room access is open to both participants;
 * notes and summarization are restricted to the treating doctor.
 */
import {
  Controller,
  Get,
  Patch,
  Post,
  Body,
  Param,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ConsultationService } from './consultation.service';
import { UpdateNotesDto } from './dto/update-notes.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

/**
 * Controller for the `/consultation` route group.
 * All endpoints are protected by JWT + role-based access control.
 */
@Controller('consultation')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ConsultationController {
  constructor(private readonly consultationService: ConsultationService) {}

  /**
   * GET /consultation/:id/room
   * Returns the Daily.co video room URL for the given appointment, creating the room
   * on first access. Doctors additionally receive patient context (vitals, history).
   * Accessible to both DOCTOR and PATIENT roles.
   */
  @Get(':id/room')
  @Roles('DOCTOR', 'PATIENT')
  getRoom(@Param('id') id: string, @Request() req: { user: { id: string } }) {
    return this.consultationService.getOrCreateRoom(id, req.user.id);
  }

  /**
   * PATCH /consultation/:id/notes
   * Persists the doctor's live notes for an in-progress consultation.
   * Restricted to the DOCTOR role; the caller must be the appointment's doctor.
   */
  @Patch(':id/notes')
  @Roles('DOCTOR')
  updateNotes(
    @Param('id') id: string,
    @Request() req: { user: { id: string } },
    @Body() body: UpdateNotesDto,
  ) {
    return this.consultationService.updateNotes(id, req.user.id, body.notes);
  }

  /**
   * POST /consultation/:id/summarize
   * Triggers an AI-generated summary of the doctor's live notes, returning structured
   * clinical and patient-facing summaries, prescriptions, and follow-up advice.
   * Restricted to the DOCTOR role; the caller must be the appointment's doctor.
   */
  @Post(':id/summarize')
  @Roles('DOCTOR')
  summarize(@Param('id') id: string, @Request() req: { user: { id: string } }) {
    return this.consultationService.summarize(id, req.user.id);
  }
}
