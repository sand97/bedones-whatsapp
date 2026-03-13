import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { WhatsAppAgentModule } from '../whatsapp-agent/whatsapp-agent.module';

import { StatusSchedulerController } from './status-scheduler.controller';
import { StatusSchedulerDispatcherService } from './status-scheduler-dispatcher.service';
import { StatusSchedulerService } from './status-scheduler.service';

@Module({
  imports: [PrismaModule, WhatsAppAgentModule],
  controllers: [StatusSchedulerController],
  providers: [StatusSchedulerService, StatusSchedulerDispatcherService],
  exports: [StatusSchedulerService],
})
export class StatusSchedulerModule {}
