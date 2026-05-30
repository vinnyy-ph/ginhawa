import { Injectable } from '@nestjs/common';

@Injectable()
export class HealthService {
  check(): { status: 'ok'; timestamp: string } {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}
