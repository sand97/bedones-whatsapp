import Bull, { type Job, type Queue } from 'bull';
import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { StatsService } from './stats.service';

const DAILY_STATS_QUEUE = 'daily-stats-snapshots';
const SNAPSHOT_YESTERDAY_JOB = 'snapshot-yesterday';

@Injectable()
export class StatsSnapshotSchedulerService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(StatsSnapshotSchedulerService.name);
  private queue?: Queue;

  constructor(
    private readonly configService: ConfigService,
    private readonly statsService: StatsService,
  ) {}

  async onModuleInit(): Promise<void> {
    const redisUrl = this.configService.get<string>('REDIS_URL');

    if (!redisUrl) {
      this.logger.warn(
        'REDIS_URL is missing, daily stats snapshots will rely on on-demand backfill only',
      );
      return;
    }

    this.queue = new Bull(DAILY_STATS_QUEUE, redisUrl);

    this.queue.process(
      SNAPSHOT_YESTERDAY_JOB,
      async (_job: Job): Promise<{ day: string; processedUsers: number }> =>
        this.statsService.snapshotYesterdayForAllUsers(),
    );

    this.queue.on('failed', (job, error) => {
      this.logger.error(
        `Stats snapshot job failed (${job?.id}): ${error.message}`,
        error.stack,
      );
    });

    await this.queue.add(
      SNAPSHOT_YESTERDAY_JOB,
      {},
      {
        jobId: `${SNAPSHOT_YESTERDAY_JOB}:repeat`,
        repeat: {
          cron: '10 0 * * *',
          tz: 'UTC',
        },
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 60_000,
        },
        removeOnComplete: 10,
        removeOnFail: 50,
      },
    );

    this.logger.log('Daily stats snapshot queue registered');
  }

  async onModuleDestroy(): Promise<void> {
    await this.queue?.close();
  }
}
