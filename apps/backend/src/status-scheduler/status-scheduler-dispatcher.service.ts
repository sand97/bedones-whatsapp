import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';

import { StatusSchedulerService } from './status-scheduler.service';

const DEFAULT_DISPATCH_INTERVAL_MS = 30_000;
const DEFAULT_BATCH_SIZE = 10;

@Injectable()
export class StatusSchedulerDispatcherService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(StatusSchedulerDispatcherService.name);
  private timer?: NodeJS.Timeout;
  private isRunning = false;

  constructor(
    private readonly statusSchedulerService: StatusSchedulerService,
  ) {}

  onModuleInit(): void {
    this.timer = setInterval(() => {
      void this.tick();
    }, DEFAULT_DISPATCH_INTERVAL_MS);

    void this.tick();
  }

  onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  private async tick() {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;

    try {
      const result =
        await this.statusSchedulerService.dispatchDueSchedules(
          DEFAULT_BATCH_SIZE,
        );

      if (result.sent > 0 || result.failed > 0) {
        this.logger.log(
          `Status scheduler tick complete: ${result.sent} sent, ${result.failed} failed`,
        );
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown scheduler error';
      this.logger.error(`Status scheduler tick failed: ${message}`);
    } finally {
      this.isRunning = false;
    }
  }
}
