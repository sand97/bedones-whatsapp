import { Controller, Get, Post, Logger, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

import { CatalogSyncService } from './catalog-sync.service';

@ApiTags('Catalog')
@Controller('catalog')
export class CatalogController {
  private readonly logger = new Logger(CatalogController.name);

  constructor(private readonly catalogSyncService: CatalogSyncService) {}

  @Post('sync')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Trigger manual catalog synchronization',
    description:
      'Forces immediate catalog sync with WhatsApp connector, including embeddings generation',
  })
  @ApiResponse({
    status: 200,
    description: 'Sync triggered successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
      },
    },
  })
  async triggerSync() {
    this.logger.log('🔄 Manual catalog sync triggered via API');
    return await this.catalogSyncService.triggerManualSync();
  }

  @Get('status')
  @ApiOperation({ summary: 'Get catalog sync status' })
  @ApiResponse({
    status: 200,
    description: 'Sync status retrieved',
    schema: {
      type: 'object',
      properties: {
        isSyncing: { type: 'boolean' },
        lastSyncTime: { type: 'string', nullable: true },
        embeddingsAvailable: { type: 'boolean' },
      },
    },
  })
  getSyncStatus() {
    return this.catalogSyncService.getSyncStatus();
  }
}
