import { HealthModule } from '@app/health/health.module';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';

import { AppStartupModule } from './app-startup/app-startup.module';
import { BackendClientModule } from './backend-client/backend-client.module';
import { CatalogModule } from './catalog/catalog.module';
import { ConnectorModule } from './connector/connector.module';
import { ImageProcessingModule } from './image-processing/image-processing.module';
import { LangChainModule } from './langchain/langchain.module';
import { PrismaModule } from './prisma/prisma.module';
import { QueueModule } from './queue/queue.module';
import { SecurityModule } from './security/security.module';
import { ToolsModule } from './tools/tools.module';
import { WebhookModule } from './webhook/webhook.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    SecurityModule,
    HealthModule,
    ConnectorModule,
    BackendClientModule,
    CatalogModule, // Catalog sync with embeddings
    ImageProcessingModule, // Image OCR and Qdrant search
    ToolsModule,
    LangChainModule, // Must be before QueueModule (QueueModule depends on it)
    QueueModule,
    AppStartupModule, // Coordinates startup tasks (connector check + initial sync)
    WebhookModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
