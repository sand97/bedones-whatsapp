import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';

/**
 * Client HTTP pour communiquer avec le service WhatsApp-Agent déployé
 * Permet de déclencher des actions sur l'agent distant (sync catalogue, etc.)
 */
@Injectable()
export class WhatsAppAgentClientService {
  private readonly logger = new Logger(WhatsAppAgentClientService.name);

  constructor(private readonly httpService: HttpService) {}

  /**
   * Trigger catalog sync on remote whatsapp-agent
   * @param agentUrl - Full URL of the whatsapp-agent (e.g., http://ip:port)
   */
  async triggerCatalogSync(agentUrl: string): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      this.logger.log(`Triggering catalog sync on agent: ${agentUrl}`);

      const response = await firstValueFrom(
        this.httpService.post(
          `${agentUrl}/catalog/sync`,
          {},
          { timeout: 120000 },
        ), // 2min timeout
      );

      this.logger.log(`✅ Catalog sync triggered successfully on ${agentUrl}`);
      return response.data;
    } catch (error: any) {
      this.logger.error(
        `Failed to trigger catalog sync on ${agentUrl}:`,
        error.message,
      );
      throw new Error(`Catalog sync failed: ${error.message}`);
    }
  }

  /**
   * Get catalog sync status from remote whatsapp-agent
   * @param agentUrl - Full URL of the whatsapp-agent
   */
  async getCatalogSyncStatus(agentUrl: string): Promise<{
    isSyncing: boolean;
    lastSyncTime: Date | null;
    embeddingsAvailable: boolean;
  } | null> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${agentUrl}/catalog/status`),
      );
      return response.data;
    } catch (error: any) {
      this.logger.error(
        `Failed to get catalog status from ${agentUrl}:`,
        error.message,
      );
      return null;
    }
  }
}
