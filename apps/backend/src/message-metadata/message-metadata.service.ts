import { MessageMetadataType } from '@app/generated/client';
import { Injectable, Logger } from '@nestjs/common';

import { MinioService } from '../minio/minio.service';
import { PrismaService } from '../prisma/prisma.service';

interface UpsertMessageMetadataInput {
  messageId: string;
  type: MessageMetadataType;
  metadata: any;
}

interface UploadMediaInput {
  messageId: string;
  chatId: string;
  userId?: string;
  userPhoneNumber?: string;
  contactPhoneNumber?: string;
  mediaBase64: string;
  mimeType?: string;
  filename?: string;
}

@Injectable()
export class MessageMetadataService {
  private readonly logger = new Logger(MessageMetadataService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly minio: MinioService,
  ) {}

  async upsertMetadata(input: UpsertMessageMetadataInput) {
    const { messageId, type, metadata } = input;

    const record = await this.prisma.messageMetadata.upsert({
      where: { messageId_type: { messageId, type } },
      create: {
        messageId,
        type,
        metadata,
      },
      update: {
        metadata,
      },
    });

    this.logger.log(
      `📝 Metadata saved for message ${messageId} (type=${type})`,
    );

    return record;
  }

  async getByMessageIds(
    messageIds: string[],
    type?: MessageMetadataType,
  ): Promise<Record<string, any[]>> {
    if (!messageIds || messageIds.length === 0) {
      return {};
    }

    const records = await this.prisma.messageMetadata.findMany({
      where: {
        messageId: { in: messageIds },
        ...(type ? { type } : {}),
      },
    });

    return records.reduce<Record<string, any[]>>((acc, record) => {
      if (!acc[record.messageId]) {
        acc[record.messageId] = [];
      }
      acc[record.messageId].push(record);
      return acc;
    }, {});
  }

  async uploadMedia(input: UploadMediaInput) {
    const {
      mediaBase64,
      mimeType,
      userId,
      chatId,
      messageId,
      userPhoneNumber,
      contactPhoneNumber,
      filename,
    } = input;

    const buffer = this.base64ToBuffer(mediaBase64);
    if (!buffer) {
      throw new Error('Invalid mediaBase64 payload');
    }

    const extension = this.guessExtension(mimeType);
    const userFolder = this.sanitizePathSegment(
      userPhoneNumber || userId || 'unknown',
    );
    const contactFolder = this.sanitizePathSegment(
      contactPhoneNumber || chatId || 'unknown',
    );
    const baseNameRaw = filename || `${messageId || Date.now().toString()}`;
    const baseNameWithExt = baseNameRaw.endsWith(extension)
      ? baseNameRaw
      : `${baseNameRaw}${extension}`;
    const baseName = this.sanitizePathSegment(baseNameWithExt);
    const objectKey = `${userFolder}/medias/${contactFolder}/${baseName}`;

    const result = await this.minio.uploadBuffer(
      buffer,
      objectKey,
      mimeType || 'application/octet-stream',
    );

    if (!result.success || !result.url) {
      throw new Error('Media upload failed');
    }

    this.logger.log(
      `📦 Media uploaded for message ${messageId} (${mimeType || 'unknown'})`,
    );

    return {
      url: result.url,
      objectKey,
      size: buffer.length,
    };
  }

  async deleteMedia(objectKey: string): Promise<boolean> {
    if (!objectKey) {
      this.logger.warn('No objectKey provided for deleteMedia');
      return false;
    }

    const deleted = await this.minio.deleteFile(objectKey);
    if (deleted) {
      this.logger.log(`🗑️  Media deleted for objectKey ${objectKey}`);
    }

    return deleted;
  }

  private base64ToBuffer(data: string): Buffer | null {
    if (!data) {
      return null;
    }

    // Accept both raw base64 and data URI
    const cleaned = data.replace(/^data:[^;]+;base64,/, '');

    try {
      return Buffer.from(cleaned, 'base64');
    } catch (error) {
      this.logger.error('Failed to convert base64 to buffer', error);
      return null;
    }
  }

  private guessExtension(mime?: string): string {
    if (!mime) return '';
    const map: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/webp': '.webp',
      'audio/ogg': '.ogg',
      'audio/opus': '.opus',
      'audio/mpeg': '.mp3',
      'audio/wav': '.wav',
    };
    return map[mime] || '';
  }

  private sanitizePathSegment(segment: string): string {
    if (!segment) return 'unknown';
    // Replace characters that can break S3 keys or paths
    return segment
      .replace(/[@]/g, '-')
      .replace(/[\\/?%*:|"<>]/g, '-')
      .replace(/\s+/g, '-');
  }
}
