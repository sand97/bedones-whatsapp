import { HealthModule } from '@app/health/health.module';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SentryModule } from '@sentry/nestjs/setup';

import { WhatsAppModule } from './whatsapp/whatsapp.module';

@Module({
  imports: [
    SentryModule.forRoot(),
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    HealthModule,
    WhatsAppModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
