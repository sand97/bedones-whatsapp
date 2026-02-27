import { HealthModule } from '@app/health/health.module';
import { BullModule } from '@nestjs/bull';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';

import { AppStartupModule } from './app-startup/app-startup.module';
import { BackendClientModule } from './backend-client/backend-client.module';
import { CatalogModule } from './catalog/catalog.module';
import { ConnectorModule } from './connector/connector.module';
import { LangChainModule } from './langchain/langchain.module';
import { PrismaModule } from './prisma/prisma.module';
import { SecurityModule } from './security/security.module';
import { ToolsModule } from './tools/tools.module';
import { WebhookModule } from './webhook/webhook.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        redis: configService.get<string>('REDIS_URL'),
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
        },
      }),
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    SecurityModule,
    HealthModule,
    ConnectorModule,
    BackendClientModule,
    CatalogModule, // Catalog sync with embeddings
    ToolsModule, // QueueModule is imported via ToolsModule (MessagesTools dependency)
    LangChainModule,
    AppStartupModule, // Coordinates startup tasks (connector check + initial sync)
    WebhookModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
