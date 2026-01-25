import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

// Ensure ESLint knows AbortSignal is defined in the runtime
type AbortSignal = globalThis.AbortSignal;

export interface TranscriptionResult {
  transcript: string;
  confidence?: number;
  language?: string;
  raw?: any;
}

@Injectable()
export class AudioTranscriptionService {
  private readonly logger = new Logger(AudioTranscriptionService.name);
  private readonly apiKey = process.env.GEMINI_API_KEY;
  private readonly model = process.env.GEMINI_AUDIO_MODEL;

  /**
   * Transcribe audio using Gemini Audio API.
   * Accepts base64-encoded media and mimeType.
   */
  async transcribeAudio(params: {
    base64: string;
    mimeType: string;
    prompt?: string;
    abortSignal?: AbortSignal;
  }): Promise<TranscriptionResult | null> {
    if (!this.apiKey) {
      this.logger.error('GEMINI_API_KEY not configured, cannot run STT');
      return null;
    }
    if (!this.model) {
      this.logger.error(
        'GEMINI_AUDIO_MODEL not configured (must be a Gemini 2.5+ audio-capable model)',
      );
      return null;
    }
    if (!this.model.includes('2.5')) {
      this.logger.error(
        `GEMINI_AUDIO_MODEL must target Gemini 2.5+; current: ${this.model}`,
      );
      return null;
    }

    const { base64, mimeType, prompt, abortSignal } = params;

    const body = {
      contents: [
        {
          parts: [
            {
              text:
                prompt ||
                'Transcris exactement le contenu audio en texte. Réponds uniquement par la transcription.',
            },
            {
              inlineData: {
                mimeType,
                data: base64,
              },
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.2,
      },
    };

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;
    try {
      const response = await axios.post(url, body, {
        signal: abortSignal,
      });

      const candidates = response.data?.candidates || [];
      const text = candidates?.[0]?.content?.parts?.[0]?.text?.trim?.() || '';

      if (!text) {
        this.logger.warn(`Gemini STT empty transcript (model=${this.model})`);
        return null;
      }

      return {
        transcript: text,
        raw: response.data,
      };
    } catch (error: any) {
      if (abortSignal?.aborted) {
        this.logger.warn('STT aborted by signal');
        return null;
      }
      const status = error?.response?.status;
      const detail =
        error?.response?.data?.error?.message || error.message || 'unknown';
      this.logger.error(
        `Gemini STT failed model=${this.model} status=${status} detail=${detail}`,
      );
      return null;
    }
  }
}
