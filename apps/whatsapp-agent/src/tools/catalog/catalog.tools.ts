import { CatalogSearchService } from '@app/catalog/catalog-search.service';
import { ConnectorClientService } from '@app/connector/connector-client.service';
import { PageScriptService } from '@app/page-scripts/page-script.service';
import { tool } from '@langchain/core/tools';
import { Injectable } from '@nestjs/common';
import { z } from 'zod';

/**
 * Catalog tools for the WhatsApp agent
 * Uses semantic search with embeddings when available
 * Falls back to direct WhatsApp search when embeddings not ready
 */
@Injectable()
export class CatalogTools {
  constructor(
    private readonly connectorClient: ConnectorClientService,
    private readonly catalogSearch: CatalogSearchService,
    private readonly scriptService: PageScriptService,
  ) {}

  /**
   * Create all catalog tools
   */
  createTools() {
    return [
      this.createListProductsTool(),
      this.createSearchProductsTool(),
      this.createGetProductDetailsTool(),
    ];
  }

  /**
   * List products from catalog (directly from WhatsApp via connector)
   */
  private createListProductsTool() {
    return tool(
      async ({ limit }, config?: any) => {
        try {
          const script = this.scriptService.getScript(
            'catalog/getCollections',
            {
              LIMIT: String(limit || 20),
            },
          );

          const products = await this.connectorClient.executeScript(script);

          return JSON.stringify({
            success: true,
            products,
            count: products?.length || 0,
          });
        } catch (error: any) {
          return JSON.stringify({
            success: false,
            error: error.message,
          });
        }
      },
      {
        name: 'list_products',
        description:
          'List products from the WhatsApp catalog directly from WhatsApp Web.',
        schema: z.object({
          limit: z
            .number()
            .default(20)
            .describe('Maximum number of products to return'),
        }),
      },
    );
  }

  /**
   * Search products with intelligent routing:
   * - Uses semantic search if embeddings are available (best results)
   * - Falls back to direct WhatsApp search if embeddings not ready
   */
  private createSearchProductsTool() {
    return tool(
      async ({ query, limit }, config?: any) => {
        try {
          // Use intelligent search service with automatic fallback
          const result = await this.catalogSearch.searchProducts(query, limit);

          return JSON.stringify({
            success: result.success,
            products: result.products,
            query,
            count: result.products.length,
            method: result.method, // 'semantic' or 'direct_whatsapp'
            error: result.error,
          });
        } catch (error: any) {
          return JSON.stringify({
            success: false,
            error: error.message,
          });
        }
      },
      {
        name: 'search_products',
        description:
          'Search products intelligently. Uses semantic search if available (understands synonyms and context), otherwise searches directly in WhatsApp.',
        schema: z.object({
          query: z
            .string()
            .describe(
              'Natural language query (e.g. "elegant evening dress", "comfortable shoes")',
            ),
          limit: z.number().default(10).describe('Maximum number of results'),
        }),
      },
    );
  }

  /**
   * Get detailed information about a specific product (directly from WhatsApp)
   */
  private createGetProductDetailsTool() {
    return tool(
      async ({ productId }, config?: any) => {
        try {
          const script = this.scriptService.getScript(
            'catalog/getProductDetails',
            { PRODUCT_ID: productId },
          );

          const product = await this.connectorClient.executeScript(script);

          if (!product) {
            return JSON.stringify({
              success: false,
              error: 'Produit non trouvé',
            });
          }

          return JSON.stringify({
            success: true,
            product,
          });
        } catch (error: any) {
          return JSON.stringify({
            success: false,
            error: error.message,
          });
        }
      },
      {
        name: 'get_product_details',
        description:
          'Get full details for a specific product directly from WhatsApp (price, description, images, availability, etc.).',
        schema: z.object({
          productId: z.string().describe('WhatsApp product ID'),
        }),
      },
    );
  }
}
