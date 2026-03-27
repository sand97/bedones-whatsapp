import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class WorkflowCallbackServerDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsOptional()
  @IsString()
  providerServerId?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  serverType?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  networkId?: string;

  @IsOptional()
  @IsString()
  publicIpv4?: string;

  @IsOptional()
  @IsString()
  publicIpv6?: string;

  @IsOptional()
  @IsString()
  privateIpv4?: string;

  @IsOptional()
  @IsString()
  privateSubnet?: string;
}

export class WorkflowCallbackStackDto {
  @IsInt()
  @Min(1)
  stackSlot: number;

  @IsOptional()
  @IsString()
  stackLabel?: string;

  @IsInt()
  @Min(1)
  agentPort: number;

  @IsInt()
  @Min(1)
  connectorPort: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  redisPort?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  qdrantHttpPort?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  qdrantGrpcPort?: number;

  @IsOptional()
  @IsString()
  privateIpv4?: string;

  @IsOptional()
  @IsString()
  publicBaseUrl?: string;

  @IsOptional()
  autostart?: boolean;
}

export class WorkflowCallbackDto {
  @IsOptional()
  @IsString()
  workflowId?: string;

  @IsOptional()
  @IsString()
  githubRunId?: string;

  @IsOptional()
  @IsString()
  githubRunUrl?: string;

  @IsIn(['running', 'success', 'failed', 'cancelled'])
  status: 'running' | 'success' | 'failed' | 'cancelled';

  @IsOptional()
  @IsString()
  stage?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  totalJobs?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  completedJobs?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  progressPercent?: number;

  @IsOptional()
  @IsString()
  errorMessage?: string;

  @IsOptional()
  @IsString()
  callbackSecret?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => WorkflowCallbackServerDto)
  server?: WorkflowCallbackServerDto;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkflowCallbackStackDto)
  stacks?: WorkflowCallbackStackDto[];

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
