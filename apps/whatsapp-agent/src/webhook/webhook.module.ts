import { Module } from '@nestjs/common';

import { BackendClientModule } from '../backend-client/backend-client.module';
import { CatalogModule } from '../catalog/catalog.module';
import { ImageProcessingModule } from '../image-processing/image-processing.module';
import { LangChainModule } from '../langchain/langchain.module';
import { MediaModule } from '../media/media.module';

import { WebhookController } from './webhook.controller';

@Module({
  imports: [
    LangChainModule,
    BackendClientModule,
    CatalogModule,
    MediaModule,
    ImageProcessingModule,
  ],
  controllers: [WebhookController],
})
export class WebhookModule {}
