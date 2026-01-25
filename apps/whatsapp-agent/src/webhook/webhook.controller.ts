import { BackendClientService } from '@app/backend-client/backend-client.service';
import { CatalogSyncService } from '@app/catalog/catalog-sync.service';
import { WhatsAppAgentService } from '@app/langchain/whatsapp-agent.service';
import { AudioTranscriptionService } from '@app/media/audio-transcription.service';
import { Body, Controller, Post, Logger, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { lastValueFrom } from 'rxjs';

@ApiTags('Webhook')
@Controller('webhook')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(
    private readonly backendClient: BackendClientService,
    private readonly catalogSyncService: CatalogSyncService,
    private readonly audioTranscription: AudioTranscriptionService,
    private readonly agentService: WhatsAppAgentService,
  ) {}

  @Post('message')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Receive WhatsApp events from connector',
    description:
      'This endpoint receives all WhatsApp events from the connector service',
  })
  @ApiResponse({
    status: 200,
    description: 'Event received successfully',
  })
  async handleEvent(@Body() payload: any) {
    const { event, timestamp, data, userId } = payload;

    this.logger.debug(`Received event: ${event}`, { timestamp, userId });

    try {
      // Traiter les messages entrants
      if (event === 'message') {
        const [message] = data || [];

        const isAudio =
          message?.type === 'ptt' ||
          message?.type === 'audio' ||
          message?.downloadedMedia?.mimetype?.startsWith?.('audio');

        if (isAudio) {
          // Traitement synchro audio : upload + STT + metadata + réponse
          await this.handleAudioInline(data, userId);
          return { success: true, event, processed: true, mode: 'inline' };
        }

        // Pas de traitement background pour le moment : on passe direct à l'agent
        await this.agentService.processIncomingMessage(data, userId);
      }

      // Traiter l'événement de pairing réussi (événement custom du connector)
      else if (event === 'pairing_success') {
        this.logger.log('WhatsApp pairing successful', {
          phoneNumber: data?.phoneNumber,
          profile: data?.profile,
        });

        // Notifier le backend que le pairing a réussi
        try {
          const phoneNumber = data?.phoneNumber;
          const whatsappProfile = data?.profile || {};

          if (!phoneNumber) {
            this.logger.warn(
              'Pairing success event received without phone number',
            );
            return {
              success: false,
              event,
              error: 'Missing phone number in pairing_success event',
            };
          }

          // Appeler le backend pour finaliser le pairing
          await lastValueFrom(
            this.backendClient.verifyPairingSuccess(
              phoneNumber,
              whatsappProfile,
            ),
          );

          this.logger.log(
            `Backend notified of successful pairing for ${phoneNumber}`,
          );

          // Trigger catalog sync after successful pairing (direct injection)
          await this.catalogSyncService
            .triggerManualSync()
            .then(() => {
              this.logger.log('Catalog sync triggered after pairing success');
            })
            .catch((error) => {
              this.logger.error(
                'Failed to trigger catalog sync after pairing:',
                error.message,
              );
            });
        } catch (backendError: any) {
          this.logger.error(
            'Failed to notify backend of pairing:',
            backendError.message,
          );
          // Ne pas faire échouer le webhook si le backend n'est pas joignable
        }
      }

      // Pour les autres événements, on log simplement
      else {
        this.logger.log(`Event received: ${event}`, {
          event,
          timestamp,
          dataLength: data?.length || 0,
        });
      }

      return {
        success: true,
        event,
        processed: event === 'message' || event === 'pairing_success',
      };
    } catch (error: any) {
      this.logger.error(`Error handling event ${event}:`, error.message);
      return {
        success: false,
        event,
        error: error.message,
      };
    }
  }

  /**
   * Traitement inline pour l'audio : upload -> STT -> metadata -> agent
   */
  private async handleAudioInline(messageData: any[], userId?: string) {
    const [message] = messageData || [];
    const chatId = message?.from || 'unknown';

    if (
      !message?.downloadedMedia?.data ||
      !message?.downloadedMedia?.mimetype
    ) {
      this.logger.warn(
        `Audio inline requested but no media on message ${message?.id?._serialized}`,
      );
      return;
    }

    // Upload media via backend
    const upload = await this.backendClient.uploadMedia({
      messageId: message?.id?._serialized || message?.id || 'unknown',
      chatId,
      userId,
      mediaBase64: message.downloadedMedia.data,
      mimeType: message.downloadedMedia.mimetype,
      filename: message.downloadedMedia.filename,
      userPhoneNumber: this.stripAndSanitize(userId),
      contactPhoneNumber: this.stripAndSanitize(
        message?.contactId || chatId || undefined,
      ),
    });

    // STT Gemini
    const transcription = await this.audioTranscription.transcribeAudio({
      base64: message.downloadedMedia.data,
      mimeType: message.downloadedMedia.mimetype,
    });

    if (transcription?.transcript) {
      await this.backendClient.upsertMessageMetadata({
        messageId: message?.id?._serialized || message?.id || 'unknown',
        type: 'AUDIO',
        metadata: {
          transcript: transcription.transcript,
          language: transcription.language,
          confidence: transcription.confidence,
          mediaUrl: upload.url,
        },
      });
      (message as any).transcript = transcription.transcript;
      (message as any).mediaUrl = upload.url;
      (message as any).mediaKind = 'audio';
    }

    // Passe directement dans le pipeline agent (synchrone)
    await this.agentService.processIncomingMessage(messageData, userId);
  }

  private stripSuffix(waId?: string): string | undefined {
    if (!waId) return undefined;
    return waId.replace(/@c\.us|@g\.us|@s\.whatsapp\.net$/i, '');
  }

  private stripAndSanitize(waId?: string): string | undefined {
    const stripped = this.stripSuffix(waId);
    if (!stripped) return undefined;
    return stripped.replace(/@/g, '-');
  }
}
