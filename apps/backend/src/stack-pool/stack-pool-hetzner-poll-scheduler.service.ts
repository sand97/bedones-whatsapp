import { InjectQueue } from '@nestjs/bull';
import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Queue } from 'bull';

import { HETZNER_POLL_JOB, HETZNER_POLL_QUEUE } from './hetzner-poll.constants';

@Injectable()
export class StackPoolHetznerPollSchedulerService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(
    StackPoolHetznerPollSchedulerService.name,
  );

  constructor(
    private readonly configService: ConfigService,
    @InjectQueue(HETZNER_POLL_QUEUE)
    private readonly hetznerPollQueue: Queue,
  ) {}

  async onModuleInit(): Promise<void> {
    const intervalMs = this.getPollIntervalMs();

    // Clean up any stale repeatable jobs from previous runs
    const existingRepeatables = await this.hetznerPollQueue.getRepeatableJobs();
    for (const job of existingRepeatables) {
      await this.hetznerPollQueue.removeRepeatableByKey(job.key);
    }

    await this.hetznerPollQueue.add(
      HETZNER_POLL_JOB,
      {},
      {
        removeOnComplete: 10,
        removeOnFail: 50,
        repeat: {
          every: intervalMs,
        },
      },
    );

    this.logger.log(
      `Hetzner provisioning polling queue registered (interval=${intervalMs}ms)`,
    );
  }

  async onModuleDestroy(): Promise<void> {
    const repeatables = await this.hetznerPollQueue.getRepeatableJobs();
    for (const job of repeatables) {
      await this.hetznerPollQueue.removeRepeatableByKey(job.key);
    }
  }

  private getPollIntervalMs() {
    const value = this.configService.get<string>(
      'STACK_POOL_HETZNER_POLL_INTERVAL_MS',
      '5000',
    );
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 5000;
  }
}
