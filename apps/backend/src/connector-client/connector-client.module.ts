import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { PageScriptModule } from '../page-scripts/page-script.module';

import { ConnectorClientService } from './connector-client.service';

@Module({
  imports: [ConfigModule, PageScriptModule],
  providers: [ConnectorClientService],
  exports: [ConnectorClientService],
})
export class ConnectorClientModule {}
