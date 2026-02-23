import { ConnectorModule } from '@app/connector/connector.module';
import { ImageProcessingModule } from '@app/image-processing/image-processing.module';
import { PageScriptModule } from '@app/page-scripts/page-script.module';
import { PrismaModule } from '@app/prisma/prisma.module';
import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { CatalogSearchService } from './catalog-search.service';
import { CatalogSyncService } from './catalog-sync.service';
import { CatalogController } from './catalog.controller';
import { EmbeddingsService } from './embeddings.service';
import { PromptGeneratorService } from './prompt-generator.service';

/**
 * Module for catalog management with semantic search
 * - Syncs WhatsApp catalog to local DB
 * - Generates embeddings for semantic search
 * - Provides intelligent search with fallback
 */
@Module({
  imports: [
    PrismaModule,
    ConnectorModule,
    ConfigModule,
    PageScriptModule,
    forwardRef(() => ImageProcessingModule),
  ],
  providers: [
    EmbeddingsService,
    CatalogSyncService,
    CatalogSearchService,
    PromptGeneratorService,
  ],
  controllers: [CatalogController],
  exports: [
    CatalogSearchService,
    CatalogSyncService,
    EmbeddingsService,
    PromptGeneratorService,
  ],
})
export class CatalogModule {}
