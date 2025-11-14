import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthModule } from '@app/health/health.module';
import { ConnectorModule } from './connector/connector.module';
import { LangChainModule } from './langchain/langchain.module';
import { WebhookModule } from './webhook/webhook.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    HealthModule,
    ConnectorModule,
    LangChainModule,
    WebhookModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
