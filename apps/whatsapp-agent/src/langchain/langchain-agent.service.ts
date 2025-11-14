import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { ChatOpenAI } from '@langchain/openai';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { ConnectorClientService } from '../connector/connector-client.service';

import { createWhatsAppTools } from './whatsapp.tools';

@Injectable()
export class LangChainAgentService {
  private readonly logger = new Logger(LangChainAgentService.name);
  private grokModel: ChatOpenAI | null = null;
  private geminiModel: ChatGoogleGenerativeAI | null = null;
  private tools: any[];
  private systemPrompt: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly connectorClient: ConnectorClientService,
  ) {
    this.initializeModels();
    this.tools = createWhatsAppTools(connectorClient);
    this.systemPrompt = this.configService.get<string>(
      'AGENT_SYSTEM_PROMPT',
      'You are a helpful WhatsApp assistant. You can read and send messages, get chat information, and help users with their WhatsApp conversations. Always be polite and helpful.',
    );
  }

  private initializeModels() {
    // Grok (via xAI API compatible OpenAI)
    const grokApiKey = this.configService.get<string>('GROK_API_KEY');
    if (grokApiKey) {
      this.grokModel = new ChatOpenAI({
        openAIApiKey: grokApiKey,
        modelName: this.configService.get<string>('GROK_MODEL') || 'grok-beta',
        temperature: 0.7,
        configuration: {
          baseURL:
            this.configService.get<string>('GROK_API_BASE') ||
            'https://api.x.ai/v1',
        },
      });
      this.logger.log('Grok model initialized');
    } else {
      this.logger.warn('Grok API key not configured');
    }

    // Gemini
    const geminiApiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (geminiApiKey) {
      this.geminiModel = new ChatGoogleGenerativeAI({
        apiKey: geminiApiKey,
        model:
          this.configService.get<string>('GEMINI_MODEL') ||
          'gemini-2.0-flash-exp',
        temperature: 0.7,
      });
      this.logger.log('Gemini model initialized');
    } else {
      this.logger.warn('Gemini API key not configured');
    }

    if (!this.grokModel && !this.geminiModel) {
      throw new Error(
        'No AI model configured. Please set either GROK_API_KEY or GEMINI_API_KEY',
      );
    }
  }

  /**
   * Génère une réponse en utilisant le modèle IA avec fallback
   */
  async generateResponse(userMessage: string, context?: any): Promise<string> {
    try {
      this.logger.debug('Generating response for message:', userMessage);

      // Préparer le contexte
      const contextMessage = context
        ? `\nContext:\n${JSON.stringify(context, null, 2)}`
        : '';

      const fullMessage = `${this.systemPrompt}\n\nUser: ${userMessage}${contextMessage}`;

      // Essayer Grok en premier (si configuré)
      if (this.grokModel) {
        try {
          this.logger.debug('Trying Grok model...');
          const response = await this.grokModel.invoke(fullMessage);
          this.logger.log('Response generated successfully with Grok');
          return response.content.toString();
        } catch (error: any) {
          this.logger.error('Grok model failed:', error.message);
          this.logger.log('Falling back to Gemini...');
        }
      }

      // Fallback sur Gemini
      if (this.geminiModel) {
        this.logger.debug('Using Gemini model...');
        const response = await this.geminiModel.invoke(fullMessage);
        this.logger.log('Response generated successfully with Gemini');
        return response.content.toString();
      }

      throw new Error('All AI models failed');
    } catch (error: any) {
      this.logger.error('Failed to generate response:', error.message);
      throw new Error(`AI generation failed: ${error.message}`);
    }
  }

  /**
   * Génère une réponse avec accès aux tools (agent avec outils)
   */
  async generateResponseWithTools(
    userMessage: string,
    context?: any,
  ): Promise<string> {
    try {
      this.logger.debug(
        'Generating response with tools for message:',
        userMessage,
      );

      // Pour l'instant, on utilise la génération simple
      // TODO: Implémenter l'agent avec tools quand LangChain v1 sera stable
      // const agent = await createAgent(model, tools, systemPrompt);

      // En attendant, on utilise la génération simple
      const response = await this.generateResponse(userMessage, context);

      // Si la réponse mentionne qu'il faut envoyer un message, on peut le faire
      // C'est une implémentation simplifiée pour le moment
      return response;
    } catch (error: any) {
      this.logger.error(
        'Failed to generate response with tools:',
        error.message,
      );
      throw error;
    }
  }

  /**
   * Traite un message WhatsApp entrant et génère une réponse
   */
  async processIncomingMessage(messageData: any): Promise<string | null> {
    try {
      // Extraire les données du message
      const [message] = messageData;

      // Ignorer les messages envoyés par nous-mêmes
      if (message?.fromMe) {
        this.logger.debug('Ignoring message from self');
        return null;
      }

      // Ignorer les messages de groupe pour l'instant
      if (message?.from?.includes('@g.us')) {
        this.logger.debug('Ignoring group message');
        return null;
      }

      const userMessage = message?.body || '';
      const from = message?.from || '';

      this.logger.log(
        `Processing message from ${from}: ${userMessage.substring(0, 50)}...`,
      );

      // Créer le contexte
      const context = {
        from,
        timestamp: message?.timestamp,
        hasMedia: message?.hasMedia,
        type: message?.type,
      };

      // Générer la réponse
      const response = await this.generateResponse(userMessage, context);

      // Envoyer la réponse via le connector
      await this.connectorClient.sendMessage(from, response);

      this.logger.log(`Response sent to ${from}`);

      return response;
    } catch (error: any) {
      this.logger.error('Error processing incoming message:', error.message);
      throw error;
    }
  }
}
