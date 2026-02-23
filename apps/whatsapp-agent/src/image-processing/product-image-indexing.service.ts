import { BackendClientService } from '@app/backend-client/backend-client.service';
import {
  InternalProductForImageIndexing,
  InternalProductImageIndexingUpdate,
} from '@app/backend-client/backend-api.types';
import { EmbeddingsService } from '@app/catalog/embeddings.service';
import { PromptGeneratorService } from '@app/catalog/prompt-generator.service';
import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import type { Job } from 'bull';

import { GeminiVisionService } from './gemini-vision.service';
import { ImageEmbeddingsService } from './image-embeddings.service';
import { QdrantService } from './qdrant.service';

interface IndexProductPayload {
  productId: string;
  productName: string;
  description?: string | null;
  retailerId?: string | null;
  price?: number | null;
  category?: string | null;
  imageBuffer: Buffer;
}

interface ProductIndexingPlan {
  shouldIndexImage: boolean;
  shouldIndexText: boolean;
  shouldGenerateCoverDescription: boolean;
}

interface ProductIndexingResult {
  indexedImage: boolean;
  indexedText: boolean;
  coverDescriptionToPersist?: string;
}

@Injectable()
export class ProductImageIndexingService {
  private readonly logger = new Logger(ProductImageIndexingService.name);
  private static readonly IMAGE_DOWNLOAD_TIMEOUT_MS = 30000;

  constructor(
    private readonly imageEmbeddingsService: ImageEmbeddingsService,
    private readonly geminiVisionService: GeminiVisionService,
    private readonly textEmbeddingsService: EmbeddingsService,
    private readonly qdrantService: QdrantService,
    private readonly backendClient: BackendClientService,
    private readonly promptGeneratorService: PromptGeneratorService,
  ) {}

  async indexProductFromBase64(payload: {
    productId: string;
    productName: string;
    description?: string;
    retailerId?: string;
    price?: number;
    category?: string;
    imageBuffer: string;
  }) {
    const imageBuffer = Buffer.from(payload.imageBuffer, 'base64');

    const indexed = await this.indexProductFromBuffer({
      productId: payload.productId,
      productName: payload.productName,
      description: payload.description,
      retailerId: payload.retailerId,
      price: payload.price,
      category: payload.category,
      imageBuffer,
    });

    await this.backendClient.batchUpdateProductImageIndexing([
      {
        productId: payload.productId,
        coverImageDescription: indexed.coverDescription,
        indexDescriptionAt: new Date().toISOString(),
        indexImageAt: new Date().toISOString(),
      },
    ]);

    return {
      success: true,
      coverDescription: indexed.coverDescription,
    };
  }

