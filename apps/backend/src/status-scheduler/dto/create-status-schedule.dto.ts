import { StatusScheduleContentType } from '@app/generated/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';

export class CreateStatusScheduleDto {
  @ApiProperty({
    description: 'Scheduled publication datetime in ISO format',
    example: '2026-03-08T08:30:00.000Z',
  })
  @IsDateString()
  scheduledFor: string;

  @ApiProperty({
    description: 'IANA timezone used when the schedule was created',
    example: 'Europe/Paris',
  })
  @IsString()
  timezone: string;

  @ApiProperty({
    description: 'WhatsApp status content type',
    enum: StatusScheduleContentType,
    example: StatusScheduleContentType.TEXT,
  })
  @IsEnum(StatusScheduleContentType)
  contentType: StatusScheduleContentType;

  @ApiPropertyOptional({
    description: 'Text content for a text status',
    example: 'Nouvelle promo ce matin au magasin.',
  })
  @IsOptional()
  @IsString()
  textContent?: string;

  @ApiPropertyOptional({
    description: 'Caption for an image or video status',
    example: 'Arrivage du jour',
  })
  @IsOptional()
  @IsString()
  caption?: string;

  @ApiPropertyOptional({
    description: 'Public media URL or data URL for image/video statuses',
    example: 'https://cdn.example.com/statuses/collection-ete.mp4',
  })
  @IsOptional()
  @IsString()
  mediaUrl?: string;
}
