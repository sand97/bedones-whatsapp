import { BackendClientModule } from '@app/backend-client/backend-client.module';
import { CatalogModule } from '@app/catalog/catalog.module';
import { BullModule } from '@nestjs/bull';
import { Module, forwardRef } from '@nestjs/common';

import { SecurityModule } from '../security/security.module';

import { ImageEmbeddingsService } from './image-embeddings.service';
import { ImageIndexingProcessor } from './image-indexing.processor';
import { ImageIndexingQueueService } from './image-indexing-queue.service';
import { IMAGE_INDEXING_QUEUE_NAME } from './image-indexing.constants';
import { ImageProcessingController } from './image-processing.controller';
import { ImageProcessingInternalController } from './image-processing-internal.controller';
import { GeminiVisionService } from './gemini-vision.service';
import { OcrService } from './ocr.service';
import { ProductImageIndexingService } from './product-image-indexing.service';
import { QdrantService } from './qdrant.service';
import { SmartCropService } from './smart-crop.service';

@Module({
  imports: [
    BackendClientModule,
    forwardRef(() => CatalogModule),
    SecurityModule,
    BullModule.registerQueue({
      name: IMAGE_INDEXING_QUEUE_NAME,
    }),
  ],
  controllers: [ImageProcessingController, ImageProcessingInternalController],
  providers: [
    OcrService,
    QdrantService,
    ImageEmbeddingsService,
    SmartCropService,
    GeminiVisionService,
    ProductImageIndexingService,
    ImageIndexingQueueService,
    ImageIndexingProcessor,
  ],
  exports: [
    OcrService,
    QdrantService,
    ImageEmbeddingsService,
    SmartCropService,
    GeminiVisionService,
    ProductImageIndexingService,
    ImageIndexingQueueService,
  ],
})
export class ImageProcessingModule {}
