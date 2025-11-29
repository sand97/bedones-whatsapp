import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsEnum,
  IsObject,
  IsArray,
} from 'class-validator';

export class ToolExecutionDto {
  @ApiProperty({ description: 'Tool name' })
  name: string;

  @ApiProperty({ description: 'Tool arguments' })
  args: any;

  @ApiPropertyOptional({ description: 'Tool result' })
  result?: any;

  @ApiPropertyOptional({ description: 'Error message if tool failed' })
  error?: string;

  @ApiPropertyOptional({ description: 'Tool execution duration in ms' })
  durationMs?: number;
}

export class LogOperationDto {
  // Context
  @ApiProperty({
    description: 'WhatsApp chat ID',
    example: '237657888690@c.us',
  })
  @IsString()
  chatId: string;

  @ApiPropertyOptional({
    description: 'Agent ID',
    example: 'clx123456',
  })
  @IsOptional()
  @IsString()
  agentId?: string;

  @ApiPropertyOptional({
    description: 'User ID',
    example: 'clx789012',
  })
  @IsOptional()
  @IsString()
  userId?: string;

  // Messages
  @ApiProperty({
    description: 'User message',
    example: 'Bonjour, je voudrais commander un produit',
  })
  @IsString()
  userMessage: string;

  @ApiProperty({
    description: 'Agent response',
    example: 'Bonjour ! Je vais vous aider avec votre commande.',
  })
  @IsString()
  agentResponse: string;

  @ApiProperty({
    description: 'System prompt used',
    example: 'Vous êtes un assistant commercial...',
  })
  @IsString()
  systemPrompt: string;

  // Metrics
  @ApiPropertyOptional({
    description: 'Total tokens used',
    example: 150,
  })
  @IsOptional()
  @IsNumber()
  totalTokens?: number;

  @ApiPropertyOptional({
    description: 'Prompt tokens',
    example: 100,
  })
  @IsOptional()
  @IsNumber()
  promptTokens?: number;

  @ApiPropertyOptional({
    description: 'Completion tokens',
    example: 50,
  })
  @IsOptional()
  @IsNumber()
  completionTokens?: number;

  @ApiProperty({
    description: 'Operation duration in milliseconds',
    example: 2500,
  })
  @IsNumber()
  durationMs: number;

  @ApiPropertyOptional({
    description: 'Model name used',
    example: 'grok-beta',
  })
  @IsOptional()
  @IsString()
  modelName?: string;

  // Tools
  @ApiPropertyOptional({
    description: 'Tools used during execution',
    type: [ToolExecutionDto],
  })
  @IsOptional()
  @IsArray()
  toolsUsed?: ToolExecutionDto[];

  // Status
  @ApiProperty({
    description: 'Operation status',
    example: 'success',
    enum: ['success', 'error', 'rate_limited'],
  })
  @IsEnum(['success', 'error', 'rate_limited'])
  status: 'success' | 'error' | 'rate_limited';

  @ApiPropertyOptional({
    description: 'Error message if failed',
  })
  @IsOptional()
  @IsString()
  error?: string;

  // Metadata
  @ApiPropertyOptional({
    description: 'Additional metadata',
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @ApiProperty({
    description: 'Operation timestamp',
    example: '2024-01-15T10:30:00.000Z',
  })
  @IsISO8601()
  timestamp: string;
}
