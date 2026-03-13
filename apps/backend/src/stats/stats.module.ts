import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';

import { StatsController } from './stats.controller';
import { StatsSnapshotSchedulerService } from './stats-snapshot-scheduler.service';
import { StatsService } from './stats.service';

@Module({
  imports: [PrismaModule],
  controllers: [StatsController],
  providers: [StatsService, StatsSnapshotSchedulerService],
  exports: [StatsService],
})
export class StatsModule {}
