import * as crypto from 'crypto';

import { ConnectorClientService } from '@app/connector/connector-client.service';
import { Prisma } from '@app/generated/client';
import { ImageIndexingQueueService } from '@app/image-processing/image-indexing-queue.service';
import { PageScriptService } from '@app/page-scripts/page-script.service';
import { PrismaService } from '@app/prisma/prisma.service';
import { normalizeWhatsAppPrice } from '@apps/common';
import { Inject, Injectable, Logger, forwardRef } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

import { EmbeddingsService } from './embeddings.service';

interface WhatsAppProduct {
  id: string;
  name: string;
  description?: string;
  price?: number | null;
  currency?: string;
  availability?: string;
  retailerId?: string;
  maxAvailable?: number;
  imageHashesForWhatsapp?: string[];
  collectionId?: string;
  collectionName?: string;
}

interface CatalogSignature {
  quickHash: string; // Hash des IDs seulement
  fullHash: string; // Hash complet avec metadata
  productsCount: number;
  lastSyncedAt: Date;
}

/**
 * Service for syncing WhatsApp catalog to local DB with embeddings
 * Runs in background after connector is ready
 */
@Injectable()
export class CatalogSyncService {
  private readonly logger = new Logger(CatalogSyncService.name);
  private isSyncing = false;
  private lastSyncTime: Date | null = null;

  constructor(
    private readonly connectorClient: ConnectorClientService,
    private readonly prisma: PrismaService,
    private readonly embeddings: EmbeddingsService,
    private readonly scriptService: PageScriptService,
    @Inject(forwardRef(() => ImageIndexingQueueService))
    private readonly imageIndexingQueueService: ImageIndexingQueueService,
  ) {}

  /**
   * Check if connector is authenticated
   */
  private async checkAuthentication(): Promise<boolean> {
    try {
      const script = this.scriptService.getScript('isAuthenticated', {});
      const { result } = await this.connectorClient.executeScript(script);
      console.log('result', result);

      if (result.success && result.isAuthenticated) {
        return true;
      }

      this.logger.warn('Connector is not authenticated');
      return false;
    } catch (error) {
      this.logger.error(
        `Failed to check authentication: ${error.message}`,
        error.stack,
      );
      return false;
    }
  }

  /**
   * Generate catalog signature (two-level hash for optimization)
   * - quickHash: Hash of product IDs only (fast, detects add/remove)
   * - fullHash: Hash of full metadata (detects price/description changes)
   */
  private generateCatalogSignature(
    products: WhatsAppProduct[],
  ): CatalogSignature {
    // Sort products by ID for deterministic hashing
    const sortedProducts = [...products].sort((a, b) =>
      a.id.localeCompare(b.id),
    );

    // Quick hash: IDs only (ultra fast)
    const sortedIds = sortedProducts.map((p) => p.id).join(',');
    const quickHash = crypto
      .createHash('sha256')
      .update(sortedIds)
      .digest('hex');

    // Full hash: Complete metadata (detects all changes)
    const catalogData = sortedProducts
      .map((p) => ({
        id: p.id,
        name: p.name,
        price: p.price,
        availability: p.availability,
        imageHashes: p.imageHashesForWhatsapp?.join(',') || '',
        collectionId: p.collectionId,
      }))
      .map((p) => JSON.stringify(p))
      .join('|');

    const fullHash = crypto
      .createHash('sha256')
      .update(catalogData)
      .digest('hex');

    return {
      quickHash,
      fullHash,
      productsCount: products.length,
      lastSyncedAt: new Date(),
    };
  }

  /**
   * Scheduled catalog sync every 4 hours using cron
   * Runs at minute 0 of every 4th hour (00:00, 04:00, 08:00, etc.)
   */
  @Cron(CronExpression.EVERY_4_HOURS)
  async handleScheduledSync() {
    try {
      await this.syncCatalog();
    } catch (error) {
      this.logger.error(`Scheduled sync failed: ${error.message}`);
    }
  }

