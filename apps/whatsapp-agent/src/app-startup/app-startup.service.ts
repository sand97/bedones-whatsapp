import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as Sentry from '@sentry/nestjs';

import { CatalogSyncService } from '../catalog/catalog-sync.service';
import { ConnectorClientService } from '../connector/connector-client.service';

/**
 * Service responsible for coordinating app startup tasks
 * Breaks circular dependency between Connector and Catalog modules
 */
@Injectable()
export class AppStartupService implements OnModuleInit {
  private readonly logger = new Logger(AppStartupService.name);

  constructor(
    private readonly connectorClient: ConnectorClientService,
    private readonly catalogSync: CatalogSyncService,
  ) {}

  private captureStartupException(
    operation: string,
    error: unknown,
    context: Record<string, unknown> = {},
  ) {
    Sentry.captureException(error, {
      tags: {
        domain: 'app_startup',
        operation,
        service: 'whatsapp-agent',
      },
      contexts: {
        appStartup: context,
      },
    });
  }

  async onModuleInit() {
    // Wait a bit for connector to start, then check status and trigger initial sync
    setTimeout(() => {
      this.checkConnectorAndSync().catch((error) => {
        this.logger.warn(
          `Failed to check connector status on startup: ${error.message}`,
        );
        this.captureStartupException('on_module_init.check_connector', error);
      });
    }, 2000);
  }

  /**
   * Check if connector is ready and trigger initial catalog sync
   */
  private async checkConnectorAndSync(): Promise<void> {
    try {
      const status = await this.connectorClient.getStatus();

      if (status?.isReady === true) {
        this.logger.log(
          '✅ Connector is ready - triggering initial catalog sync',
        );

        this.catalogSync
          .triggerManualSync()
          .then(() => {
            this.logger.log('✅ Initial catalog sync completed');
          })
          .catch((error) => {
            this.logger.error(
              'Failed to trigger initial catalog sync:',
              error.message,
            );
            this.captureStartupException(
              'check_connector_and_sync.initial_catalog_sync',
              error,
            );
          });
      } else {
        this.logger.debug(
          'Connector not ready yet, sync will be handled by cron',
        );
      }
    } catch (error) {
      this.logger.debug(`Connector not ready yet: ${error.message}`);
    }
  }
}
