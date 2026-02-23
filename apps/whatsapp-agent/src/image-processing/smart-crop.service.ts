import * as fs from 'fs';
import * as path from 'path';

import axios from 'axios';
import FormData from 'form-data';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import sharp from 'sharp';

type LayoutItem = {
  type?: string;
  bbox?: [number, number, number, number];
  score?: number;
};

type LayoutResponse = {
  width?: number;
  height?: number;
  items?: LayoutItem[];
};

type CropBox = {
  left: number;
  top: number;
  width: number;
  height: number;
  type?: string;
  score?: number;
  bbox?: [number, number, number, number];
};

@Injectable()
export class SmartCropService {
  private readonly logger = new Logger(SmartCropService.name);
  private readonly paddleOcrUrl: string;
  private readonly paddleOcrTimeoutMs: number;

  constructor(private readonly configService: ConfigService) {
    this.paddleOcrUrl =
      this.configService.get<string>('PADDLEOCR_URL') ||
      'http://localhost:8010';
    const timeoutValue = this.configService.get<string>(
      'PADDLEOCR_TIMEOUT_MS',
    );
    const parsedTimeout = timeoutValue ? Number(timeoutValue) : NaN;
    this.paddleOcrTimeoutMs = Number.isFinite(parsedTimeout)
      ? parsedTimeout
      : 20000;
  }

  /**
   * Automatically detect and crop the most important area of an image
   * Useful for extracting product images from social media screenshots
   *
   * @param imageBuffer - Buffer containing the image data
   * @param options - Cropping options
   * @returns Buffer containing the cropped image
   */
  async smartCrop(
    imageBuffer: Buffer,
    options: {
      width?: number;
      height?: number;
      minScale?: number;
      debug?: boolean;
      minAreaRatio?: number;
      paddingRatio?: number;
    } = {},
  ): Promise<Buffer> {
    try {
      // Get image metadata
      const metadata = await sharp(imageBuffer).metadata();
      if (!metadata.width || !metadata.height) {
        throw new Error('Unable to determine image dimensions');
      }

      this.logger.log(
        `Processing image: ${metadata.width}x${metadata.height} (${metadata.format})`,
      );

      // Default crop dimensions (square crop for product images)
      const targetWidth = options.width || 800;
      const targetHeight = options.height || 800;

      // Layout analysis options
      const minAreaRatio = options.minAreaRatio ?? 0.08;
      const paddingRatio = options.paddingRatio ?? 0.01;

      // Run PaddleOCR PP-Structure layout analysis
      this.logger.log(
        `Running layout analysis via PaddleOCR (target: ${targetWidth}x${targetHeight})...`,
      );

      const layout = await this.detectLayout(imageBuffer);
      const selectedBox = this.pickBestBox(
        layout.items || [],
        metadata.width,
        metadata.height,
        minAreaRatio,
        paddingRatio,
      );

      const cropBox: CropBox =
        selectedBox ||
        ({
          left: 0,
          top: 0,
          width: metadata.width,
          height: metadata.height,
        } as CropBox);

      if (!selectedBox) {
        this.logger.warn('No suitable layout box found. Using full image.');
      }

      const scoreText =
        typeof cropBox.score === 'number'
          ? ` (score: ${cropBox.score.toFixed(2)})`
          : '';
      const typeText = cropBox.type ? ` [${cropBox.type}]` : '';

      this.logger.log(
        `Layout crop box${typeText}: (${cropBox.left}, ${cropBox.top}) ` +
          `${cropBox.width}x${cropBox.height}${scoreText}`,
      );

      // Extract the crop area
      const croppedBuffer = await sharp(imageBuffer)
        .extract({
          left: cropBox.left,
          top: cropBox.top,
          width: cropBox.width,
          height: cropBox.height,
        })
        .resize(targetWidth, targetHeight, {
          fit: 'cover',
          position: 'center',
        })
        .toBuffer();

      this.logger.log('Image cropped successfully');
      return croppedBuffer;
    } catch (error) {
      this.logger.error('Failed to crop image:', error);
      throw error;
    }
  }

  /**
   * Crop image via OpenCV service.
   * Falls back to the original image buffer when the service is unavailable.
   */
  async cropOpenCV(imageBuffer: Buffer): Promise<Buffer> {
    const imageCropperUrl =
      this.configService.get<string>('IMAGE_CROPPER_URL') ||
      'http://localhost:8011';

    try {
      const formData = new FormData();
      formData.append('file', imageBuffer, {
        filename: 'input.jpg',
        contentType: 'image/jpeg',
      });

      const response = await axios.post<{
        success: boolean;
        image_base64?: string;
      }>(`${imageCropperUrl}/crop/opencv`, formData, {
        headers: formData.getHeaders(),
        timeout: 30000,
      });

      const base64Image = response.data?.image_base64;
      if (!base64Image) {
        this.logger.warn('OpenCV crop service returned no image. Using original.');
        return imageBuffer;
      }

      return Buffer.from(base64Image, 'base64');
    } catch (error: any) {
      this.logger.warn(
        `OpenCV crop failed, using original image: ${error?.message || error}`,
      );
      return imageBuffer;
    }
  }

