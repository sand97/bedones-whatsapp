import { Module } from '@nestjs/common';

import { CatalogModule } from '../catalog/catalog.module';
import { ConnectorModule } from '../connector/connector.module';

import { AppStartupService } from './app-startup.service';

/**
 * Module for app startup coordination
 * Depends on both Connector and Catalog modules (no circular dependency)
 */
@Module({
  imports: [ConnectorModule, CatalogModule],
  providers: [AppStartupService],
})
export class AppStartupModule {}
