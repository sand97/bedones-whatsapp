import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import {
  AutoProcessor,
  CLIPVisionModelWithProjection,
  RawImage,
} from '@xenova/transformers';

@Injectable()
export class ImageEmbeddingsService implements OnModuleInit {
  private readonly logger = new Logger(ImageEmbeddingsService.name);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private processor: any = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private visionModel: any = null;
  private isInitialized = false;

  async onModuleInit() {
    this.logger.log('Initializing CLIP model for image embeddings...');

    // Try to load CLIP model asynchronously (don't block startup)
    this.loadModelAsync();
  }

  private async loadModelAsync() {
    try {
      // Load CLIP model (this will download on first use, ~350MB)
      const modelName = 'Xenova/clip-vit-base-patch16';
      this.logger.log(`Loading CLIP model: ${modelName}...`);

      // Load processor and vision model
      this.processor = await AutoProcessor.from_pretrained(modelName);
      this.visionModel =
        await CLIPVisionModelWithProjection.from_pretrained(modelName);

      this.isInitialized = true;
      this.logger.log('✅ CLIP model loaded successfully');
    } catch (error: any) {
      this.logger.error(`Failed to load CLIP model: ${error.message}`);
      this.logger.warn(
        '⚠️  Image vector search will be DISABLED. OCR search will still work.',
      );
      this.logger.warn(
        'To fix: Check internet connection and HuggingFace availability',
      );
    }
  }

  /**
   * Generate embedding vector for an image
   * @param imageBuffer Image buffer to generate embedding for
   * @returns Embedding vector (512 dimensions for CLIP)
   */
  async generateEmbedding(imageBuffer: Buffer): Promise<number[]> {
    if (!this.isInitialized || !this.processor || !this.visionModel) {
      throw new Error(
        'CLIP model is not initialized. Please wait for the model to load.',
      );
    }

    let tempFilePath: string | null = null;

    try {
      this.logger.log('Generating image embedding with CLIP...');

      // Save buffer to temporary file
      const mimeType = this.detectMimeType(imageBuffer);
      const ext = mimeType.split('/')[1] || 'jpg';
      tempFilePath = path.join(
        os.tmpdir(),
        `clip-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${ext}`,
      );

      fs.writeFileSync(tempFilePath, imageBuffer);

      // Read image from file
      const image = await RawImage.read(tempFilePath);

      // Process image
      const imageInputs = await this.processor(image);

      // Generate embeddings
      const { image_embeds } = await this.visionModel(imageInputs);

      // Convert tensor to array
      const embedding = Array.from(image_embeds.data) as number[];

      this.logger.log(
        `Generated embedding with ${embedding.length} dimensions`,
      );

      return embedding;
    } catch (error: any) {
      this.logger.error('Failed to generate image embedding:', error);
      this.logger.error('Error stack:', error.stack);
      throw new Error(`Embedding generation failed: ${error.message}`);
    } finally {
      // Clean up temporary file
      if (tempFilePath && fs.existsSync(tempFilePath)) {
        try {
          fs.unlinkSync(tempFilePath);
        } catch (err) {
          this.logger.warn(`Failed to delete temp file: ${tempFilePath}`);
        }
      }
    }
  }

  /**
   * Detect MIME type from image buffer
   */
  private detectMimeType(buffer: Buffer): string {
    // Check magic numbers
    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
      return 'image/jpeg';
    }
    if (
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47
    ) {
      return 'image/png';
    }
    if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) {
      return 'image/gif';
    }
    if (
      buffer[0] === 0x52 &&
      buffer[1] === 0x49 &&
      buffer[2] === 0x46 &&
      buffer[3] === 0x46
    ) {
      return 'image/webp';
    }

    // Default to JPEG
    return 'image/jpeg';
  }

  /**
   * Check if the service is ready to generate embeddings
   */
  isReady(): boolean {
    return (
      this.isInitialized &&
      this.processor !== null &&
      this.visionModel !== null
    );
  }
}
