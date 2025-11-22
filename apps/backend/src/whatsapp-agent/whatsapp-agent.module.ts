import { Module } from '@nestjs/common';

import { CommonModule } from '../common/common.module';
import { ConnectorClientModule } from '../connector-client/connector-client.module';
import { PageScriptModule } from '../page-scripts/page-script.module';
import { PrismaModule } from '../prisma/prisma.module';

import { UserSyncService } from './user-sync.service';
import { WhatsAppAgentController } from './whatsapp-agent.controller';
import { WhatsAppAgentService } from './whatsapp-agent.service';

@Module({
  imports: [
    PrismaModule,
    CommonModule,
    ConnectorClientModule,
    PageScriptModule,
  ],
  controllers: [WhatsAppAgentController],
  providers: [WhatsAppAgentService, UserSyncService],
  exports: [WhatsAppAgentService, UserSyncService],
})
export class WhatsAppAgentModule {}
