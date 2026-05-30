import { Injectable } from '@nestjs/common';

/** Supplies the payload for the health-check endpoint. */
@Injectable()
export class HealthService {
  /** Current liveness status plus a server timestamp for clock-drift checks. */
  check(): { status: 'ok'; timestamp: string } {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}
