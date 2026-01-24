import { ConnectorModule } from '@app/connector/connector.module';
import { LangChainModule } from '@app/langchain/langchain.module';
import { PageScriptModule } from '@app/page-scripts/page-script.module';
import { PrismaModule } from '@app/prisma/prisma.module';
import { BullModule } from '@nestjs/bull';
import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { MessagesTools } from '@app/tools/messages/messages.tools';
import { QueueService } from './queue.service';
import { ScheduledMessageProcessor } from './scheduled-message.processor';

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
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
      inject: [ConfigService],
    }),
    BullModule.registerQueue({
      name: 'scheduled-messages',
    }),
    PrismaModule,
    ConnectorModule,
    PageScriptModule,
    forwardRef(() => LangChainModule),
  ],
  providers: [QueueService, ScheduledMessageProcessor, MessagesTools],
  exports: [QueueService, MessagesTools],
})
export class QueueModule {}
