import { CommonModule } from '@app/common/common.module';
import { ConnectorClientModule } from '@app/connector-client';
import { PrismaModule } from '@app/prisma/prisma.module';
import { Module, forwardRef } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';

import {
  InfraStackPoolController,
  StackPoolWorkflowsController,
} from './stack-pool.controller';
import { HetznerCloudService } from './hetzner-cloud.service';
import { StackPoolService } from './stack-pool.service';

@Module({
  imports: [
    PrismaModule,
    CommonModule,
    ConnectorClientModule,
    forwardRef(() => AuthModule),
  ],
  controllers: [InfraStackPoolController, StackPoolWorkflowsController],
  providers: [StackPoolService, HetznerCloudService],
  exports: [StackPoolService],
})
export class StackPoolModule {}
