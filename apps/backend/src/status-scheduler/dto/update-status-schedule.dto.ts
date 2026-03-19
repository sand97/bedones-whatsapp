import { StatusScheduleContentType } from '@app/generated/client';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';

export class UpdateStatusScheduleDto {
  @ApiPropertyOptional({
    description: 'Scheduled publication datetime in ISO format',
    example: '2026-03-08T10:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  scheduledFor?: string;

  @ApiPropertyOptional({
    description: 'IANA timezone used when the schedule was created',
    example: 'Europe/Paris',
  })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiPropertyOptional({
    description: 'WhatsApp status content type',
    enum: StatusScheduleContentType,
    example: StatusScheduleContentType.IMAGE,
  })
  @IsOptional()
  @IsEnum(StatusScheduleContentType)
  contentType?: StatusScheduleContentType;

  @ApiPropertyOptional({
    description: 'Text content for a text status',
    example: 'Stock limité cet après-midi.',
  })
  @IsOptional()
  @IsString()
  textContent?: string;

  @ApiPropertyOptional({
    description: 'Caption for an image or video status',
    example: 'Nouveautés disponibles',
  })
  @IsOptional()
  @IsString()
  caption?: string;

  @ApiPropertyOptional({
    description:
      'Public media URL stored in MinIO. Create/update requests may also send a data URL that will be uploaded and normalized server-side.',
    example: 'https://cdn.example.com/statuses/lookbook.jpg',
  })
  @IsOptional()
  @IsString()
  mediaUrl?: string;
}
