import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString } from 'class-validator';

export class SearchByKeywordsDto {
  @ApiProperty({
    description: 'List of keywords to search for in products',
    example: ['adidas', '701237128001', 'maillot'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  keywords: string[];

  @ApiProperty({
    description: 'User ID to filter products',
    example: 'clx123456',
    required: true,
  })
  @IsString()
  user_id: string;

  @ApiProperty({
    description: 'Optional retailer ID for exact match priority',
    example: '701237128001',
    required: false,
  })
  @IsOptional()
  @IsString()
  retailer_id?: string;
}
