import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class ConnectorClientService {
  private readonly logger = new Logger(ConnectorClientService.name);
  private readonly connectorUrl: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.connectorUrl = this.configService.get<string>(
      'CONNECTOR_URL',
      'http://localhost:3001',
    );
    this.logger.log(`Connector URL configured: ${this.connectorUrl}`);
  }

  /**
   * Exécute une méthode du client WhatsApp via le connector
   */
  async executeMethod(method: string, parameters: any[] = []): Promise<any> {
    try {
      this.logger.debug(`Executing method: ${method}`, { parameters });

      const response = await firstValueFrom(
        this.httpService.post(`${this.connectorUrl}/whatsapp/execute`, {
          method,
          parameters,
        }),
      );

      if (!response.data.success) {
        throw new Error(response.data.error || 'Unknown error');
      }

      return response.data.result;
    } catch (error: any) {
      this.logger.error(`Error executing method ${method}:`, error.message);
      throw new Error(
        `Failed to execute ${method}: ${error.response?.data?.error || error.message}`,
      );
    }
  }

  /**
   * Envoie un message WhatsApp
   */
  async sendMessage(chatId: string, content: string): Promise<any> {
    return this.executeMethod('sendMessage', [chatId, content]);
  }

  /**
   * Récupère un chat par ID
   */
  async getChatById(chatId: string): Promise<any> {
    return this.executeMethod('getChatById', [chatId]);
  }

  /**
   * Récupère un contact par ID
   */
  async getContactById(contactId: string): Promise<any> {
    return this.executeMethod('getContactById', [contactId]);
  }

  /**
   * Récupère tous les chats
   */
  async getChats(): Promise<any[]> {
    return this.executeMethod('getChats', []);
  }

  /**
   * Récupère tous les contacts
   */
  async getContacts(): Promise<any[]> {
    return this.executeMethod('getContacts', []);
  }

  /**
   * Marque un message comme lu
   */
  async markChatAsRead(chatId: string): Promise<any> {
    const chat = await this.getChatById(chatId);
    // La méthode sendSeen doit être appelée sur l'objet chat
    // Pour l'instant, on va juste retourner le chat
    return chat;
  }

  /**
   * Archive un chat
   */
  async archiveChat(chatId: string): Promise<any> {
    return this.executeMethod('archiveChat', [chatId]);
  }

  /**
   * Mute un chat
   */
  async muteChat(chatId: string, unmuteDate?: Date): Promise<any> {
    return this.executeMethod('muteChat', [chatId, unmuteDate]);
  }

  /**
   * Récupère le statut du connector
   */
  async getStatus(): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.connectorUrl}/whatsapp/status`),
      );
      return response.data;
    } catch (error: any) {
      this.logger.error('Error getting connector status:', error.message);
      throw new Error('Failed to get connector status');
    }
  }
}
