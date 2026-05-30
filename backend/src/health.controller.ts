/**
 * Liveness/health-check endpoint.
 *
 * Marked `@Public()` so platform health probes (e.g. Railway, load balancers)
 * can reach it without a JWT.
 */
import { Controller, Get } from '@nestjs/common';
import { HealthService } from './health.service';
import { Public } from './auth/decorators/public.decorator';

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  /** Returns `{ status: 'ok', timestamp }` when the process is up. */
  @Public()
  @Get()
  check(): { status: 'ok'; timestamp: string } {
    return this.healthService.check();
  }
}
