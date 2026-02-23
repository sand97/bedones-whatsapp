import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { InternalJwtGuard } from './internal-jwt.guard';
import { RateLimitService } from './rate-limit.service';
import { SanitizationService } from './sanitization.service';

@Module({
  imports: [ConfigModule],
  providers: [SanitizationService, RateLimitService, InternalJwtGuard],
  exports: [SanitizationService, RateLimitService, InternalJwtGuard],
})
export class SecurityModule {}
