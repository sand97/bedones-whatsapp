import { Module } from '@nestjs/common';
import { WebhookController } from './webhook.controller';
import { LangChainModule } from '../langchain/langchain.module';

@Module({
  imports: [LangChainModule],
  controllers: [WebhookController],
})
export class WebhookModule {}
