import { Controller, Get, Patch, Post, Body, Param, Request, UseGuards } from '@nestjs/common';
import { ConsultationService } from './consultation.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('consultation')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ConsultationController {
  constructor(private readonly consultationService: ConsultationService) {}

  @Get(':id/room')
  @Roles('DOCTOR', 'PATIENT')
  getRoom(
    @Param('id') id: string,
    @Request() req: { user: { id: string } },
  ) {
    return this.consultationService.getOrCreateRoom(id, req.user.id);
  }

  @Patch(':id/notes')
  @Roles('DOCTOR')
  updateNotes(
    @Param('id') id: string,
    @Request() req: { user: { id: string } },
    @Body() body: { notes: string },
  ) {
    return this.consultationService.updateNotes(id, req.user.id, body.notes);
  }

  @Post(':id/summarize')
  @Roles('DOCTOR')
  summarize(
    @Param('id') id: string,
    @Request() req: { user: { id: string } },
  ) {
    return this.consultationService.summarize(id, req.user.id);
  }
}
