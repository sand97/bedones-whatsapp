import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { ConnectorClientService } from './connector-client.service';

@Module({
  imports: [ConfigModule, HttpModule],
  providers: [ConnectorClientService],
  exports: [ConnectorClientService],
})
export class ConnectorModule {}
