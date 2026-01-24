import { BackendClientModule } from '@app/backend-client/backend-client.module';
import { ConnectorModule } from '@app/connector/connector.module';
import { PageScriptModule } from '@app/page-scripts/page-script.module';
import { QueueModule } from '@app/queue/queue.module';
import { SecurityModule } from '@app/security/security.module';
import { ToolsModule } from '@app/tools/tools.module';
import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { SystemPromptService } from './system-prompt.service';
import { WhatsAppAgentService } from './whatsapp-agent.service';

@Module({
  imports: [
    ConfigModule,
    ConnectorModule,
    PageScriptModule,
    BackendClientModule,
    SecurityModule,
    ToolsModule,
    forwardRef(() => QueueModule), // QueueModule needs WhatsAppAgentService, we need MessagesTools from QueueModule
  ],
  providers: [SystemPromptService, WhatsAppAgentService],
  exports: [WhatsAppAgentService],
})
export class LangChainModule {}
