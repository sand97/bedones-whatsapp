import {
  Controller,
  Get,
  Post,
  Logger,
  HttpCode,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

import { InternalJwtGuard } from '../security/internal-jwt.guard';

import { CatalogSyncService } from './catalog-sync.service';

@ApiTags('Catalog')
@Controller('catalog')
export class CatalogController {
  private readonly logger = new Logger(CatalogController.name);

  constructor(private readonly catalogSyncService: CatalogSyncService) {}

  @Post('sync')
  @UseGuards(InternalJwtGuard)
  @HttpCode(200)
  @ApiOperation({
    summary: 'Trigger manual catalog synchronization',
    description:
      "Endpoint interne de production, appelé par le backend lors du /catalog/force-sync. Lance la synchronisation locale agent (catalogue + embeddings). Non destiné au frontend.",
  })
  @ApiResponse({
    status: 200,
    description: 'Sync triggered successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        imageSyncQueued: { type: 'boolean' },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'JWT interne backend->agent invalide ou absent',
  })
  async triggerSync() {
    this.logger.log('🔄 Manual catalog sync triggered via API');
    return this.catalogSyncService.triggerManualSyncInBackground();
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
