import { BackendClientModule } from '@app/backend-client/backend-client.module';
import { ConnectorModule } from '@app/connector/connector.module';
import { MessageMetadataModule } from '@app/message-metadata/message-metadata.module';
import { PageScriptModule } from '@app/page-scripts/page-script.module';
import { SecurityModule } from '@app/security/security.module';
import { ToolsModule } from '@app/tools/tools.module';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { SystemPromptService } from './system-prompt.service';
import { WhatsAppAgentService } from './whatsapp-agent.service';

@Module({
  imports: [
    ConfigModule,
    ConnectorModule,
    MessageMetadataModule,
    PageScriptModule,
    BackendClientModule,
    SecurityModule,
    ToolsModule,
  ],
  providers: [SystemPromptService, WhatsAppAgentService],
  exports: [WhatsAppAgentService],
})
export class LangChainModule {}