  private async detectLayout(imageBuffer: Buffer): Promise<LayoutResponse> {
    if (!this.paddleOcrUrl) {
      throw new Error('PADDLEOCR_URL is not configured');
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.paddleOcrTimeoutMs);

    try {
      const response = await fetch(`${this.paddleOcrUrl}/layout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/octet-stream',
        },
        body: new Uint8Array(imageBuffer),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorBody = await response.text().catch(() => '');
        throw new Error(
          `PaddleOCR request failed (${response.status}): ${errorBody}`,
        );
      }

      const data = (await response.json()) as LayoutResponse;
      if (!data || !Array.isArray(data.items)) {
        throw new Error('PaddleOCR response missing layout items');
      }

      return data;
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        throw new Error(
          `PaddleOCR request timed out after ${this.paddleOcrTimeoutMs}ms`,
        );
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  private pickBestBox(
    items: LayoutItem[],
    imageWidth: number,
    imageHeight: number,
    minAreaRatio: number,
    paddingRatio: number,
  ): CropBox | null {
    const normalized = items
      .map((item) => this.toCropBox(item, imageWidth, imageHeight, paddingRatio))
      .filter((value): value is CropBox => Boolean(value));

    if (!normalized.length) {
      return null;
    }

    const imageArea = imageWidth * imageHeight;
    const scored = normalized.map((box) => {
      const area = box.width * box.height;
      return {
        box,
        area,
        areaRatio: imageArea > 0 ? area / imageArea : 0,
      };
    });

    const valid = scored.filter((entry) => entry.areaRatio >= minAreaRatio);
    const imageCandidates = valid.filter((entry) =>
      this.isImageType(entry.box.type),
    );

    const best =
      this.pickLargest(imageCandidates) ||
      this.pickLargest(valid) ||
      this.pickLargest(scored);

    return best?.box || null;
  }

  private pickLargest(
    entries: Array<{ box: CropBox; area: number }>,
  ): { box: CropBox; area: number } | null {
    if (!entries.length) {
      return null;
    }

    return entries.reduce((best, current) =>
      current.area > best.area ? current : best,
    );
  }

  private toCropBox(
    item: LayoutItem,
    imageWidth: number,
    imageHeight: number,
    paddingRatio: number,
  ): CropBox | null {
    if (!item.bbox || item.bbox.length !== 4) {
      return null;
    }

    const numbers = item.bbox.map((value) => Math.round(Number(value)));
    if (numbers.some((value) => Number.isNaN(value))) {
      return null;
    }

    const [rawX1, rawY1, rawX2, rawY2] = numbers as [
      number,
      number,
      number,
      number,
    ];

    const paddingX = Math.round(imageWidth * paddingRatio);
    const paddingY = Math.round(imageHeight * paddingRatio);

    const leftBase = Math.min(rawX1, rawX2) - paddingX;
    const rightBase = Math.max(rawX1, rawX2) + paddingX;
    const topBase = Math.min(rawY1, rawY2) - paddingY;
    const bottomBase = Math.max(rawY1, rawY2) + paddingY;

    const left = this.clamp(leftBase, 0, imageWidth - 1);
    const right = this.clamp(rightBase, left + 1, imageWidth);
    const top = this.clamp(topBase, 0, imageHeight - 1);
    const bottom = this.clamp(bottomBase, top + 1, imageHeight);

    return {
      left,
      top,
      width: right - left,
      height: bottom - top,
      type: item.type,
      score: item.score,
      bbox: [rawX1, rawY1, rawX2, rawY2],
    };
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
  }

  private isImageType(type?: string): boolean {
    if (!type) {
      return false;
    }

    const normalized = type.toLowerCase();
    return ['figure', 'image', 'picture', 'graphic', 'photo'].some((token) =>
      normalized.includes(token),
    );
  }

  /**
   * Save cropped image to local filesystem
   *
   * @param imageBuffer - Buffer containing the cropped image
   * @param outputDir - Directory to save the image (default: cropped-images)
   * @param filename - Optional custom filename (without extension)
   * @returns Path to the saved file
   */
  async saveCroppedImage(
    imageBuffer: Buffer,
    outputDir = 'cropped-images',
    filename?: string,
  ): Promise<string> {
    try {
      // Create output directory if it doesn't exist
      const outputPath = path.join(process.cwd(), outputDir);
      if (!fs.existsSync(outputPath)) {
        fs.mkdirSync(outputPath, { recursive: true });
        this.logger.log(`Created output directory: ${outputPath}`);
      }

      // Generate filename if not provided
      const finalFilename =
        filename ||
        `cropped-${Date.now()}-${Math.random().toString(36).substring(7)}`;

      // Get image format from buffer
      const metadata = await sharp(imageBuffer).metadata();
      const extension = metadata.format || 'jpg';

      // Full file path
      const filePath = path.join(outputPath, `${finalFilename}.${extension}`);

      // Save to disk
      await sharp(imageBuffer).toFile(filePath);

      this.logger.log(`Cropped image saved: ${filePath}`);
      return filePath;
    } catch (error) {
      this.logger.error('Failed to save cropped image:', error);
      throw error;
    }
  }

  /**
   * Smart crop and save in one operation
   *
   * @param imageBuffer - Buffer containing the original image
   * @param options - Cropping and saving options
   * @returns Path to the saved cropped image
   */
  async cropAndSave(
    imageBuffer: Buffer,
    options: {
      width?: number;
      height?: number;
      minScale?: number;
      outputDir?: string;
      filename?: string;
      minAreaRatio?: number;
      paddingRatio?: number;
    } = {},
  ): Promise<{ croppedPath: string; cropInfo: any }> {
    // Perform smart crop
    const croppedBuffer = await this.smartCrop(imageBuffer, {
      width: options.width,
      height: options.height,
      minScale: options.minScale,
      minAreaRatio: options.minAreaRatio,
      paddingRatio: options.paddingRatio,
    });

    // Save cropped image
    const croppedPath = await this.saveCroppedImage(
      croppedBuffer,
      options.outputDir,
      options.filename,
    );

    // Get metadata of cropped image
    const metadata = await sharp(croppedBuffer).metadata();

    return {
      croppedPath,
      cropInfo: {
        width: metadata.width,
        height: metadata.height,
        format: metadata.format,
        size: croppedBuffer.length,
      },
    };
  }
}
