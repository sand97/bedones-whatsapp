import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString, IsUrl } from 'class-validator';

export class SetWebhooksDto {
  @ApiProperty({
    description: 'Liste des URLs de webhooks à configurer',
    example: ['http://whatsapp-agent:3002/webhook/message'],
    isArray: true,
  })
  @IsArray()
  @IsString({ each: true })
  @IsUrl({}, { each: true })
  urls: string[];
}
