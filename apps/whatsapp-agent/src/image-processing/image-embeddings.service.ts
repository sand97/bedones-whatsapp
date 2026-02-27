import { EmbeddingsService } from '@app/catalog-shared/embeddings.service';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

import { GeminiVisionService } from './gemini-vision.service';

/**
 * Generate image embeddings using Gemini Vision descriptions + Gemini text embeddings.
 */
@Injectable()
export class ImageEmbeddingsService implements OnModuleInit {
  private readonly logger = new Logger(ImageEmbeddingsService.name);

  constructor(
    private readonly geminiVisionService: GeminiVisionService,
    private readonly embeddingsService: EmbeddingsService,
  ) {}

  onModuleInit() {
    if (this.isReady()) {
      this.logger.log(
        '✅ Image embeddings enabled (Gemini Vision + text embedding model)',
      );
      return;
    }

    this.logger.warn(
      '⚠️ Image embeddings unavailable (missing GEMINI_API_KEY)',
    );
  }

  async generateEmbedding(imageBuffer: Buffer): Promise<number[]> {
    const description =
      await this.geminiVisionService.describeProductImage(imageBuffer);
    return this.embeddingsService.embedText(description);
  }

  isReady(): boolean {
    return this.embeddingsService.isAvailable();
  }
}
