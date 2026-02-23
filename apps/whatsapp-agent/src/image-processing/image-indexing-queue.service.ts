import { BackendClientService } from '@app/backend-client/backend-client.service';
import { InjectQueue } from '@nestjs/bull';
import { Injectable, Logger } from '@nestjs/common';
import type { Queue } from 'bull';

import {
  IMAGE_INDEXING_QUEUE_NAME,
  IMAGE_INDEXING_SYNC_JOB,
} from './image-indexing.constants';

@Injectable()
export class ImageIndexingQueueService {
  private readonly logger = new Logger(ImageIndexingQueueService.name);

  constructor(
    @InjectQueue(IMAGE_INDEXING_QUEUE_NAME)
    private readonly imageIndexingQueue: Queue,
    private readonly backendClient: BackendClientService,
  ) {}

  async enqueueCatalogImageSync(): Promise<{
    queued: boolean;
    message: string;
  }> {
    const jobs = await this.imageIndexingQueue.getJobs([
      'waiting',
      'active',
      'delayed',
    ]);

    const hasRunningJob = jobs.some((job) => job.name === IMAGE_INDEXING_SYNC_JOB);

    if (hasRunningJob) {
      return {
        queued: false,
        message: 'Image sync job already running',
      };
    }

    await this.backendClient.updateAgentImageSyncStatus({ status: 'SYNCING' });

    await this.imageIndexingQueue.add(
      IMAGE_INDEXING_SYNC_JOB,
      {},
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: true,
        removeOnFail: false,
      },
    );

    this.logger.log('Queued catalog image indexing job');

    return {
      queued: true,
      message: 'Image sync job queued',
    };
  }

  async markCatalogImageSyncFailed(error: string) {
    await this.backendClient.updateAgentImageSyncStatus({
      status: 'FAILED',
      error,
    });
  }
}
