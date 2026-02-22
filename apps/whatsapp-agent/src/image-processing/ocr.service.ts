import { Injectable, Logger } from '@nestjs/common';
import * as Tesseract from 'tesseract.js';

@Injectable()
export class OcrService {
  private readonly logger = new Logger(OcrService.name);

  /**
   * Extract text from an image buffer using Tesseract OCR
   * @param imageBuffer Image buffer to analyze
   * @returns Extracted text
   */
  async extractText(imageBuffer: Buffer): Promise<string> {
    try {
      this.logger.log('Starting OCR text extraction...');

      const {
        data: { text },
      } = await Tesseract.recognize(imageBuffer, 'fra+eng', {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            this.logger.debug(`OCR progress: ${Math.round(m.progress * 100)}%`);
          }
        },
      });

      this.logger.log(`OCR completed. Extracted ${text.length} characters`);

      return text.trim();
    } catch (error) {
      this.logger.error('Error during OCR text extraction:', error);
      throw new Error(`OCR extraction failed: ${error.message}`);
    }
  }

  /**
   * Extract keywords from OCR text
   * Filters out common words and short words
   * @param text Text to extract keywords from
   * @param minLength Minimum word length (default: 3)
   * @returns Array of keywords
   */
  extractKeywords(text: string, minLength = 3): string[] {
    // Common words to filter out (French + English)
    const stopWords = new Set([
      'the',
      'and',
      'for',
      'are',
      'with',
      'this',
      'that',
      'from',
      'sur',
      'les',
      'des',
      'une',
      'dans',
      'pour',
      'qui',
      'par',
      'avec',
      'est',
      'son',
      'ses',
      'aux',
      'ces',
      'leur',
      'leurs',
    ]);

    // Split by non-alphanumeric characters and filter
    const keywords = text
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((word) => {
        // Remove empty, short words, and stop words
        return (
          word.length >= minLength &&
          !stopWords.has(word) &&
          !/^\d+$/.test(word) // Keep words with letters (numbers + letters OK)
        );
      });

    // Remove duplicates
    return Array.from(new Set(keywords));
  }
}
