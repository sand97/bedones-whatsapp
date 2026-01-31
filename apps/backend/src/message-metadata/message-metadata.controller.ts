import { MessageMetadataType } from '@app/generated/client';
import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';

import { MessageMetadataService } from './message-metadata.service';

class UpsertMessageMetadataDto {
  @IsString()
  @IsNotEmpty()
  messageId!: string;

  @IsEnum(MessageMetadataType)
  type!: MessageMetadataType;

  @IsObject()
  metadata: any;
}

class MessageMetadataListDto {
  @IsArray()
  messageIds!: string[];

  @IsOptional()
  @IsEnum(MessageMetadataType)
  type?: MessageMetadataType;
}

class UploadMediaDto {
  @IsString()
  @IsNotEmpty()
  messageId!: string;

  @IsString()
  @IsOptional()
  chatId: string;

  @IsString()
  @IsOptional()
  userId?: string;

  @IsString()
  @IsOptional()
  userPhoneNumber?: string;

  @IsString()
  @IsOptional()
  contactPhoneNumber?: string;

  @IsString()
  @IsNotEmpty()
  mediaBase64!: string;

  @IsString()
  @IsOptional()
  mimeType?: string;

  @IsString()
  @IsOptional()
  filename?: string;
}

class DeleteMediaDto {
  @IsString()
  @IsNotEmpty()
  objectKey!: string;
}

@ApiTags('MessageMetadata')
@Controller('message-metadata')
export class MessageMetadataController {
  constructor(private readonly messageMetadata: MessageMetadataService) {}

  @Post('upsert')
  @ApiOperation({ summary: 'Upsert metadata for a message' })
  async upsert(@Body() dto: UpsertMessageMetadataDto) {
    const record = await this.messageMetadata.upsertMetadata(dto);
    return { success: true, record };
  }

  @Post('list')
  @ApiOperation({ summary: 'Get metadata for a list of messages' })
  async list(@Body() dto: MessageMetadataListDto) {
    const result = await this.messageMetadata.getByMessageIds(
      dto.messageIds,
      dto.type,
    );
    return { success: true, data: result };
  }

  @Post('upload-media')
  @ApiOperation({ summary: 'Upload media buffer and return URL' })
  async uploadMedia(@Body() dto: UploadMediaDto) {
    const payload = await this.messageMetadata.uploadMedia(dto);
    return { success: true, ...payload };
  }

  @Post('delete-media')
  @ApiOperation({ summary: 'Delete media from storage' })
  async deleteMedia(@Body() dto: DeleteMediaDto) {
    const result = await this.messageMetadata.deleteMedia(dto.objectKey);
    return { success: result };
  }
}
