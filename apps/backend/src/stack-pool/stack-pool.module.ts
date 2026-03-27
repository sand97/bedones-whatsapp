import { CommonModule } from '@app/common/common.module';
import { ConnectorClientModule } from '@app/connector-client';
import { PrismaModule } from '@app/prisma/prisma.module';
import { Module, forwardRef } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';

import { StackPoolController } from './stack-pool.controller';
import { StackPoolService } from './stack-pool.service';

@Module({
  imports: [
    PrismaModule,
    CommonModule,
    ConnectorClientModule,
    forwardRef(() => AuthModule),
  ],
  controllers: [StackPoolController],
  providers: [StackPoolService],
  exports: [StackPoolService],
})
export class StackPoolModule {}
