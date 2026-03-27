import { Request } from '@nestjs/common';
import {
  Body,
  Controller,
  Get,
  Headers,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { JwtAuthGuard } from '../guards/jwt-auth.guard';

import { ProvisionStackCapacityDto } from './dto/provision-stack-capacity.dto';
import { ReleaseStackDto } from './dto/release-stack.dto';
import { WorkflowCallbackDto } from './dto/workflow-callback.dto';
import { StackPoolService } from './stack-pool.service';

@ApiTags('stack-pool')
@Controller('stack-pool')
export class StackPoolController {
  constructor(private readonly stackPoolService: StackPoolService) {}

  @Get('summary')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Résumé de la capacité disponible',
  })
  async getSummary() {
    return this.stackPoolService.getCapacitySummary();
  }

  @Get('vps/free')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Lister les VPS avec des stacks libres',
  })
  async listFreeVps() {
    return this.stackPoolService.listVpsWithFreeStacks();
  }

  @Post('provision')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Demander le provisionnement de nouveaux VPS/stacks',
  })
  @ApiResponse({
    status: 201,
    description: 'Workflow(s) GitHub dispatché(s)',
  })
  async provision(
    @Body() dto: ProvisionStackCapacityDto,
    @Request() req: { user: { id: string } },
  ) {
    return this.stackPoolService.provisionCapacity(dto, req.user.id);
  }

  @Post('reconcile')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Vérifier et rétablir le stock minimal de stacks libres',
  })
  async reconcile() {
    await this.stackPoolService.reconcileCapacity({
      reason: 'manual-reconcile',
    });

    return this.stackPoolService.getCapacitySummary();
  }

  @Post('release')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Libérer une stack réservée ou déclencher sa release',
  })
  async release(@Body() dto: ReleaseStackDto) {
    return this.stackPoolService.releaseCapacity(dto);
  }

  @Post('workflows/callback')
  @ApiOperation({
    summary: 'Callback interne appelé par les workflows GitHub',
  })
  async workflowCallback(
    @Body() dto: WorkflowCallbackDto,
    @Headers('x-infra-callback-secret') callbackSecret?: string,
  ) {
    return this.stackPoolService.handleWorkflowCallback({
      ...dto,
      callbackSecret: callbackSecret || dto.callbackSecret,
    });
  }
}
