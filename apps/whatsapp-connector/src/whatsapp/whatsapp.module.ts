import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { TargetInstanceGuard } from './guards/target-instance.guard';
import { MessageHistoryService } from './services/message-history.service';
import { WebhookService } from './webhook.service';
import { WhatsAppClientService } from './whatsapp-client.service';
import { WhatsAppController } from './whatsapp.controller';

@Module({
  imports: [
    HttpModule.register({
      timeout: 60000, // 60 secondes pour les opérations longues (ex: save-catalog)
      maxRedirects: 5,
    }),
    ConfigModule,
  ],
  controllers: [WhatsAppController],
  providers: [
    WhatsAppClientService,
    WebhookService,
    MessageHistoryService,
    TargetInstanceGuard,
  ],
  exports: [WhatsAppClientService, WebhookService],
})
export class WhatsAppModule {}
