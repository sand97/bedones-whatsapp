import { BackendClientModule } from '@app/backend-client/backend-client.module';
import { CatalogSharedModule } from '@app/catalog-shared/catalog-shared.module';
import { ConnectorModule } from '@app/connector/connector.module';
import { ImageIndexingModule } from '@app/image-processing/image-indexing.module';
import { ImageProcessingModule } from '@app/image-processing/image-processing.module';
import { PageScriptModule } from '@app/page-scripts/page-script.module';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { CatalogSearchService } from './catalog-search.service';
import { CatalogSyncService } from './catalog-sync.service';
import { CatalogController } from './catalog.controller';

/**
 * Module for catalog management with vector search
 * - Syncs WhatsApp catalog to local DB
 * - Generates embeddings and indexes in Qdrant
 * - Provides intelligent search with fallback
 */
@Module({
  imports: [
    ConnectorModule,
    ConfigModule,
    PageScriptModule,
    BackendClientModule,
    CatalogSharedModule,
    ImageProcessingModule, // Provides QdrantService for vector search
    ImageIndexingModule,
  ],
  providers: [CatalogSyncService, CatalogSearchService],
  controllers: [CatalogController],
  exports: [CatalogSearchService, CatalogSyncService, CatalogSharedModule],
})
export class CatalogModule {}
