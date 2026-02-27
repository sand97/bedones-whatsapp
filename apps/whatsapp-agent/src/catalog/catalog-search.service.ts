import { EmbeddingsService } from '@app/catalog-shared/embeddings.service';
import { ConnectorClientService } from '@app/connector/connector-client.service';
import { QdrantService } from '@app/image-processing/qdrant.service';
import { PageScriptService } from '@app/page-scripts/page-script.service';
import { Injectable, Logger } from '@nestjs/common';

export interface ProductSearchResult {
  id: string;
  name: string;
  description?: string;
  price?: number;
  currency?: string;
  availability?: string;
  collectionName?: string;
  similarity?: number; // Only present for vector search
}

/**
 * Service for searching products with intelligent fallback
 * - Primary: Vector search using Qdrant (fast, intelligent, free)
 * - Fallback: Direct WhatsApp search (slower, exact match)
 */
@Injectable()
export class CatalogSearchService {
  private readonly logger = new Logger(CatalogSearchService.name);

  constructor(
    private readonly embeddings: EmbeddingsService,
    private readonly qdrantService: QdrantService,
    private readonly connectorClient: ConnectorClientService,
    private readonly pageScriptService: PageScriptService,
  ) {}

  /**
   * Search products with intelligent routing
   * Uses vector search (Qdrant) if available, otherwise falls back to WhatsApp direct search
   */
  async searchProducts(
    query: string,
    limit: number = 10,
    scoreThreshold: number = 0.7,
  ): Promise<{
    success: boolean;
    products: ProductSearchResult[];
    method: 'vector_search' | 'direct_whatsapp';
    error?: string;
  }> {
    try {
      // Try vector search first if Qdrant is configured and embeddings service is available
      if (this.qdrantService.isConfigured() && this.embeddings.isAvailable()) {
        return await this.searchVector(query, limit, scoreThreshold);
      }

      // Fallback to direct WhatsApp search
      this.logger.debug(
        'Qdrant not configured, falling back to direct WhatsApp search',
      );
      return await this.searchDirectWhatsApp(query, limit);
    } catch (error) {
      this.logger.error(`Search failed: ${error.message}`);
      return {
        success: false,
        products: [],
        method: 'vector_search',
        error: error.message,
      };
    }
  }

  /**
   * Vector search using Qdrant
   */
  private async searchVector(
    query: string,
    limit: number,
    scoreThreshold: number,
  ): Promise<{
    success: boolean;
    products: ProductSearchResult[];
    method: 'vector_search';
  }> {
    this.logger.debug(`🔍 Vector search for: "${query}"`);

    // Generate embedding for the query
    const queryEmbedding = await this.embeddings.embedText(query);

    // Search in Qdrant text collection
    const searchResults = await this.qdrantService.searchSimilarText(
      queryEmbedding,
      limit,
      scoreThreshold,
    );

    // Map to ProductSearchResult
    const products: ProductSearchResult[] = searchResults.map((hit) => ({
      id: hit.productId,
      name: (hit.metadata.name as string) || '',
      description: (hit.metadata.description as string) || undefined,
      price: (hit.metadata.price as number) || undefined,
      currency: (hit.metadata.currency as string) || undefined,
      availability: (hit.metadata.availability as string) || undefined,
      collectionName: (hit.metadata.collectionName as string) || undefined,
      similarity: hit.score,
    }));

    this.logger.debug(`✅ Found ${products.length} results via vector search`);

    return {
      success: true,
      products,
      method: 'vector_search',
    };
  }

  /**
   * Direct WhatsApp search (fallback when vector search not available)
   */
  private async searchDirectWhatsApp(
    query: string,
    limit: number,
  ): Promise<{
    success: boolean;
    products: ProductSearchResult[];
    method: 'direct_whatsapp';
  }> {
    this.logger.debug(`📱 Direct WhatsApp search for: "${query}"`);

    const script = this.pageScriptService.getScript(
      'catalog/searchProductsDirect',
      {
        QUERY: query,
        LIMIT: limit.toString(),
      },
    );

    const { result: products } =
      await this.connectorClient.executeScript(script);

    this.logger.debug(
      `✅ Found ${products?.length || 0} results via direct WhatsApp search`,
    );

    return {
      success: true,
      products: products || [],
      method: 'direct_whatsapp',
    };
  }
}
