import { BackendClientModule } from '@app/backend-client/backend-client.module';
import { CatalogSharedModule } from '@app/catalog-shared/catalog-shared.module';
import { BullModule } from '@nestjs/bull';
import { Module } from '@nestjs/common';

import { SecurityModule } from '../security/security.module';

import { ImageIndexingQueueService } from './image-indexing-queue.service';
import { IMAGE_INDEXING_QUEUE_NAME } from './image-indexing.constants';
import { ImageIndexingProcessor } from './image-indexing.processor';
import { ImageProcessingInternalController } from './image-processing-internal.controller';
import { ImageProcessingModule } from './image-processing.module';
import { ProductImageIndexingService } from './product-image-indexing.service';

@Module({
  imports: [
    BackendClientModule,
    CatalogSharedModule,
    ImageProcessingModule,
    SecurityModule,
    BullModule.registerQueue({
      name: IMAGE_INDEXING_QUEUE_NAME,
    }),
  ],
  controllers: [ImageProcessingInternalController],
  providers: [
    ProductImageIndexingService,
    ImageIndexingQueueService,
    ImageIndexingProcessor,
  ],
  exports: [ProductImageIndexingService, ImageIndexingQueueService],
})
export class ImageIndexingModule {}
