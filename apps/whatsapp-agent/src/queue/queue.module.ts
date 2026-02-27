import { ConnectorModule } from '@app/connector/connector.module';
import { LangChainModule } from '@app/langchain/langchain.module';
import { PageScriptModule } from '@app/page-scripts/page-script.module';
import { PrismaModule } from '@app/prisma/prisma.module';
import { BullModule } from '@nestjs/bull';
import { Module, forwardRef } from '@nestjs/common';

import { QueueService } from './queue.service';
import { ScheduledMessageProcessor } from './scheduled-message.processor';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'scheduled-messages',
    }),
    PrismaModule,
    ConnectorModule,
    PageScriptModule,
    forwardRef(() => LangChainModule),
  ],
  providers: [QueueService, ScheduledMessageProcessor],
  exports: [QueueService],
})
export class QueueModule {}
