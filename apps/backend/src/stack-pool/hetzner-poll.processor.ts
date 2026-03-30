import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import type { Job } from 'bull';

import { HETZNER_POLL_JOB, HETZNER_POLL_QUEUE } from './hetzner-poll.constants';
import { StackPoolService } from './stack-pool.service';

@Processor(HETZNER_POLL_QUEUE)
export class HetznerPollProcessor {
  private readonly logger = new Logger(HetznerPollProcessor.name);

  constructor(private readonly stackPoolService: StackPoolService) {}

  @Process(HETZNER_POLL_JOB)
  async handlePollJob(_job: Job): Promise<void> {
    this.logger.debug('Processing Hetzner poll job');
    await this.stackPoolService.processPendingHetznerInitializations();
  }
}
