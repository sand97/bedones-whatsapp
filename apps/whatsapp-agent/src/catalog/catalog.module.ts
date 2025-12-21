import { ConnectorModule } from '@app/connector/connector.module';
import { PageScriptModule } from '@app/page-scripts/page-script.module';
import { PrismaModule } from '@app/prisma/prisma.module';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { CatalogSearchService } from './catalog-search.service';
import { CatalogSyncService } from './catalog-sync.service';
import { CatalogController } from './catalog.controller';
import { EmbeddingsService } from './embeddings.service';

/**
 * Module for catalog management with semantic search
 * - Syncs WhatsApp catalog to local DB
 * - Generates embeddings for semantic search
 * - Provides intelligent search with fallback
 */
@Module({
  imports: [PrismaModule, ConnectorModule, ConfigModule, PageScriptModule],
  providers: [EmbeddingsService, CatalogSyncService, CatalogSearchService],
  controllers: [CatalogController],
  exports: [CatalogSearchService, CatalogSyncService],
})
export class CatalogModule {}
