import { Controller, Get } from '@nestjs/common';
import { SpecializationsService } from './specializations.service';
import { Public } from '../auth/decorators/public.decorator';

@Controller('specializations')
export class SpecializationsController {
  constructor(
    private readonly specializationsService: SpecializationsService,
  ) {}

  @Public()
  @Get()
  findAll() {
    return this.specializationsService.findAll();
  }
}
