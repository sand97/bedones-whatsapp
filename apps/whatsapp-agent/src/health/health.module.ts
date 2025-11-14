import { Module } from '@nestjs/common';
import { HealthController } from '@app/health/health.controller';
import { TerminusModule } from '@nestjs/terminus';

@Module({
  controllers: [HealthController],
  imports: [TerminusModule],
})
export class HealthModule {}
