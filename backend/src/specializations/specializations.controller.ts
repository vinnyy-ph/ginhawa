/**
 * Specializations controller — read-only reference data for medical specializations.
 *
 * Intentionally public (no auth guard) so the doctor-discovery UI can populate
 * specialization filters before a user logs in.
 */
import { Controller, Get } from '@nestjs/common';
import { SpecializationsService } from './specializations.service';
import { Public } from '../auth/decorators/public.decorator';

/**
 * Exposes a single unauthenticated endpoint under `/specializations`.
 * The `@Public()` decorator bypasses the global JwtAuthGuard.
 */
@Controller('specializations')
export class SpecializationsController {
  constructor(
    private readonly specializationsService: SpecializationsService,
  ) {}

  /** GET /specializations — returns all specializations sorted alphabetically. No auth required. */
  @Public()
  @Get()
  findAll() {
    return this.specializationsService.findAll();
  }
}
