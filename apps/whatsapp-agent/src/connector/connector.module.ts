import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';

import { CatalogModule } from '../catalog/catalog.module';
import { ConnectorClientService } from './connector-client.service';

@Module({
  imports: [
    ConfigModule,
    HttpModule,
    forwardRef(() => CatalogModule),
  ],
  providers: [ConnectorClientService],
  exports: [ConnectorClientService],
})
export class ConnectorModule {}
