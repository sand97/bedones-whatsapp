import { BackendClientModule } from '@app/backend-client/backend-client.module';
import { Module } from '@nestjs/common';

import { ImageEmbeddingsService } from './image-embeddings.service';
import { ImageProcessingController } from './image-processing.controller';
import { OcrService } from './ocr.service';
import { QdrantService } from './qdrant.service';
import { SmartCropService } from './smart-crop.service';

@Module({
  imports: [BackendClientModule],
  controllers: [ImageProcessingController],
  providers: [
    OcrService,
    QdrantService,
    ImageEmbeddingsService,
    SmartCropService,
  ],
  exports: [OcrService, QdrantService, ImageEmbeddingsService, SmartCropService],
})
export class ImageProcessingModule {}