  async syncCatalogProducts(job?: Job): Promise<{
    success: boolean;
    total: number;
    processed: number;
    failed: number;
    message: string;
  }> {
    // Refresh agent snapshot once at sync start, then reuse cached values.
    await this.backendClient.getAgentSnapshot(true);

    if (!this.imageEmbeddingsService.isReady()) {
      const message = 'Image embeddings service is not ready';
      await this.backendClient.updateAgentImageSyncStatus({
        status: 'FAILED',
        error: message,
      });

      throw new Error(message);
    }

    await this.backendClient.updateAgentImageSyncStatus({ status: 'SYNCING' });

    const products = await this.backendClient.getProductsForImageIndexing();

    if (products.length === 0) {
      await this.backendClient.updateAgentImageSyncStatus({ status: 'DONE' });
      return {
        success: true,
        total: 0,
        processed: 0,
        failed: 0,
        message: 'No products to index',
      };
    }

    const plannedProducts = products.map((product) => ({
      product,
      plan: this.buildIndexingPlan(product),
    }));

    const shouldGeneratePrompt = plannedProducts.some(
      ({ plan }) => plan.shouldGenerateCoverDescription,
    );

    if (shouldGeneratePrompt) {
      await this.promptGeneratorService.ensureCustomPrompt();
    }

    let processed = 0;
    let failed = 0;
    let skipped = 0;
    const backendUpdates: InternalProductImageIndexingUpdate[] = [];

    for (let index = 0; index < plannedProducts.length; index++) {
      const { product, plan } = plannedProducts[index];

      if (!plan.shouldIndexImage && !plan.shouldIndexText) {
        skipped += 1;
        if (job) {
          job.progress(Math.round(((index + 1) / plannedProducts.length) * 100));
        }
        continue;
      }

      try {
        const result = await this.indexCatalogProduct(product, plan);
        processed += 1;

        const update = this.buildBackendUpdate(product.id, result);
        if (update) {
          backendUpdates.push(update);
        }
      } catch (error: any) {
        failed += 1;
        this.logger.warn(
          `Failed to index product ${product.id}: ${error?.message || error}`,
        );
      }

      if (job) {
        job.progress(Math.round(((index + 1) / plannedProducts.length) * 100));
      }
    }

    if (backendUpdates.length > 0) {
      await this.backendClient.batchUpdateProductImageIndexing(backendUpdates);
    }

    if (failed > 0) {
      const message = `${failed} products failed during image indexing`;
      await this.backendClient.updateAgentImageSyncStatus({
        status: 'FAILED',
        error: message,
      });

      return {
        success: false,
        total: products.length,
        processed,
        failed,
        message,
      };
    }

    await this.backendClient.updateAgentImageSyncStatus({ status: 'DONE' });

    return {
      success: true,
      total: products.length,
      processed,
      failed,
      message: `Image indexing completed (${skipped} skipped, already up-to-date)`,
    };
  }

  private buildIndexingPlan(
    product: InternalProductForImageIndexing,
  ): ProductIndexingPlan {
    const productUpdatedAt = this.parseDate(product.updatedAt);
    const coverImageCreatedAt = this.parseDate(product.coverImageCreatedAt);

    const imageReferenceDate = this.maxDate(productUpdatedAt, coverImageCreatedAt);
    const textReferenceDate = this.maxDate(productUpdatedAt, coverImageCreatedAt);

    const lastImageIndexAt = this.parseDate(product.indexImageAt);
    const lastTextIndexAt = this.parseDate(product.indexDescriptionAt);

    const shouldIndexImage =
      !lastImageIndexAt ||
      (imageReferenceDate !== null && lastImageIndexAt < imageReferenceDate);

    const shouldIndexText =
      !lastTextIndexAt ||
      (textReferenceDate !== null && lastTextIndexAt < textReferenceDate);

    const hasCoverDescription = !!product.coverImageDescription?.trim();

    return {
      shouldIndexImage,
      shouldIndexText,
      shouldGenerateCoverDescription: shouldIndexText && !hasCoverDescription,
    };
  }

