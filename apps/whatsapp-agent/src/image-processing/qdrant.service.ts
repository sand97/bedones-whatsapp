import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { QdrantClient } from '@qdrant/js-client-rest';

@Injectable()
export class QdrantService implements OnModuleInit {
  private readonly logger = new Logger(QdrantService.name);
  private client: QdrantClient;
  private collectionName: string;

  constructor(private readonly configService: ConfigService) {
    const url = this.configService.get<string>('QDRANT_API_URL');
    const apiKey = this.configService.get<string>('QDRANT_API_KEY');

    if (!url) {
      this.logger.warn(
        'QDRANT_API_URL not configured. Qdrant features will be disabled.',
      );
    } else if (!apiKey) {
      this.logger.log(
        'QDRANT_API_KEY not configured. Connecting to Qdrant without an API key.',
      );
    }

    const clientOptions: { url: string; apiKey?: string } = {
      url: url || '',
    };
    if (apiKey) {
      clientOptions.apiKey = apiKey;
    }

    this.client = new QdrantClient(clientOptions);

    this.collectionName =
      this.configService.get<string>('QDRANT_COLLECTION_NAME') ||
      'product-images';
  }

  async onModuleInit() {
    if (!this.isConfigured()) {
      return;
    }

    try {
      const collections = await this.client.getCollections();
      this.logger.log(
        `Qdrant connected. Collections: ${collections.collections.map((c) => c.name).join(', ')}`,
      );
    } catch (error) {
      this.logger.error('Failed to connect to Qdrant:', error);
    }
  }

  isConfigured(): boolean {
    return !!this.configService.get<string>('QDRANT_API_URL');
  }

  /**
   * Create a collection for storing image embeddings
   * @param collectionName Name of the collection (default: from env)
   * @param vectorSize Size of the embedding vectors (CLIP = 512)
   */
  async createCollection(
    collectionName?: string,
    vectorSize = 512,
  ): Promise<void> {
    if (!this.isConfigured()) {
      throw new Error('Qdrant is not configured');
    }

    const name = collectionName || this.collectionName;

    try {
      // Check if collection exists
      const collections = await this.client.getCollections();
      const exists = collections.collections.some((c) => c.name === name);

      if (exists) {
        this.logger.warn(`Collection "${name}" already exists`);
        return;
      }

      // Create collection
      await this.client.createCollection(name, {
        vectors: {
          size: vectorSize,
          distance: 'Cosine',
        },
      });

      this.logger.log(
        `Created Qdrant collection "${name}" with vector size ${vectorSize}`,
      );
    } catch (error) {
      this.logger.error(`Failed to create collection "${name}":`, error);
      throw error;
    }
  }

  /**
   * Delete a collection
   * @param collectionName Name of the collection to delete
   */
  async deleteCollection(collectionName?: string): Promise<void> {
    if (!this.isConfigured()) {
      throw new Error('Qdrant is not configured');
    }

    const name = collectionName || this.collectionName;

    try {
      await this.client.deleteCollection(name);
      this.logger.log(`Deleted Qdrant collection "${name}"`);
    } catch (error) {
      this.logger.error(`Failed to delete collection "${name}":`, error);
      throw error;
    }
  }

  /**
   * Index an image embedding in Qdrant
   * @param productId Product ID (used as point ID - must be number or UUID string)
   * @param embedding Image embedding vector
   * @param metadata Additional metadata to store
   */
  async indexImage(
    productId: number | string,
    embedding: number[],
    metadata: Record<string, unknown> = {},
  ): Promise<void> {
    if (!this.isConfigured()) {
      throw new Error('Qdrant is not configured');
    }

    try {
      await this.client.upsert(this.collectionName, {
        wait: true,
        points: [
          {
            id: productId,
            vector: embedding,
            payload: {
              product_id: productId,
              ...metadata,
              indexed_at: new Date().toISOString(),
            },
          },
        ],
      });

      this.logger.log(`Indexed product "${productId}" in Qdrant`);
    } catch (error) {
      this.logger.error(`Failed to index product "${productId}":`, error);
      throw error;
    }
  }

  /**
   * Search for similar images using an embedding
   * @param embedding Query embedding vector
   * @param limit Number of results to return
   * @param scoreThreshold Minimum similarity score (0-1)
   * @returns Array of similar products with scores
   */
  async searchSimilar(
    embedding: number[],
    limit = 5,
    scoreThreshold = 0.7,
  ): Promise<
    Array<{
      productId: string;
      score: number;
      metadata: Record<string, unknown>;
    }>
  > {
    if (!this.isConfigured()) {
      throw new Error('Qdrant is not configured');
    }

    try {
      const searchResult = await this.client.search(this.collectionName, {
        vector: embedding,
        limit,
        with_payload: true,
        score_threshold: scoreThreshold,
      });

      const results = searchResult.map((hit) => ({
        productId: hit.id as string,
        score: hit.score,
        metadata: (hit.payload || {}) as Record<string, unknown>,
      }));

      this.logger.log(
        `Found ${results.length} similar images (threshold: ${scoreThreshold})`,
      );

      return results;
    } catch (error) {
      this.logger.error('Failed to search similar images:', error);
      throw error;
    }
  }

  /**
   * Get collection info
   */
  async getCollectionInfo(collectionName?: string) {
    if (!this.isConfigured()) {
      throw new Error('Qdrant is not configured');
    }

    const name = collectionName || this.collectionName;

    try {
      const info = await this.client.getCollection(name);
      return info;
    } catch (error) {
      this.logger.error(`Failed to get collection info for "${name}":`, error);
      throw error;
    }
  }
}
