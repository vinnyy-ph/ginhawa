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

@Controller('doctors')
export class SlotsController {
  constructor(private readonly slotsService: SlotsService) {}

  @Post('slots')
  @Roles('DOCTOR')
  create(
    @Request() req: { user: { id: string } },
    @Body() createSlotDto: CreateSlotDto,
  ) {
    return this.slotsService.create(req.user.id, createSlotDto);
  }

  @Post('slots/bulk')
  @Roles('DOCTOR')
  createBulk(
    @Request() req: { user: { id: string } },
    @Body() dto: CreateBulkSlotsDto,
  ) {
    return this.slotsService.createBulk(req.user.id, dto.slots);
  }

  @Public()
  @Get(':id/slots')
  findAll(@Param('id') id: string) {
    return this.slotsService.findAllByDoctorProfileId(id);
  }

  @Patch('slots/:id')
  @Roles('DOCTOR')
  update(
    @Request() req: { user: { id: string } },
    @Param('id') id: string,
    @Body() updateSlotDto: UpdateSlotDto,
  ) {
    return this.slotsService.update(req.user.id, id, updateSlotDto);
  }

  @Delete('slots/:id')
  @Roles('DOCTOR')
  remove(@Request() req: { user: { id: string } }, @Param('id') id: string) {
    return this.slotsService.remove(req.user.id, id);
  }
}
