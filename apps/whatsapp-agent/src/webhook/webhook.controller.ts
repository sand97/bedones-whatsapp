import { BackendClientService } from '@app/backend-client/backend-client.service';
import { CatalogSyncService } from '@app/catalog/catalog-sync.service';
import { ImageEmbeddingsService } from '@app/image-processing/image-embeddings.service';
import { OcrService } from '@app/image-processing/ocr.service';
import { QdrantService } from '@app/image-processing/qdrant.service';
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
    private readonly ocrService: OcrService,
    private readonly qdrantService: QdrantService,
    private readonly imageEmbeddings: ImageEmbeddingsService,
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

        const isImage =
          message?.type === 'image' ||
          message?.downloadedMedia?.mimetype?.startsWith?.('image');

        if (isImage) {
          // Traitement synchro image : upload + OCR + search + metadata + réponse
          await this.handleImageInline(data, userId);
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
          objectKey: upload.objectKey,
        },
      });

      // Inject transcript into the live message so downstream agent sees it
      (message as any).transcript = transcription.transcript;

      // Delete media from MinIO once transcription is safely stored
      if (upload.objectKey) {
        try {
          await this.backendClient.deleteMedia({ objectKey: upload.objectKey });
        } catch (error: any) {
          this.logger.warn(
            `Unable to delete media ${upload.objectKey}: ${error.message}`,
          );
        }
      }

      (message as any).mediaUrl = upload.url;
      (message as any).mediaKind = 'audio';
    } else {
      this.logger.warn(
        `STT failed or empty transcript for message ${message?.id?._serialized}`,
      );
      // Do not continue to agent pipeline when no transcription is available
      return;
    }

    // Passe directement dans le pipeline agent (synchrone)
    await this.agentService.processIncomingMessage(messageData, userId);
  }

  /**
   * Traitement inline pour les images : upload -> OCR -> search -> metadata -> agent
   */
  private async handleImageInline(messageData: any[], userId?: string) {
    const [message] = messageData || [];
    const chatId = message?.from || 'unknown';

    if (
      !message?.downloadedMedia?.data ||
      !message?.downloadedMedia?.mimetype
    ) {
      this.logger.warn(
        `Image inline requested but no media on message ${message?.id?._serialized}`,
      );
      return;
    }

    // Step 1: Upload image to MinIO
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

    // Step 2: OCR - Extract text from image
    const imageBuffer = Buffer.from(message.downloadedMedia.data, 'base64');
    let ocrText = '';
    let keywords: string[] = [];

    try {
      ocrText = await this.ocrService.extractText(imageBuffer);
      keywords = this.ocrService.extractKeywords(ocrText);
      this.logger.log(
        `OCR extracted ${ocrText.length} characters, ${keywords.length} keywords`,
      );
    } catch (error: any) {
      this.logger.error('OCR extraction failed:', error.message);
    }

    let matchedProducts: any[] = [];
    let matchedKeywords: string[] = [];
    let searchMethod = 'none';

    // Step 3: Search by keywords if OCR found text
    if (keywords.length > 0 && userId) {
      try {
        const backendUrl =
          process.env.BACKEND_BASE_URL || 'http://localhost:3000';
        const searchUrl = `${backendUrl}/products/search-by-keywords`;

        const response = await fetch(searchUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            keywords,
            user_id: userId,
          }),
        });

        if (response.ok) {
          const searchResult = await response.json();
          matchedProducts = searchResult.products || [];
          matchedKeywords = searchResult.matchedKeywords || [];
          searchMethod = 'ocr_keywords';

          this.logger.log(
            `Found ${matchedProducts.length} products via OCR keywords`,
          );
        }
      } catch (error: any) {
        this.logger.error('Keyword search failed:', error.message);
      }
    }

    // Step 4: If no products found via OCR, try vector search with Qdrant
    if (
      matchedProducts.length === 0 &&
      this.qdrantService.isConfigured() &&
      this.imageEmbeddings.isReady()
    ) {
      try {
        this.logger.log('No OCR matches, trying Qdrant vector search...');

        // Generate image embedding
        const embedding =
          await this.imageEmbeddings.generateEmbedding(imageBuffer);

        // Search in Qdrant
        const threshold = parseFloat(
          process.env.IMAGE_SIMILARITY_THRESHOLD || '0.75',
        );
        const qdrantResults = await this.qdrantService.searchSimilar(
          embedding,
          5,
          threshold,
        );

        if (qdrantResults.length > 0) {
          matchedProducts = qdrantResults.map((r) => ({
            id: r.productId,
            score: r.score,
            ...r.metadata,
          }));
          searchMethod = 'vector_similarity';

          this.logger.log(
            `Found ${qdrantResults.length} products via Qdrant vector search`,
          );
        }
      } catch (error: any) {
        this.logger.error('Qdrant vector search failed:', error.message);
      }
    }

    // Step 5: Save metadata
    await this.backendClient.upsertMessageMetadata({
      messageId: message?.id?._serialized || message?.id || 'unknown',
      type: 'IMAGE',
      metadata: {
        ocrText: ocrText || null,
        keywords: keywords || [],
        matchedProducts: matchedProducts || [],
        matchedKeywords: matchedKeywords || [],
        searchMethod,
        productsFound: matchedProducts.length,
        mediaUrl: upload.url,
        objectKey: upload.objectKey,
      },
    });

    // Step 6: Inject context into message for agent
    if (matchedProducts.length > 0) {
      (message as any).imageProducts = matchedProducts;
      (message as any).imageSearchMethod = searchMethod;
      (message as any).imageOcrText = ocrText;

      this.logger.log(
        `Injected ${matchedProducts.length} products into message context (method: ${searchMethod})`,
      );
    }

    // Step 7: Delete image from MinIO to save storage
    if (upload.objectKey) {
      try {
        await this.backendClient.deleteMedia({ objectKey: upload.objectKey });
        this.logger.debug(`Deleted image ${upload.objectKey} from MinIO`);
      } catch (error: any) {
        this.logger.warn(
          `Unable to delete media ${upload.objectKey}: ${error.message}`,
        );
      }
    }

    (message as any).mediaUrl = upload.url;
    (message as any).mediaKind = 'image';

    // Step 8: Pass to agent pipeline
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
