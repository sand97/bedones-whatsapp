import { BackendClientModule } from '@app/backend-client/backend-client.module';
import { Module } from '@nestjs/common';

import { EmbeddingsService } from './embeddings.service';
import { PromptGeneratorService } from './prompt-generator.service';

@Module({
  imports: [BackendClientModule],
  providers: [EmbeddingsService, PromptGeneratorService],
  exports: [EmbeddingsService, PromptGeneratorService],
})
export class CatalogSharedModule {}
