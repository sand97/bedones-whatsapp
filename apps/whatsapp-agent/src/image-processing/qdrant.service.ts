import { createHash } from 'crypto';

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { QdrantClient } from '@qdrant/js-client-rest';

type SearchHit = {
  productId: string;
  score: number;
  metadata: Record<string, unknown>;
};

@Injectable()
export class QdrantService implements OnModuleInit {
  private readonly logger = new Logger(QdrantService.name);
  private readonly client: QdrantClient;
  private readonly imageCollectionName: string;
  private readonly textCollectionName: string;
  private readonly imageVectorSize: number;
  private readonly textVectorSize: number;

  constructor(private readonly configService: ConfigService) {
    const url = this.configService.get<string>('QDRANT_API_URL');
    const apiKey = this.configService.get<string>('QDRANT_API_KEY');

    const clientOptions: { url: string; apiKey?: string } = {
      url: url || '',
    };

    if (apiKey) {
      clientOptions.apiKey = apiKey;
    }

    this.client = new QdrantClient(clientOptions);

    this.imageCollectionName =
      this.configService.get<string>('QDRANT_IMAGE_COLLECTION') ||
      this.configService.get<string>('QDRANT_COLLECTION_NAME') ||
      'product-images';

    this.textCollectionName =
      this.configService.get<string>('QDRANT_TEXT_COLLECTION') || 'product-text';

    this.imageVectorSize = Number.parseInt(
      this.configService.get<string>('QDRANT_IMAGE_VECTOR_SIZE', '512'),
      10,
    );

    this.textVectorSize = Number.parseInt(
      this.configService.get<string>('QDRANT_TEXT_VECTOR_SIZE', '768'),
      10,
    );
  }

  async onModuleInit() {
    if (!this.isConfigured()) {
      this.logger.warn(
        'QDRANT_API_URL is not configured. Qdrant features are disabled.',
      );
      return;
    }

    await this.createCollections();
  }

  isConfigured(): boolean {
    return !!this.configService.get<string>('QDRANT_API_URL');
  }

  async createCollections(): Promise<void> {
    if (!this.isConfigured()) {
      return;
    }

    await this.ensureCollection(this.imageCollectionName, this.imageVectorSize);
    await this.ensureCollection(this.textCollectionName, this.textVectorSize);
  }

  async createCollection(collectionName?: string, vectorSize = 512): Promise<void> {
    if (!this.isConfigured()) {
      throw new Error('Qdrant is not configured');
    }

    const name = collectionName || this.imageCollectionName;
    await this.ensureCollection(name, vectorSize);
  }

  async deleteCollection(collectionName?: string): Promise<void> {
    if (!this.isConfigured()) {
      throw new Error('Qdrant is not configured');
    }

    const name = collectionName || this.imageCollectionName;
    await this.client.deleteCollection(name);
  }

  async indexImage(
    productId: number | string,
    embedding: number[],
    metadata: Record<string, unknown> = {},
  ): Promise<void> {
    await this.indexProductImage(String(productId), embedding, metadata);
  }

  async indexProductImage(
    productId: string,
    clipEmbedding: number[],
    metadata: Record<string, unknown> = {},
  ): Promise<void> {
    await this.upsert(this.imageCollectionName, productId, clipEmbedding, {
      product_id: productId,
      ...metadata,
      indexed_at: new Date().toISOString(),
    });
  }

  async indexProductText(
    productId: string,
    textEmbedding: number[],
    metadata: Record<string, unknown> = {},
  ): Promise<void> {
    await this.upsert(this.textCollectionName, productId, textEmbedding, {
      product_id: productId,
      ...metadata,
      indexed_at: new Date().toISOString(),
    });
  }

  async indexProductAcrossCollections(data: {
    productId: string;
    clipEmbedding: number[];
    textEmbedding: number[];
    imagePayload: Record<string, unknown>;
    textPayload: Record<string, unknown>;
  }): Promise<void> {
    await Promise.all([
      this.indexProductImage(data.productId, data.clipEmbedding, data.imagePayload),
      this.indexProductText(data.productId, data.textEmbedding, data.textPayload),
    ]);
  }

  async searchSimilarImages(
    embedding: number[],
    limit = 5,
    scoreThreshold = 0.7,
  ): Promise<SearchHit[]> {
    return this.searchInCollection(
      this.imageCollectionName,
      embedding,
      limit,
      scoreThreshold,
    );
  }

  async searchSimilarText(
    embedding: number[],
    limit = 5,
    scoreThreshold = 0.7,
  ): Promise<SearchHit[]> {
    return this.searchInCollection(
      this.textCollectionName,
      embedding,
      limit,
      scoreThreshold,
    );
  }

  async deleteProduct(productId: string): Promise<void> {
    if (!this.isConfigured()) {
      throw new Error('Qdrant is not configured');
    }

    const pointId = this.toPointId(productId);

    await Promise.all([
      this.client.delete(this.imageCollectionName, {
        wait: true,
        points: [pointId],
      }),
      this.client.delete(this.textCollectionName, {
        wait: true,
        points: [pointId],
      }),
    ]);
  }

  async getCollectionInfo(collectionName?: string) {
    if (!this.isConfigured()) {
      throw new Error('Qdrant is not configured');
    }

    const name = collectionName || this.imageCollectionName;
    return this.client.getCollection(name);
  }

  private async searchInCollection(
    collectionName: string,
    embedding: number[],
    limit: number,
    scoreThreshold: number,
  ): Promise<SearchHit[]> {
    if (!this.isConfigured()) {
      throw new Error('Qdrant is not configured');
    }

    const result = await this.client.search(collectionName, {
      vector: embedding,
      limit,
      with_payload: true,
      score_threshold: scoreThreshold,
    });

    return result.map((hit) => {
      const payload = (hit.payload || {}) as Record<string, unknown>;
      const payloadProductId = payload.product_id;

      return {
        productId:
          typeof payloadProductId === 'string'
            ? payloadProductId
            : String(hit.id),
        score: hit.score,
        metadata: payload,
      };
    });
  }

  private async ensureCollection(name: string, vectorSize: number): Promise<void> {
    const collections = await this.client.getCollections();
    const exists = collections.collections.some((collection) => collection.name === name);

    if (exists) {
      return;
    }

    await this.client.createCollection(name, {
      vectors: {
        size: vectorSize,
        distance: 'Cosine',
      },
    });

    this.logger.log(`Created Qdrant collection "${name}" (${vectorSize} dims)`);
  }

  private async upsert(
    collectionName: string,
    productId: string,
    vector: number[],
    payload: Record<string, unknown>,
  ) {
    if (!this.isConfigured()) {
      throw new Error('Qdrant is not configured');
    }

    await this.client.upsert(collectionName, {
      wait: true,
      points: [
        {
          id: this.toPointId(productId),
          vector,
          payload,
        },
      ],
    });
  }

  private toPointId(rawProductId: string): string {
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(rawProductId)) {
      return rawProductId;
    }

    const hash = createHash('sha1').update(rawProductId).digest('hex');
    return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-${hash.slice(12, 16)}-${hash.slice(16, 20)}-${hash.slice(20, 32)}`;
  }
}
