import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { PrismaModule } from '../prisma/prisma.module';

import { CryptoService } from './crypto.service';
import { AgentInternalGuard } from './guards/agent-internal.guard';
import {
  AgentMtlsGuard,
  ConnectorMtlsGuard,
} from './guards/internal-client-certificate.guard';
import { ConnectorSignatureGuard } from './guards/connector-signature.guard';
import { TokenService } from './services/token.service';

@Global()
@Module({
  imports: [ConfigModule, PrismaModule],
  providers: [
    CryptoService,
    TokenService,
    AgentInternalGuard,
    AgentMtlsGuard,
    ConnectorMtlsGuard,
    ConnectorSignatureGuard,
  ],
  exports: [
    CryptoService,
    TokenService,
    AgentInternalGuard,
    AgentMtlsGuard,
    ConnectorMtlsGuard,
    ConnectorSignatureGuard,
  ],
})
export class CommonModule {}
