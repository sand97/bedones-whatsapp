import { Process, Processor } from '@nestjs/bull';
import { Injectable, Logger } from '@nestjs/common';
import type { Job } from 'bull';

import {
  IMAGE_INDEXING_QUEUE_NAME,
  IMAGE_INDEXING_SYNC_JOB,
} from './image-indexing.constants';
import { ProductImageIndexingService } from './product-image-indexing.service';

@Processor(IMAGE_INDEXING_QUEUE_NAME)
@Injectable()
export class ImageIndexingProcessor {
  private readonly logger = new Logger(ImageIndexingProcessor.name);

  constructor(
    private readonly productImageIndexingService: ProductImageIndexingService,
  ) {}

  @Process(IMAGE_INDEXING_SYNC_JOB)
  async handleCatalogImageSync(job: Job): Promise<void> {
    this.logger.log('Starting catalog image indexing job');

    const result = await this.productImageIndexingService.syncCatalogProducts(job);

    if (!result.success) {
      throw new Error(result.message);
    }
  }
}