  /**
   * Manually trigger catalog sync (e.g., from dashboard or webhook)
   */
  async triggerManualSync(): Promise<{ success: boolean; message: string }> {
    if (this.isSyncing) {
      return {
        success: false,
        message: 'Sync already in progress',
      };
    }

    try {
      await this.syncCatalog();
      return {
        success: true,
        message: `Synced at ${this.lastSyncTime?.toISOString()}`,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  /**
   * Trigger catalog sync in background and return immediately.
   * Used by backend internal orchestration endpoints.
   */
  triggerManualSyncInBackground(): {
    success: boolean;
    message: string;
    imageSyncQueued: boolean;
  } {
    if (this.isSyncing) {
      return {
        success: false,
        message: 'Sync already in progress',
        imageSyncQueued: false,
      };
    }

    void this.syncCatalogAndQueueImages().catch(async (error: any) => {
      const errorMessage = error?.message || String(error);
      this.logger.error(
        `Background catalog+image sync failed: ${errorMessage}`,
      );

      await this.imageIndexingQueueService
        .markCatalogImageSyncFailed(errorMessage)
        .catch(() => undefined);
    });

    return {
      success: true,
      message: 'Catalog and image indexing pipeline started in background',
      imageSyncQueued: true,
    };
  }

  private async syncCatalogAndQueueImages(): Promise<void> {
    await this.syncCatalog();
    const queueResult = await this.imageIndexingQueueService.enqueueCatalogImageSync();

    if (!queueResult.queued) {
      this.logger.warn(`Image indexing queue skipped: ${queueResult.message}`);
    }
  }

  /**
   * Get sync status
   */
  getSyncStatus() {
    return {
      isSyncing: this.isSyncing,
      lastSyncTime: this.lastSyncTime,
      embeddingsAvailable: this.embeddings.isAvailable(),
    };
  }

  /**
   * Main sync function - runs in background
   * Optimized with authentication check and signature comparison
   */
  private async syncCatalog(): Promise<void> {
    if (this.isSyncing) {
      this.logger.debug('Sync already in progress, skipping');
      return;
    }

    this.isSyncing = true;
    const startTime = Date.now();

    try {
      this.logger.log('🔄 Starting catalog sync...');

      // Step 1: Verify authentication
      const isAuthenticated = await this.checkAuthentication();
      if (!isAuthenticated) {
        this.logger.warn('⚠️ Connector not authenticated, skipping sync');
        return;
      }

      // Step 2: Fetch all products from WhatsApp via connector
      const products = await this.fetchProductsFromWhatsApp();
      this.logger.log(`📦 Fetched ${products.length} products from WhatsApp`);

      if (products.length === 0) {
        this.logger.warn('No products found in WhatsApp catalog');
        return;
      }

      // Step 3: Generate signature
      const newSignature = this.generateCatalogSignature(products);
      this.logger.debug(
        `Generated signature: quickHash=${newSignature.quickHash.substring(0, 8)}..., fullHash=${newSignature.fullHash.substring(0, 8)}...`,
      );

      // Step 4: Compare with previous signature
      const lastSync = await this.prisma.catalogSyncMetadata.findUnique({
        where: { id: 'singleton' },
      });

      if (lastSync) {
        // Quick check first (fast)
        if (lastSync.quickHash === newSignature.quickHash) {
          // IDs haven't changed, check full hash
          if (lastSync.fullHash === newSignature.fullHash) {
            this.logger.log(
              '✅ Catalog unchanged (identical signature), skipping sync',
            );
            return;
          } else {
            this.logger.log(
              '🔄 Catalog metadata changed (prices, descriptions, images)',
            );
          }
        } else {
          this.logger.log(
            '🔄 Catalog structure changed (products added/removed)',
          );
        }
      } else {
        this.logger.log('🆕 First sync - no previous signature found');
      }

      // Step 5: Sync needed - Generate embeddings and store
      if (this.embeddings.isAvailable()) {
        await this.generateAndStoreEmbeddings(products);
      } else {
        await this.storeProductsWithoutEmbeddings(products);
      }

      // Step 6: Save new signature
      await this.prisma.catalogSyncMetadata.upsert({
        where: { id: 'singleton' },
        create: {
          id: 'singleton',
          quickHash: newSignature.quickHash,
          fullHash: newSignature.fullHash,
          productsCount: newSignature.productsCount,
          lastSyncedAt: newSignature.lastSyncedAt,
        },
        update: {
          quickHash: newSignature.quickHash,
          fullHash: newSignature.fullHash,
          productsCount: newSignature.productsCount,
          lastSyncedAt: newSignature.lastSyncedAt,
        },
      });

      this.lastSyncTime = new Date();
      const duration = Date.now() - startTime;

      this.logger.log(
        `✅ Catalog sync completed in ${(duration / 1000).toFixed(1)}s`,
      );
    } catch (error) {
      this.logger.error(
        `❌ Catalog sync failed: ${error.message}`,
        error.stack,
      );
      throw error;
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Fetch all products from WhatsApp via connector
   */
  private async fetchProductsFromWhatsApp(): Promise<WhatsAppProduct[]> {
    const script = this.scriptService.getScript(
      'catalog/getAllProductsForSync',
      {},
    );

    const { result: products } =
      await this.connectorClient.executeScript(script);

    return (products || []).map((product: WhatsAppProduct) => ({
      ...product,
      price: normalizeWhatsAppPrice(product.price),
    }));
  }

  /**
   * Generate embeddings and store products in DB
   */
  private async generateAndStoreEmbeddings(
    products: WhatsAppProduct[],
  ): Promise<void> {
    this.logger.log('🧠 Generating embeddings...');

    // Create text representations for embedding
    const texts = products.map((product) => {
      // Combine name, description, and collection for better semantic search
      const parts = [
        product.name,
        product.description || '',
        product.collectionName || '',
      ].filter(Boolean);

      return parts.join(' | ');
    });

    // Generate embeddings in batch (more efficient)
    const embeddings = await this.embeddings.embedBatch(texts);

    this.logger.log(`📊 Generated ${embeddings.length} embeddings`);

    // Store in database with embeddings
    await this.prisma.$transaction(async (tx) => {
      // Delete old products first
      await tx.catalogProduct.deleteMany({});

      // Insert new products with embeddings
      for (let i = 0; i < products.length; i++) {
        const product = products[i];
        const embedding = embeddings[i];

        await tx.catalogProduct.create({
          data: {
            id: product.id,
            name: product.name,
            description: product.description,
            price: product.price,
            currency: product.currency,
            availability: product.availability,
            collectionId: product.collectionId,
            collectionName: product.collectionName,
            retailerId: product.retailerId,
            maxAvailable: product.maxAvailable,
            imageHashes: product.imageHashesForWhatsapp || [],
            embedding: embedding, // Store as JSON array
            lastSyncedAt: new Date(),
          },
        });
      }
    });

    this.logger.log('💾 Stored products with embeddings in database');
  }

  /**
   * Store products without embeddings (fallback)
   */
  private async storeProductsWithoutEmbeddings(
    products: WhatsAppProduct[],
  ): Promise<void> {
    this.logger.log(
      '💾 Storing products without embeddings (GEMINI_API_KEY not configured)',
    );

    await this.prisma.$transaction(async (tx) => {
      // Delete old products first
      await tx.catalogProduct.deleteMany({});

      // Insert new products without embeddings
      for (const product of products) {
        await tx.catalogProduct.create({
          data: {
            id: product.id,
            name: product.name,
            description: product.description,
            price: product.price,
            currency: product.currency,
            availability: product.availability,
            collectionId: product.collectionId,
            collectionName: product.collectionName,
            retailerId: product.retailerId,
            maxAvailable: product.maxAvailable,
            imageHashes: product.imageHashesForWhatsapp || [],
            embedding: Prisma.JsonNull,
            lastSyncedAt: new Date(),
          },
        });
      }
    });

    this.logger.log('💾 Stored products in database (text search only)');
  }
}
