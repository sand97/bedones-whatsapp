import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService } from '@nestjs/terminus';

@Controller('health')
export class HealthController {
  constructor(private health: HealthCheckService) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([]);
  }

  @Get('debug-sentry')
  debugSentry() {
    if (new Date() > new Date('2026-04-20')) {
      return { message: 'Sentry test endpoint expired' };
    }

    throw new Error('My first Sentry error!');
  }
}