  private async indexCatalogProduct(
    product: InternalProductForImageIndexing,
    plan: ProductIndexingPlan,
  ): Promise<ProductIndexingResult> {
    const needsImageBuffer =
      plan.shouldIndexImage || plan.shouldGenerateCoverDescription;

    let imageBuffer: Buffer | null = null;

    if (needsImageBuffer) {
      if (!product.coverImageUrl) {
        if (plan.shouldIndexImage) {
          throw new Error('Missing cover image url for image indexing');
        }
      } else {
        imageBuffer = await this.downloadImage(product.coverImageUrl);
      }
    }

    let indexedImage = false;

    if (plan.shouldIndexImage) {
      if (!imageBuffer) {
        throw new Error('Unable to build image embedding without cover image');
      }

      const clipEmbedding =
        await this.imageEmbeddingsService.generateEmbedding(imageBuffer);

      await this.qdrantService.indexProductImage(product.id, clipEmbedding, {
        product_id: product.id,
        product_name: product.name,
        retailer_id: product.retailer_id || null,
        description: product.description || null,
        category: product.category || null,
        price: product.price || null,
      });

      indexedImage = true;
    }

    let coverDescription = product.coverImageDescription?.trim() || '';
    let generatedCoverDescription: string | undefined;

    if (plan.shouldGenerateCoverDescription && imageBuffer) {
      coverDescription =
        await this.geminiVisionService.describeProductImage(imageBuffer);
      generatedCoverDescription = coverDescription;
    } else if (plan.shouldGenerateCoverDescription) {
      this.logger.warn(
        `Cover description generation skipped for product ${product.id}: missing cover image`,
      );
    }

    let indexedText = false;

    if (plan.shouldIndexText) {
      const textToEmbed = [
        product.name,
        product.description || '',
        coverDescription,
      ]
        .filter(Boolean)
        .join(' | ');

      const textEmbedding = await this.textEmbeddingsService.embedText(textToEmbed);

      await this.qdrantService.indexProductText(product.id, textEmbedding, {
        product_id: product.id,
        product_name: product.name,
        description: product.description || null,
        cover_image_description: coverDescription || null,
        retailer_id: product.retailer_id || null,
        category: product.category || null,
        price: product.price || null,
      });

      indexedText = true;
    }

    return {
      indexedImage,
      indexedText,
      coverDescriptionToPersist: generatedCoverDescription,
    };
  }

  private buildBackendUpdate(
    productId: string,
    result: ProductIndexingResult,
  ): InternalProductImageIndexingUpdate | null {
    const update: InternalProductImageIndexingUpdate = { productId };

    if (result.coverDescriptionToPersist !== undefined) {
      update.coverImageDescription = result.coverDescriptionToPersist;
    }

    if (result.indexedText) {
      update.indexDescriptionAt = new Date().toISOString();
    }

    if (result.indexedImage) {
      update.indexImageAt = new Date().toISOString();
    }

    if (Object.keys(update).length === 1) {
      return null;
    }

    return update;
  }

  private async indexProductFromBuffer(payload: IndexProductPayload): Promise<{
    coverDescription: string;
  }> {
    const [clipEmbedding, coverDescription] = await Promise.all([
      this.imageEmbeddingsService.generateEmbedding(payload.imageBuffer),
      this.geminiVisionService.describeProductImage(payload.imageBuffer),
    ]);

    const textToEmbed = [
      payload.productName,
      payload.description || '',
      coverDescription,
    ]
      .filter(Boolean)
      .join(' | ');

    const textEmbedding = await this.textEmbeddingsService.embedText(textToEmbed);

    await Promise.all([
      this.qdrantService.indexProductImage(payload.productId, clipEmbedding, {
        product_id: payload.productId,
        product_name: payload.productName,
        retailer_id: payload.retailerId || null,
        description: payload.description || null,
        category: payload.category || null,
        price: payload.price || null,
      }),
      this.qdrantService.indexProductText(payload.productId, textEmbedding, {
        product_id: payload.productId,
        product_name: payload.productName,
        description: payload.description || null,
        cover_image_description: coverDescription,
        retailer_id: payload.retailerId || null,
        category: payload.category || null,
        price: payload.price || null,
      }),
    ]);

    return { coverDescription };
  }

  private async downloadImage(url: string): Promise<Buffer> {
    const response = await axios.get<ArrayBuffer>(url, {
      responseType: 'arraybuffer',
      timeout: ProductImageIndexingService.IMAGE_DOWNLOAD_TIMEOUT_MS,
    });

    return Buffer.from(response.data);
  }

  private parseDate(value?: string | null): Date | null {
    if (!value) {
      return null;
    }

    const parsedDate = new Date(value);
    if (Number.isNaN(parsedDate.getTime())) {
      return null;
    }

    return parsedDate;
  }

  private maxDate(first: Date | null, second: Date | null): Date | null {
    if (!first) {
      return second;
    }

    if (!second) {
      return first;
    }

    return first > second ? first : second;
  }
}
